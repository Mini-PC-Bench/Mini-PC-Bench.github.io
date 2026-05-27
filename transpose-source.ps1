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

function Get-RowValues {
  param(
    [string]$FilePath,
    [string[]]$PreferredRows
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return @{}
  }

  $lines = Get-Content -LiteralPath $FilePath | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  if ($lines.Count -lt 2) {
    return @{}
  }

  $headers = $lines[0].Split(',')
  $rows = @{}

  foreach ($line in $lines[1..($lines.Count - 1)]) {
    $parts = $line.Split(',')
    if ($parts.Count -eq 0) {
      continue
    }

    $label = $parts[0].Trim()
    if ([string]::IsNullOrWhiteSpace($label)) {
      continue
    }

    $rows[$label] = $parts
  }

  $selected = $null
  foreach ($candidate in $PreferredRows) {
    if ($rows.ContainsKey($candidate)) {
      $selected = $rows[$candidate]
      break
    }
  }

  if (-not $selected) {
    $selected = $rows.Values | Select-Object -First 1
  }

  if (-not $selected) {
    return @{}
  }

  $result = @{}
  $maxIndex = [math]::Min($headers.Count - 1, $selected.Count - 1)
  for ($i = 1; $i -le $maxIndex; $i++) {
    $name = $headers[$i].Trim()
    $value = Convert-Number -Raw $selected[$i]

    if ([string]::IsNullOrWhiteSpace($name) -or $null -eq $value) {
      continue
    }

    $result[$name] = $value
  }

  return $result
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "source directory not found: $SourceDir"
}

$specs = @(
  @{ File = 'Cinebench R23 Single Core.csv'; Key = 'cb23s'; Rows = @('Default') },
  @{ File = 'Cinebench R23 Multicore.csv'; Key = 'cb23m'; Rows = @('Default') },
  @{ File = 'Geekbench 6 Single Core.csv'; Key = 'gb6s'; Rows = @('Default') },
  @{ File = 'Geekbench 6 Multicore.csv'; Key = 'gb6m'; Rows = @('Default') },
  @{ File = 'Geekbench AI CPU.csv'; Key = 'gbai_cpu'; Rows = @('Quantised', 'Single', 'Default') },
  @{ File = 'Geekbench AI GPU.csv'; Key = 'gbai_gpu'; Rows = @('Half', 'Single', 'Default') },
  @{ File = '3DMark Fire Strike.csv'; Key = 'firestrike'; Rows = @('Default') },
  @{ File = '3DMark Time Spy.csv'; Key = 'timespy'; Rows = @('Default') },
  @{ File = '3DMark Steel Nomad.csv'; Key = 'steelnomad'; Rows = @('Default') },
  @{ File = '3DMark Storage Benchmark.csv'; Key = 'storage'; Rows = @('Default') },
  @{ File = 'Coding.csv'; Key = 'coding'; Rows = @('Default') },
  @{ File = 'Photoshop.csv'; Key = 'photoshop'; Rows = @('Default') },
  @{ File = 'Premiere.csv'; Key = 'premiere'; Rows = @('Default') },
  @{ File = 'H264 Encoding.csv'; Key = 'h264'; Rows = @('Default') },
  @{ File = 'AV1 Encoding.csv'; Key = 'av1'; Rows = @('Default') },
  @{ File = 'AV1 Encoding (Hardware).csv'; Key = 'av1_hw'; Rows = @('Default') },
  @{ File = 'Maximum Power Draw.csv'; Key = 'watts'; Rows = @('Default') },
  @{ File = 'Idle Power Draw.csv'; Key = 'power_idle_watts'; Rows = @('Default') },
  @{ File = 'Maximum CPU Temperature.csv'; Key = 'cpu_temp'; Rows = @('Default') },
  @{ File = 'SSD Temperatures.csv'; Key = 'ssd_temp'; Rows = @('Drive', 'Default', 'Controller') },
  @{ File = 'Volume.csv'; Key = 'volume'; Rows = @('Default') },
  @{ File = 'Wireless Bluetooth Audio.csv'; Key = 'wireless_audio'; Rows = @('Metres', 'Default') }
)

$metricColumns = @($specs | ForEach-Object { $_.Key }) + @('noise_idle', 'noise_load', 'noise_perf')

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
  $metricValues = Get-RowValues -FilePath $path -PreferredRows $spec.Rows

  foreach ($rawName in $metricValues.Keys) {
    $row = Ensure-DeviceRow -DeviceName $rawName
    $row[$spec.Key] = $metricValues[$rawName]
  }
}

$fanNoisePath = Join-Path $SourceDir 'Fan Noise.csv'
$noiseIdle = Get-RowValues -FilePath $fanNoisePath -PreferredRows @('Idle')
$noiseLoad = Get-RowValues -FilePath $fanNoisePath -PreferredRows @('Load Default', 'Default')
$noisePerf = Get-RowValues -FilePath $fanNoisePath -PreferredRows @('Load Performance', 'Performance')

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
