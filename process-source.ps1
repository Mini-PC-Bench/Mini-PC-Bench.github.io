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

function Resolve-DeviceName {
  param(
    [string]$RawName,
    [object[]]$KnownDevices,
    [hashtable]$CanonicalLookup,
    [hashtable]$Aliases
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

  return $null
}

function Get-DeviceSlug {
  param([string]$Name)

  $slug = $Name.ToLowerInvariant()
  $slug = [regex]::Replace($slug, '[^a-z0-9]+', '-')
  return $slug.Trim('-')
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
    noise = [pscustomobject]@{
      idle = $null
      load_default = $null
      load_performance = $null
    }
    cb23s = $null
    cb23m = $null
    gb6s = $null
    gb6m = $null
    gbai_cpu = $null
    gbai_gpu = $null
    firestrike = $null
    timespy = $null
    steelnomad = $null
    storage = $null
    coding = $null
    photoshop = $null
    premiere = $null
    h264 = $null
    handbrake = $null
    av1 = $null
    av1_hw = $null
    watts = $null
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
      if (-not $Device.noise) {
        $Device | Add-Member -NotePropertyName noise -NotePropertyValue ([pscustomobject]@{}) -Force
      }
      $Device.noise | Add-Member -NotePropertyName load_default -NotePropertyValue $Value -Force
      return
    }
    'noise_perf' {
      if (-not $Device.noise) {
        $Device | Add-Member -NotePropertyName noise -NotePropertyValue ([pscustomobject]@{}) -Force
      }
      $Device.noise | Add-Member -NotePropertyName load_performance -NotePropertyValue $Value -Force
      return
    }
    'noise_idle' {
      if (-not $Device.noise) {
        $Device | Add-Member -NotePropertyName noise -NotePropertyValue ([pscustomobject]@{}) -Force
      }
      $Device.noise | Add-Member -NotePropertyName idle -NotePropertyValue $Value -Force
      return
    }
    'h264' {
      $Device | Add-Member -NotePropertyName h264 -NotePropertyValue $Value -Force
      $Device | Add-Member -NotePropertyName handbrake -NotePropertyValue $Value -Force
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
foreach ($device in $devices) {
  $canonicalLookup[$device.name] = $device.name
}

$specs = @(
  @{ File = 'Cinebench R23 Single Core.csv'; Key = 'cb23s'; Rows = @('Default') },
  @{ File = 'Cinebench R23 Multicore.csv'; Key = 'cb23m'; Rows = @('Default') },
  @{ File = 'Geekbench 6 Single Core.csv'; Key = 'gb6s'; Rows = @('Default') },
  @{ File = 'Geekbench 6 Multicore.csv'; Key = 'gb6m'; Rows = @('Default') },
  @{ File = 'Geekbench AI CPU.csv'; Key = 'gbai_cpu'; Rows = @('Quantised', 'Single', 'Default') },
  @{ File = 'Geekbench AI GPU.csv'; Key = 'gbai_gpu'; Kind = 'gpu'; Rows = @('Half', 'Single', 'Default') },
  @{ File = '3DMark Fire Strike.csv'; Key = 'firestrike'; Kind = 'gpu'; Rows = @('Default') },
  @{ File = '3DMark Time Spy.csv'; Key = 'timespy'; Kind = 'gpu'; Rows = @('Default') },
  @{ File = '3DMark Steel Nomad.csv'; Key = 'steelnomad'; Kind = 'gpu'; Rows = @('Default') },
  @{ File = '3DMark Storage Benchmark.csv'; Key = 'storage'; Kind = 'storage'; Rows = @('Default') },
  @{ File = 'Coding.csv'; Key = 'coding'; Rows = @('Default') },
  @{ File = 'Photoshop.csv'; Key = 'photoshop'; Rows = @('Default') },
  @{ File = 'Premiere.csv'; Key = 'premiere'; Rows = @('Default') },
  @{ File = 'H264 Encoding.csv'; Key = 'h264'; Rows = @('Default') },
  @{ File = 'AV1 Encoding.csv'; Key = 'av1'; Rows = @('Default') },
  @{ File = 'AV1 Encoding (Hardware).csv'; Key = 'av1_hw'; Rows = @('Default') },
  @{ File = 'Maximum Power Draw.csv'; Key = 'watts'; Rows = @('Default') },
  @{ File = 'Idle Power Draw.csv'; Key = 'power_idle_watts'; Rows = @('Default') },
  @{ File = 'Maximum CPU Temperature.csv'; Key = 'cpu_temp'; Rows = @('Default') },
  @{ File = 'SSD Temperatures.csv'; Key = 'ssd_temp'; Kind = 'storage'; Rows = @('Drive', 'Default', 'Controller') },
  @{ File = 'Volume.csv'; Key = 'volume'; Rows = @('Default') },
  @{ File = 'Wireless Bluetooth Audio.csv'; Key = 'wireless_audio'; Rows = @('Metres', 'Default') }
)

$devicesByName = @{}
foreach ($device in $devices) {
  $devicesByName[$device.name] = $device
}

Ensure-UniqueDeviceIds -Devices $devices

$usedIds = [System.Collections.Generic.HashSet[string]]::new()
foreach ($device in $devices) {
  [void]$usedIds.Add([string]$device.id)
}

$updatedCount = 0
$autoAdded = [System.Collections.Generic.HashSet[string]]::new()
$mappingMatches = @()
$unresolved = [System.Collections.Generic.HashSet[string]]::new()
$orphans = [System.Collections.Generic.HashSet[string]]::new()

foreach ($mappingProperty in $mappingObject.PSObject.Properties) {
  $targetId = [string]$mappingProperty.Value
  if (-not ($usedIds.Contains($targetId))) {
    throw "Source mapping for '$($mappingProperty.Name)' points to unknown device id '$targetId'"
  }
}

# Pre-pass: collect source labels before importing metrics so unresolved labels
# can be reported and ordinary new devices can receive IDs consistently.
if ($AutoAddDevices) {
  $sourceKindsByLabel = @{}

  foreach ($spec in $specs) {
    $path = Join-Path $SourceDir $spec.File
    $kind = if ($spec.ContainsKey('Kind')) { $spec.Kind } else { '' }
    foreach ($label in (Get-SourceLabels -FilePath $path)) {
      if (-not $sourceKindsByLabel.ContainsKey($label) -or -not [string]::IsNullOrWhiteSpace($kind)) {
        $sourceKindsByLabel[$label] = $kind
      }
    }
  }

  $fanNoisePathPre = Join-Path $SourceDir 'Fan Noise.csv'
  foreach ($label in (Get-SourceLabels -FilePath $fanNoisePathPre)) {
    if (-not $sourceKindsByLabel.ContainsKey($label)) {
      $sourceKindsByLabel[$label] = ''
    }
  }

  foreach ($rawName in ($sourceKindsByLabel.Keys | Sort-Object)) {
    $kind = $sourceKindsByLabel[$rawName]
    $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases
    if (-not $result) {
      [void]$unresolved.Add($rawName)
      if ($kind -eq 'gpu' -or $kind -eq 'storage') {
        [void]$orphans.Add($rawName)
        continue
      }

      $newDevice = New-DeviceTemplate -DeviceName $rawName
      $newDevice.id = New-UniqueDeviceId -Name $rawName -UsedIds $usedIds
      $devices += $newDevice
      $devicesByName[$rawName] = $newDevice
      $canonicalLookup[$rawName] = $rawName
      [void]$autoAdded.Add($rawName)
      [void]$unresolved.Remove($rawName)
    }
  }
}


foreach ($spec in $specs) {
  $path = Join-Path $SourceDir $spec.File
  $metricValues = Get-RowValues -FilePath $path -PreferredRows $spec.Rows

  foreach ($rawName in $metricValues.Keys) {
    $kind = if ($spec.ContainsKey('Kind')) { $spec.Kind } else { '' }
    $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases
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

    # Track explicit mapping decisions for the import audit.
    if ($result.method -eq 'mapping') {
      $mappingMatches += @{ raw = $rawName; resolved = $resolvedName }
    }

    Set-DeviceMetric -Device $device -Key $spec.Key -Value $metricValues[$rawName]
    $updatedCount++
  }
}

$fanNoisePath = Join-Path $SourceDir 'Fan Noise.csv'
$noiseIdle = Get-RowValues -FilePath $fanNoisePath -PreferredRows @('Idle')
$noiseLoad = Get-RowValues -FilePath $fanNoisePath -PreferredRows @('Load Default', 'Default')
$noisePerf = Get-RowValues -FilePath $fanNoisePath -PreferredRows @('Load Performance', 'Performance')

foreach ($rawName in $noiseIdle.Keys) {
  $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases
  if (-not $result) {
    [void]$unresolved.Add($rawName)
    continue
  }

  $resolvedName = $result.name
  if ($result.method -eq 'mapping') {
    $mappingMatches += @{ raw = $rawName; resolved = $resolvedName }
  }

  Set-DeviceMetric -Device $devicesByName[$resolvedName] -Key 'noise_idle' -Value $noiseIdle[$rawName]
  $updatedCount++
}

foreach ($rawName in $noiseLoad.Keys) {
  $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases
  if (-not $result) {
    [void]$unresolved.Add($rawName)
    continue
  }

  $resolvedName = $result.name
  if ($result.method -eq 'mapping') {
    $mappingMatches += @{ raw = $rawName; resolved = $resolvedName }
  }

  Set-DeviceMetric -Device $devicesByName[$resolvedName] -Key 'noise_load' -Value $noiseLoad[$rawName]
  $updatedCount++
}

foreach ($rawName in $noisePerf.Keys) {
  $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -Aliases $aliases
  if (-not $result) {
    [void]$unresolved.Add($rawName)
    continue
  }

  $resolvedName = $result.name
  if ($result.method -eq 'mapping') {
    $mappingMatches += @{ raw = $rawName; resolved = $resolvedName }
  }

  Set-DeviceMetric -Device $devicesByName[$resolvedName] -Key 'noise_perf' -Value $noisePerf[$rawName]
  $updatedCount++
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
