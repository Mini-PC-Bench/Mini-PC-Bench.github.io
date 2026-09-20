param(
  [string]$SourceDir = "./source",
  [string]$DevicesPath = "./devices.json",
  [string]$MappingPath = "./source-device-map.json",
  [bool]$AutoAddDevices = $false
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

function Get-DeviceSlug {
  param([string]$Name)

  $slug = $Name.ToLowerInvariant()
  $slug = [regex]::Replace($slug, '[^a-z0-9]+', '-')
  return $slug.Trim('-')
}

# Source labels use a consistent suffix convention for the tested configuration,
# for example "GEEKOM IT15 Ultra 9 285H 2TB Gen4", "DreamQuest Max 7430U 512GB SATA",
# or "GEEKOM A7 MAX 7940HS (DC)".
# The suffix describes the drive/run configuration, not a separate device.
function Get-SourceLabelBase {
  param([string]$RawName)

  $base = $RawName.Trim()
  $previous = $null

  while ($base -ne $previous) {
    $previous = $base
    $base = [regex]::Replace($base, '\s*\((?:DC|Gen\s*\d+)\)$', '', 'IgnoreCase')
    $base = [regex]::Replace($base, '\s+\d+(?:GB|TB)(?:\s+[A-Za-z0-9][A-Za-z0-9._-]*)+$', '', 'IgnoreCase')
    $base = [regex]::Replace($base, '\s+\d+(?:GB|TB)$', '', 'IgnoreCase')
    $base = [regex]::Replace($base, '\s+Gen\s*\d+$', '', 'IgnoreCase')
    $base = $base.Trim()
  }

  return $base
}

function Resolve-DeviceName {
  param(
    [string]$RawName,
    [object[]]$KnownDevices,
    [hashtable]$CanonicalLookup,
    [hashtable]$Aliases,
    [hashtable]$SlugLookup
  )

  if ($Aliases.ContainsKey($RawName)) {
    $targetId = [string]$Aliases[$RawName]
    $target = $KnownDevices | Where-Object { [string]$_.id -eq $targetId } | Select-Object -First 1
    if ($null -eq $target) {
      throw "Mapping for '$RawName' points to unknown device id '$targetId'"
    }
    return @{ name = $target.name; method = 'mapping' }
  }

  $exactName = $RawName.Trim()
  if ([string]::IsNullOrWhiteSpace($exactName)) {
    return $null
  }

  if ($CanonicalLookup.ContainsKey($exactName)) {
    return @{ name = $CanonicalLookup[$exactName]; method = 'exact' }
  }

  if ($null -ne $SlugLookup) {
    $baseName = Get-SourceLabelBase -RawName $exactName
    if (-not [string]::IsNullOrWhiteSpace($baseName)) {
      $slug = Get-DeviceSlug -Name $baseName
      if ($SlugLookup.ContainsKey($slug)) {
        $canonical = [string]$SlugLookup[$slug]
        # Ambiguous slugs are recorded as empty and must be mapped explicitly.
        if (-not [string]::IsNullOrWhiteSpace($canonical)) {
          return @{ name = $canonical; method = 'derived'; base = $baseName }
        }
      }
    }
  }

  return $null
}

function Register-DeviceSlug {
  param(
    [hashtable]$SlugLookup,
    [string]$Name
  )

  $slug = Get-DeviceSlug -Name $Name
  if ([string]::IsNullOrWhiteSpace($slug)) {
    return
  }

  if ($SlugLookup.ContainsKey($slug) -and [string]$SlugLookup[$slug] -ne $Name) {
    $SlugLookup[$slug] = ''
    return
  }

  $SlugLookup[$slug] = $Name
}

function New-UniqueDeviceId {
  param(
    [string]$Name,
    [System.Collections.Generic.HashSet[string]]$UsedIds
  )

  $baseId = Get-DeviceSlug -Name $Name
  if ([string]::IsNullOrWhiteSpace($baseId)) {
    throw "Unable to generate id for device '$Name'"
  }

  $candidate = $baseId
  $suffix = 2
  while ($UsedIds.Contains($candidate)) {
    $candidate = "$baseId-$suffix"
    $suffix++
  }

  [void]$UsedIds.Add($candidate)
  return $candidate
}

function New-DeviceTemplate {
  param([string]$DeviceName)

  return [pscustomobject]@{
    id = $null
    name = $DeviceName
    photo = $null
    noise = [pscustomobject]@{
      idle = $null
      load_default = $null
      load_performance = $null
    }
    cb23s = $null
    cb23m = $null
    gb6s = $null
    gb6m = $null
    gb7s = $null
    gb7m = $null
    ai_tokens = $null
    gbai_cpu_half = $null
    gbai_cpu_single = $null
    gbai_cpu_quantised = $null
    gbai_gpu_half = $null
    gbai_gpu_single = $null
    gbai_gpu_quantised = $null
    firestrike = $null
    timespy = $null
    steelnomad = $null
    storage = $null
    coding = $null
    photoshop = $null
    premiere = $null
    h264 = $null
    av1 = $null
    av1_hw = $null
    watts = $null
    cb23s_perf = $null
    cb23m_perf = $null
    gb6s_perf = $null
    gb6m_perf = $null
    gb7s_perf = $null
    gb7m_perf = $null
    firestrike_perf = $null
    timespy_perf = $null
    steelnomad_perf = $null
    coding_perf = $null
    photoshop_perf = $null
    premiere_perf = $null
    h264_perf = $null
    av1_perf = $null
    av1_hw_perf = $null
    watts_perf = $null
    cpu_temp_perf = $null
    power_idle_watts = $null
    cpu_temp = $null
    ssd_temp = $null
    volume = $null
    wireless_audio = $null
  }
}

function Ensure-UniqueDeviceIds {
  param([object[]]$Devices)

  $usedIds = [System.Collections.Generic.HashSet[string]]::new()

  foreach ($device in $Devices) {
    $baseId = ''
    if ($device.PSObject.Properties.Name -contains 'id' -and -not [string]::IsNullOrWhiteSpace($device.id)) {
      $baseId = [string]$device.id
    } else {
      $baseId = New-UniqueDeviceId -Name $device.name -UsedIds $usedIds
    }

    if ([string]::IsNullOrWhiteSpace($baseId)) {
      throw "Unable to generate id for device '$($device.name)'"
    }

    $candidateId = $baseId
    if ($usedIds.Contains($candidateId)) {
      $candidateId = New-UniqueDeviceId -UsedIds $usedIds
    }

    $device | Add-Member -NotePropertyName id -NotePropertyValue $candidateId -Force
    [void]$usedIds.Add($candidateId)
  }
}

function Migrate-LegacyAiValues {
  param([object[]]$Devices)

  foreach ($device in $Devices) {
    $legacyCpu = $device.PSObject.Properties['gbai_cpu']
    $legacyGpu = $device.PSObject.Properties['gbai_gpu']
    $cpuQuantised = $device.PSObject.Properties['gbai_cpu_quantised']
    $gpuHalf = $device.PSObject.Properties['gbai_gpu_half']

    if ($null -ne $legacyCpu -and ($null -eq $cpuQuantised -or $null -eq $cpuQuantised.Value)) {
      $device | Add-Member -NotePropertyName gbai_cpu_quantised -NotePropertyValue $legacyCpu.Value
    }
    if ($null -ne $legacyGpu -and ($null -eq $gpuHalf -or $null -eq $gpuHalf.Value)) {
      $device | Add-Member -NotePropertyName gbai_gpu_half -NotePropertyValue $legacyGpu.Value
    }

    if ($null -ne $legacyCpu) {
      $device.PSObject.Properties.Remove('gbai_cpu')
    }
    if ($null -ne $legacyGpu) {
      $device.PSObject.Properties.Remove('gbai_gpu')
    }
  }
}

function ConvertTo-OrderedDevice {
  param([object]$Device)

  $noiseOrder = @('idle', 'load_default', 'load_performance')

  function ConvertTo-OrderedNoise {
    param([object]$Noise)

    if ($null -eq $Noise) {
      return $null
    }

    $orderedNoise = [ordered]@{}

    foreach ($key in $noiseOrder) {
      $prop = $Noise.PSObject.Properties[$key]
      $orderedNoise[$key] = if ($null -ne $prop) { $prop.Value } else { $null }
    }

    foreach ($prop in $Noise.PSObject.Properties) {
      if ($orderedNoise.Contains($prop.Name)) {
        continue
      }

      $orderedNoise[$prop.Name] = $prop.Value
    }

    return [pscustomobject]$orderedNoise
  }

  $ordered = [ordered]@{}
  $templatePropertyNames = (New-DeviceTemplate -DeviceName '').PSObject.Properties.Name

  foreach ($propertyName in $templatePropertyNames) {
    if ($propertyName -eq 'noise') {
      $noiseProp = $Device.PSObject.Properties['noise']
      $ordered['noise'] = if ($null -ne $noiseProp) {
        ConvertTo-OrderedNoise -Noise $noiseProp.Value
      } else {
        $null
      }
      continue
    }

    $deviceProperty = $Device.PSObject.Properties[$propertyName]
    $ordered[$propertyName] = if ($null -ne $deviceProperty) { $deviceProperty.Value } else { $null }
  }

  foreach ($property in $Device.PSObject.Properties) {
    if ($ordered.Contains($property.Name)) {
      continue
    }

    if ($property.Name -eq 'noise') {
      $ordered[$property.Name] = ConvertTo-OrderedNoise -Noise $property.Value
    } else {
      $ordered[$property.Name] = $property.Value
    }
  }

  return [pscustomobject]$ordered
}

function Get-SourceLabels {
  param([string]$FilePath)

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return @()
  }

  $firstLine = Get-Content -LiteralPath $FilePath -TotalCount 1
  if ([string]::IsNullOrWhiteSpace($firstLine)) {
    return @()
  }

  $headers = $firstLine.Split(',') | Select-Object -Skip 1
  return @($headers | ForEach-Object { $_.Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Set-DeviceMetric {
  param(
    [object]$Device,
    [string]$Key,
    [object]$Value
  )

  switch ($Key) {
    'noise_load' {
      $noiseProp = $Device.PSObject.Properties['noise']
      if ($null -eq $noiseProp -or $null -eq $noiseProp.Value) {
        $Device | Add-Member -NotePropertyName noise -NotePropertyValue ([pscustomobject]@{}) -Force
      }
      $Device.noise | Add-Member -NotePropertyName load_default -NotePropertyValue $Value -Force
      return
    }
    'noise_perf' {
      $noiseProp = $Device.PSObject.Properties['noise']
      if ($null -eq $noiseProp -or $null -eq $noiseProp.Value) {
        $Device | Add-Member -NotePropertyName noise -NotePropertyValue ([pscustomobject]@{}) -Force
      }
      $Device.noise | Add-Member -NotePropertyName load_performance -NotePropertyValue $Value -Force
      return
    }
    'noise_idle' {
      $noiseProp = $Device.PSObject.Properties['noise']
      if ($null -eq $noiseProp -or $null -eq $noiseProp.Value) {
        $Device | Add-Member -NotePropertyName noise -NotePropertyValue ([pscustomobject]@{}) -Force
      }
      $Device.noise | Add-Member -NotePropertyName idle -NotePropertyValue $Value -Force
      return
    }
    'h264' {
      $Device | Add-Member -NotePropertyName h264 -NotePropertyValue $Value -Force
      return
    }
    default {
      $Device | Add-Member -NotePropertyName $Key -NotePropertyValue $Value -Force
      return
    }
  }
}

if (-not (Test-Path -LiteralPath $DevicesPath)) {
  throw "devices.json not found: $DevicesPath"
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "source directory not found: $SourceDir"
}

$devices = Get-Content -LiteralPath $DevicesPath -Raw | ConvertFrom-Json

if (-not (Test-Path -LiteralPath $MappingPath)) {
  throw "Source mapping file not found: $MappingPath"
}

$mappingObject = Get-Content -LiteralPath $MappingPath -Raw | ConvertFrom-Json
$aliases = @{}
foreach ($mappingProperty in $mappingObject.PSObject.Properties) {
  $aliases[$mappingProperty.Name] = [string]$mappingProperty.Value
}

$canonicalLookup = @{}
$slugLookup = @{}
foreach ($device in $devices) {
  $canonicalLookup[$device.name] = $device.name
  Register-DeviceSlug -SlugLookup $slugLookup -Name $device.name
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
  @{ File = 'Geekbench AI GPU.csv'; Kind = 'gpu'; Variants = @{ Half = 'gbai_gpu_half'; Single = 'gbai_gpu_single'; Quantised = 'gbai_gpu_quantised' } },
  @{ File = '3DMark Fire Strike.csv'; Key = 'firestrike'; PerfKey = 'firestrike_perf'; Kind = 'gpu' },
  @{ File = '3DMark Time Spy.csv'; Key = 'timespy'; PerfKey = 'timespy_perf'; Kind = 'gpu' },
  @{ File = '3DMark Steel Nomad.csv'; Key = 'steelnomad'; PerfKey = 'steelnomad_perf'; Kind = 'gpu' },
  @{ File = '3DMark Storage Benchmark.csv'; Key = 'storage'; Kind = 'storage' },
  @{ File = 'Coding.csv'; Key = 'coding'; PerfKey = 'coding_perf'; LowerBetter = $true },
  @{ File = 'Photoshop.csv'; Key = 'photoshop'; PerfKey = 'photoshop_perf' },
  @{ File = 'Premiere.csv'; Key = 'premiere'; PerfKey = 'premiere_perf' },
  @{ File = 'H264 Encoding.csv'; Key = 'h264'; PerfKey = 'h264_perf'; LowerBetter = $true },
  @{ File = 'AV1 Encoding.csv'; Key = 'av1'; PerfKey = 'av1_perf'; LowerBetter = $true },
  @{ File = 'AV1 Encoding (Hardware).csv'; Key = 'av1_hw'; PerfKey = 'av1_hw_perf'; LowerBetter = $true },
  @{ File = 'Maximum Power Draw.csv'; Key = 'watts'; PerfKey = 'watts_perf'; LowerBetter = $true; PerfExpectedWorse = $true },
  @{ File = 'Idle Power Draw.csv'; Key = 'power_idle_watts' },
  @{ File = 'Maximum CPU Temperature.csv'; Key = 'cpu_temp'; PerfKey = 'cpu_temp_perf'; LowerBetter = $true; PerfExpectedWorse = $true },
  @{ File = 'SSD Temperatures.csv'; Key = 'ssd_temp'; Kind = 'storage'; DefaultRows = @('Drive', 'Default', 'Controller') },
  @{ File = 'Volume.csv'; Key = 'volume' },
  @{ File = 'Wireless Bluetooth Audio.csv'; Key = 'wireless_audio'; DefaultRows = @('Metres', 'Default') }
)

$devicesByName = @{}
foreach ($device in $devices) {
  $devicesByName[$device.name] = $device
}

Ensure-UniqueDeviceIds -Devices $devices
Migrate-LegacyAiValues -Devices $devices

$usedIds = [System.Collections.Generic.HashSet[string]]::new()
foreach ($device in $devices) {
  [void]$usedIds.Add([string]$device.id)
}

$updatedCount = 0
$autoAdded = [System.Collections.Generic.HashSet[string]]::new()
$mappingMatches = @()
$derivedMatches = @()
$unresolved = [System.Collections.Generic.HashSet[string]]::new()
$orphans = [System.Collections.Generic.HashSet[string]]::new()
$performanceSources = @{}
foreach ($spec in $specs) {
  if ($spec.ContainsKey('PerfKey')) {
    $performanceSources[$spec.Key] = [System.Collections.Generic.HashSet[string]]::new()
  }
}

foreach ($mappingProperty in $mappingObject.PSObject.Properties) {
  $targetId = [string]$mappingProperty.Value
  if (-not ($usedIds.Contains($targetId))) {
    throw "Source mapping for '$($mappingProperty.Name)' points to unknown device id '$targetId'"
  }
}

# Pre-pass: collect source labels before importing metrics so ordinary new
# devices can be auto-added and receive IDs consistently before metrics import.
# Whether a label is a full device (vs. a config/SSD variant of one) is
# determined by the configuration suffix convention (see Get-SourceLabelBase),
# not by which CSV it happens to appear in - a device can legitimately have
# its only benchmarks be a GPU test.
if ($AutoAddDevices) {
  $sourceLabels = [System.Collections.Generic.HashSet[string]]::new()

  foreach ($spec in $specs) {
    $path = Join-Path $SourceDir $spec.File
    foreach ($label in (Get-SourceLabels -FilePath $path)) {
      [void]$sourceLabels.Add($label)
    }

  }

  $fanNoisePathPre = Join-Path $SourceDir 'Fan Noise.csv'
  foreach ($label in (Get-SourceLabels -FilePath $fanNoisePathPre)) {
    [void]$sourceLabels.Add($label)
  }

  $baseLabels = @()
  $suffixedLabels = @()
  foreach ($rawName in $sourceLabels) {
    if ((Get-SourceLabelBase -RawName $rawName) -eq $rawName) {
      $baseLabels += $rawName
    } else {
      $suffixedLabels += $rawName
    }
  }

  # Phase 1: auto-add devices for labels with no configuration suffix, so
  # phase 2 can resolve suffixed variants against them regardless of order.
  foreach ($rawName in ($baseLabels | Sort-Object)) {
    $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases -SlugLookup $slugLookup
    if (-not $result) {
      $newDevice = New-DeviceTemplate -DeviceName $rawName
      $newDevice.id = New-UniqueDeviceId -Name $rawName -UsedIds $usedIds
      $devices += $newDevice
      $devicesByName[$rawName] = $newDevice
      $canonicalLookup[$rawName] = $rawName
      Register-DeviceSlug -SlugLookup $slugLookup -Name $rawName
      [void]$autoAdded.Add($rawName)
    }
  }

  # Phase 2: labels with a configuration suffix should never become devices
  # themselves - if their base device still doesn't exist, create it under
  # the derived base name instead of the raw (suffixed) label.
  foreach ($rawName in ($suffixedLabels | Sort-Object)) {
    $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases -SlugLookup $slugLookup
    if (-not $result) {
      $baseName = Get-SourceLabelBase -RawName $rawName
      if (-not [string]::IsNullOrWhiteSpace($baseName) -and -not $devicesByName.ContainsKey($baseName)) {
        $newDevice = New-DeviceTemplate -DeviceName $baseName
        $newDevice.id = New-UniqueDeviceId -Name $baseName -UsedIds $usedIds
        $devices += $newDevice
        $devicesByName[$baseName] = $newDevice
        $canonicalLookup[$baseName] = $baseName
        Register-DeviceSlug -SlugLookup $slugLookup -Name $baseName
        [void]$autoAdded.Add($baseName)
      }
    }
  }
}


foreach ($spec in $specs) {
  $path = Join-Path $SourceDir $spec.File
  $kind = if ($spec.ContainsKey('Kind')) { $spec.Kind } else { '' }
  $rowMaps = Get-RowValueMaps -FilePath $path

  foreach ($ignoredLabel in @('Silent', 'Load Silent')) {
    if ($rowMaps.ContainsKey($ignoredLabel) -and $rowMaps[$ignoredLabel].Count -gt 0) {
      Write-Warning "Skipping populated $ignoredLabel row in $($spec.File)"
    }
  }

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
        $imports += @{ Key = $spec.PerfKey; Values = $performanceValues; SourceMetric = $spec.Key }
      }
    }
  }

  foreach ($import in $imports) {
    foreach ($rawName in $import.Values.Keys) {
      $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases -SlugLookup $slugLookup
      if (-not $result) {
        [void]$unresolved.Add($rawName)
        if ($kind -eq 'gpu' -or $kind -eq 'storage') {
          [void]$orphans.Add($rawName)
        }
        continue
      }

      $resolvedName = $result.name
      $device = $devicesByName[$resolvedName]
      if (-not $device) {
        [void]$unresolved.Add($rawName)
        if ($kind -eq 'gpu' -or $kind -eq 'storage') {
          [void]$orphans.Add($rawName)
        }
        continue
      }

      if ($result.method -eq 'mapping') {
        $mappingMatches += @{ raw = $rawName; resolved = $resolvedName }
      } elseif ($result.method -eq 'derived') {
        $derivedMatches += @{ raw = $rawName; resolved = $resolvedName }
      }

      Set-DeviceMetric -Device $device -Key $import.Key -Value $import.Values[$rawName]
      if ($import.ContainsKey('SourceMetric')) {
        [void]$performanceSources[$import.SourceMetric].Add($resolvedName)
      }
      $updatedCount++
    }
  }
}

$fanNoisePath = Join-Path $SourceDir 'Fan Noise.csv'
$fanNoiseRows = Get-RowValueMaps -FilePath $fanNoisePath
$noiseIdle = Select-RowValueMap -RowMaps $fanNoiseRows -PreferredRows @('Idle')
$noiseLoad = Select-RowValueMap -RowMaps $fanNoiseRows -PreferredRows @('Load Default', 'Default')
$noisePerf = Select-RowValueMap -RowMaps $fanNoiseRows -PreferredRows @('Load Performance', 'Performance')
$performanceSources['noise_load'] = [System.Collections.Generic.HashSet[string]]::new()

if ($fanNoiseRows.ContainsKey('Load Silent') -and $fanNoiseRows['Load Silent'].Count -gt 0) {
  Write-Warning 'Skipping populated Load Silent row in Fan Noise.csv'
}

foreach ($rawName in $noiseIdle.Keys) {
  $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases -SlugLookup $slugLookup
  if (-not $result) {
    [void]$unresolved.Add($rawName)
    continue
  }

  $resolvedName = $result.name
  if ($result.method -eq 'mapping') {
    $mappingMatches += @{ raw = $rawName; resolved = $resolvedName }
  } elseif ($result.method -eq 'derived') {
    $derivedMatches += @{ raw = $rawName; resolved = $resolvedName }
  }

  Set-DeviceMetric -Device $devicesByName[$resolvedName] -Key 'noise_idle' -Value $noiseIdle[$rawName]
  $updatedCount++
}

foreach ($rawName in $noiseLoad.Keys) {
  $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases -SlugLookup $slugLookup
  if (-not $result) {
    [void]$unresolved.Add($rawName)
    continue
  }

  $resolvedName = $result.name
  if ($result.method -eq 'mapping') {
    $mappingMatches += @{ raw = $rawName; resolved = $resolvedName }
  } elseif ($result.method -eq 'derived') {
    $derivedMatches += @{ raw = $rawName; resolved = $resolvedName }
  }

  Set-DeviceMetric -Device $devicesByName[$resolvedName] -Key 'noise_load' -Value $noiseLoad[$rawName]
  $updatedCount++
}

foreach ($rawName in $noisePerf.Keys) {
  $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases -SlugLookup $slugLookup
  if (-not $result) {
    [void]$unresolved.Add($rawName)
    continue
  }

  $resolvedName = $result.name
  if ($result.method -eq 'mapping') {
    $mappingMatches += @{ raw = $rawName; resolved = $resolvedName }
  } elseif ($result.method -eq 'derived') {
    $derivedMatches += @{ raw = $rawName; resolved = $resolvedName }
  }

  Set-DeviceMetric -Device $devicesByName[$resolvedName] -Key 'noise_perf' -Value $noisePerf[$rawName]
  if (-not $performanceSources.ContainsKey('noise_load')) {
    $performanceSources['noise_load'] = [System.Collections.Generic.HashSet[string]]::new()
  }
  [void]$performanceSources['noise_load'].Add($resolvedName)
  $updatedCount++
}

$equalAnomalies = @{}
$wrongDirectionAnomalies = @{}
function Add-PerformanceAnomaly {
  param(
    [hashtable]$Target,
    [string]$Metric,
    [string]$DeviceName
  )

  if (-not $Target.ContainsKey($Metric)) {
    $Target[$Metric] = @()
  }
  $Target[$Metric] += $DeviceName
}

foreach ($spec in $specs) {
  if (-not $spec.ContainsKey('PerfKey')) {
    continue
  }

  foreach ($deviceName in $performanceSources[$spec.Key]) {
    $device = $devicesByName[$deviceName]
    $defaultProperty = $device.PSObject.Properties[$spec.Key]
    $performanceProperty = $device.PSObject.Properties[$spec.PerfKey]
    if ($null -eq $defaultProperty -or $null -eq $performanceProperty -or $null -eq $defaultProperty.Value -or $null -eq $performanceProperty.Value) {
      continue
    }

    $equal = $defaultProperty.Value -eq $performanceProperty.Value
    $worse = if ($spec.ContainsKey('PerfExpectedWorse') -and $spec.PerfExpectedWorse) {
      if ($spec.ContainsKey('LowerBetter') -and $spec.LowerBetter) {
        $performanceProperty.Value -lt $defaultProperty.Value
      } else {
        $performanceProperty.Value -gt $defaultProperty.Value
      }
    } elseif ($spec.ContainsKey('LowerBetter') -and $spec.LowerBetter) {
      $performanceProperty.Value -gt $defaultProperty.Value
    } else {
      $performanceProperty.Value -lt $defaultProperty.Value
    }

    if ($equal) {
      Add-PerformanceAnomaly -Target $equalAnomalies -Metric $spec.Key -DeviceName $device.name
    } elseif ($worse) {
      Add-PerformanceAnomaly -Target $wrongDirectionAnomalies -Metric $spec.Key -DeviceName $device.name
    }
  }
}

foreach ($deviceName in $performanceSources['noise_load']) {
  $device = $devicesByName[$deviceName]
  $defaultNoise = $device.noise.load_default
  $performanceNoise = $device.noise.load_performance
  if ($null -eq $defaultNoise -or $null -eq $performanceNoise) {
    continue
  }

  if ($defaultNoise -eq $performanceNoise) {
    Add-PerformanceAnomaly -Target $equalAnomalies -Metric 'noise_load' -DeviceName $device.name
  } elseif ($performanceNoise -lt $defaultNoise) {
    Add-PerformanceAnomaly -Target $wrongDirectionAnomalies -Metric 'noise_load' -DeviceName $device.name
  }
}

$json = @($devices | ForEach-Object { ConvertTo-OrderedDevice -Device $_ }) | ConvertTo-Json -Depth 10
Set-Content -LiteralPath $DevicesPath -Value $json -Encoding UTF8

Write-Host "Updated metric entries: $updatedCount"

if ($mappingMatches.Count -gt 0) {
  Write-Host ""
  Write-Host "Explicit source mappings used:"
  $mappingMatches | Sort-Object -Property raw -Unique | ForEach-Object {
    Write-Host "  '$($_.raw)' -> '$($_.resolved)'"
  }
}

if ($derivedMatches.Count -gt 0) {
  Write-Host ""
  Write-Host "Derived source mappings used (configuration suffix stripped):"
  $derivedMatches | Sort-Object -Property raw -Unique | ForEach-Object {
    Write-Host "  '$($_.raw)' -> '$($_.resolved)'"
  }
}

if ($autoAdded.Count -gt 0) {
  Write-Host ""
  Write-Host "Auto-added new devices:"
  $autoAdded | Sort-Object | ForEach-Object { Write-Host "  + $_" }
}

if ($unresolved.Count -gt 0) {
  Write-Host ""
  Write-Host "Unresolved source names:"
  $unresolved | Sort-Object | ForEach-Object { Write-Host " - $_" }
}

if ($orphans.Count -gt 0) {
  Write-Host ""
  Write-Host "Potential component orphans (explicit mapping required):"
  $orphans | Sort-Object | ForEach-Object { Write-Host " - $_" }
}

if ($equalAnomalies.Count -gt 0) {
  Write-Host ""
  Write-Host "Performance values equal to Default:"
  foreach ($metric in ($equalAnomalies.Keys | Sort-Object)) {
    Write-Host "  ${metric}: $($equalAnomalies[$metric] -join ', ')"
  }
}

if ($wrongDirectionAnomalies.Count -gt 0) {
  Write-Host ""
  Write-Host "Performance values in wrong direction:"
  foreach ($metric in ($wrongDirectionAnomalies.Keys | Sort-Object)) {
    Write-Host "  ${metric}: $($wrongDirectionAnomalies[$metric] -join ', ')"
  }
}
