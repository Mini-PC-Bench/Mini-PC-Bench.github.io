param(
  [string]$SourceDir = "./source",
  [string]$DevicesPath = "./devices.json",
  [string]$OutputCsv = "./source-transposed.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Convert-Number {
  param([string]$Raw)

  if ([string]::IsNullOrWhiteSpace($Raw)) {
    return $null
  }

  $clean = ($Raw -replace '[^0-9.\-]', '').Trim()
  if ([string]::IsNullOrWhiteSpace($clean)) {
    return $null
  }

  $number = 0.0
  $ok = [double]::TryParse(
    $clean,
    [System.Globalization.NumberStyles]::Float,
    [System.Globalization.CultureInfo]::InvariantCulture,
    [ref]$number
  )

  if (-not $ok) {
    return $null
  }

  if ($number -eq [math]::Truncate($number)) {
    return [int]$number
  }

  return [math]::Round($number, 4)
}

function Get-RowValueMaps {
  param([string]$FilePath)

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return @{}
  }

  $lines = @(Get-Content -LiteralPath $FilePath | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if ($lines.Count -lt 2) {
    return @{}
  }

  $headers = $lines[0].Split(',')
  $results = @{}
  foreach ($line in $lines[1..($lines.Count - 1)]) {
    $parts = $line.Split(',')
    if ($parts.Count -eq 0) {
      continue
    }

    $label = $parts[0].Trim()
    if ([string]::IsNullOrWhiteSpace($label)) {
      continue
    }

    $values = @{}
    $maxIndex = [math]::Min($headers.Count - 1, $parts.Count - 1)
    for ($i = 1; $i -le $maxIndex; $i++) {
      $name = $headers[$i].Trim()
      $value = Convert-Number -Raw $parts[$i]
      if ([string]::IsNullOrWhiteSpace($name) -or $null -eq $value) {
        continue
      }

      $values[$name] = $value
    }

    $results[$label] = $values
  }

  return $results
}

function Select-RowValueMap {
  param(
    [hashtable]$RowMaps,
    [string[]]$PreferredRows
  )

  foreach ($candidate in $PreferredRows) {
    if ($RowMaps.ContainsKey($candidate)) {
      return $RowMaps[$candidate]
    }
  }

  return @{}
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "source directory not found: $SourceDir"
}

$defaultRowLabel = 'Default'
$performanceRowLabel = 'Performance'

$specs = @(
  @{ File = 'Cinebench R23 Single Core.csv'; Key = 'cb23s'; PerfKey = 'cb23s_perf' },
  @{ File = 'Cinebench R23 Multicore.csv'; Key = 'cb23m'; PerfKey = 'cb23m_perf' },
  @{ File = 'Geekbench 6 Single Core.csv'; Key = 'gb6s'; PerfKey = 'gb6s_perf' },
  @{ File = 'Geekbench 6 Multicore.csv'; Key = 'gb6m'; PerfKey = 'gb6m_perf' },
  @{ File = 'Geekbench 7 Single Core.csv'; Key = 'gb7s'; PerfKey = 'gb7s_perf' },
  @{ File = 'Geekbench 7 Multicore.csv'; Key = 'gb7m'; PerfKey = 'gb7m_perf' },
  @{ File = 'AI Token Test.csv'; Key = 'ai_tokens' },
  @{ File = 'Geekbench AI CPU.csv'; Variants = @{ Half = 'gbai_cpu_half'; Single = 'gbai_cpu_single'; Quantised = 'gbai_cpu_quantised' } },
  @{ File = 'Geekbench AI GPU.csv'; Variants = @{ Half = 'gbai_gpu_half'; Single = 'gbai_gpu_single'; Quantised = 'gbai_gpu_quantised' } },
  @{ File = '3DMark Fire Strike.csv'; Key = 'firestrike'; PerfKey = 'firestrike_perf' },
  @{ File = '3DMark Time Spy.csv'; Key = 'timespy'; PerfKey = 'timespy_perf' },
  @{ File = '3DMark Steel Nomad.csv'; Key = 'steelnomad'; PerfKey = 'steelnomad_perf' },
  @{ File = '3DMark Storage Benchmark.csv'; Key = 'storage' },
  @{ File = 'Coding.csv'; Key = 'coding'; PerfKey = 'coding_perf' },
  @{ File = 'Photoshop.csv'; Key = 'photoshop'; PerfKey = 'photoshop_perf' },
  @{ File = 'Premiere.csv'; Key = 'premiere'; PerfKey = 'premiere_perf' },
  @{ File = 'H264 Encoding.csv'; Key = 'h264'; PerfKey = 'h264_perf' },
  @{ File = 'AV1 Encoding.csv'; Key = 'av1'; PerfKey = 'av1_perf' },
  @{ File = 'AV1 Encoding (Hardware).csv'; Key = 'av1_hw'; PerfKey = 'av1_hw_perf' },
  @{ File = 'Maximum Power Draw.csv'; Key = 'watts'; PerfKey = 'watts_perf' },
  @{ File = 'Idle Power Draw.csv'; Key = 'power_idle_watts' },
  @{ File = 'Maximum CPU Temperature.csv'; Key = 'cpu_temp'; PerfKey = 'cpu_temp_perf' },
  @{ File = 'SSD Temperatures.csv'; Key = 'ssd_temp'; DefaultRows = @('Drive', 'Default', 'Controller') },
  @{ File = 'Volume.csv'; Key = 'volume' },
  @{ File = 'Wireless Bluetooth Audio.csv'; Key = 'wireless_audio'; DefaultRows = @('Metres', 'Default') }
)

$metricColumns = @($specs | ForEach-Object {
    if ($_.ContainsKey('Variants')) {
      $_.Variants.Values
    } elseif ($_.ContainsKey('PerfKey')) {
      @($_.Key, $_.PerfKey)
    } else {
      $_.Key
    }
  }) + @('noise_idle', 'noise_load', 'noise_perf')

$rowsByDevice = @{}

function Ensure-DeviceRow {
  param([string]$DeviceName)

  if (-not $rowsByDevice.ContainsKey($DeviceName)) {
    $obj = [ordered]@{ Device = $DeviceName }
    foreach ($metric in $metricColumns) {
      $obj[$metric] = $null
    }
    $rowsByDevice[$DeviceName] = $obj
  }

  return $rowsByDevice[$DeviceName]
}

foreach ($spec in $specs) {
  $path = Join-Path $SourceDir $spec.File
  $rowMaps = Get-RowValueMaps -FilePath $path
  $imports = @()

  if ($spec.ContainsKey('Variants')) {
    foreach ($variant in $spec.Variants.GetEnumerator()) {
      if ($rowMaps.ContainsKey($variant.Key)) {
        $imports += @{ Key = $variant.Value; Values = $rowMaps[$variant.Key] }
      }
    }
  } else {
    $defaultRows = if ($spec.ContainsKey('DefaultRows')) { $spec.DefaultRows } else { @($defaultRowLabel) }
    $imports += @{ Key = $spec.Key; Values = (Select-RowValueMap -RowMaps $rowMaps -PreferredRows $defaultRows) }
    if ($spec.ContainsKey('PerfKey')) {
      $performanceValues = Select-RowValueMap -RowMaps $rowMaps -PreferredRows @($performanceRowLabel)
      if ($performanceValues.Count -gt 0) {
        $imports += @{ Key = $spec.PerfKey; Values = $performanceValues }
      }
    }
  }

  foreach ($import in $imports) {
    foreach ($rawName in $import.Values.Keys) {
      $row = Ensure-DeviceRow -DeviceName $rawName
      $row[$import.Key] = $import.Values[$rawName]
    }
  }
}

$fanNoisePath = Join-Path $SourceDir 'Fan Noise.csv'
$fanNoiseRows = Get-RowValueMaps -FilePath $fanNoisePath
$noiseIdle = Select-RowValueMap -RowMaps $fanNoiseRows -PreferredRows @('Idle')
$noiseLoad = Select-RowValueMap -RowMaps $fanNoiseRows -PreferredRows @('Load Default', 'Default')
$noisePerf = Select-RowValueMap -RowMaps $fanNoiseRows -PreferredRows @('Load Performance', 'Performance')

foreach ($rawName in $noiseIdle.Keys) {
  $row = Ensure-DeviceRow -DeviceName $rawName
  $row['noise_idle'] = $noiseIdle[$rawName]
}

foreach ($rawName in $noiseLoad.Keys) {
  $row = Ensure-DeviceRow -DeviceName $rawName
  $row['noise_load'] = $noiseLoad[$rawName]
}

foreach ($rawName in $noisePerf.Keys) {
  $row = Ensure-DeviceRow -DeviceName $rawName
  $row['noise_perf'] = $noisePerf[$rawName]
}

$outputRows = @(
  $rowsByDevice.Keys |
    Sort-Object |
    ForEach-Object { [pscustomobject]$rowsByDevice[$_] }
)

$outputRows | Export-Csv -LiteralPath $OutputCsv -NoTypeInformation -Encoding UTF8
Write-Host "Wrote $($outputRows.Count) devices to $OutputCsv"
