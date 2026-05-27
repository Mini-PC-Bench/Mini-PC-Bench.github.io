param(
  [string]$SourceDir = "./source",
  [string]$DevicesPath = "./devices.json"
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

$noiseWords = @(
  'dc', 'gen3', 'gen4', 'gen5', 'default', 'performance',
  'load', 'controller', 'drive', 'metres', 'feet',
  'kingston', 'crucial', 'micron', 'samsung', 'wd', 'lexar',
  'airdisk', 'biwin', 'phison', 'wodposit', 'xincuu', 'twsc',
  'gb', 'tb'
)

function Get-NormalizedTokens {
  param([string]$Name)

  if ([string]::IsNullOrWhiteSpace($Name)) {
    return @()
  }

  $normalized = $Name.ToLowerInvariant()
  $normalized = [regex]::Replace($normalized, '\([^)]*\)', ' ')
  $normalized = [regex]::Replace($normalized, '(?<!\d)(\d+(?:\.\d+)?)\s*(tb|gb)\b', ' ')
  $normalized = [regex]::Replace($normalized, '\bgen\s*[0-9]+\b', ' ')
  $normalized = [regex]::Replace($normalized, '[^a-z0-9]+', ' ')

  $tokens = @()
  foreach ($token in ($normalized -split '\s+')) {
    if ([string]::IsNullOrWhiteSpace($token)) {
      continue
    }

    if ($noiseWords -contains $token) {
      continue
    }

    $tokens += $token
  }

  return $tokens | Select-Object -Unique
}

function Get-CanonicalName {
  param([string]$Name)

  $tokens = Get-NormalizedTokens -Name $Name
  if ($tokens.Count -eq 0) {
    return ''
  }

  return ($tokens -join ' ').Trim()
}

function Get-IdentityTokens {
  param([string[]]$Tokens)

  if (-not $Tokens) {
    return @()
  }

  # Identity tokens carry digits and usually encode model/CPU identity.
  return @($Tokens | Where-Object {
    $_ -match '\d' -and $_.Length -ge 3
  })
}

function Get-CanonicalPreferenceScore {
  param([string]$Name)

  if ([string]::IsNullOrWhiteSpace($Name)) {
    return -999
  }

  $score = 100
  $lower = $Name.ToLowerInvariant()

  # Prefer base model names over variants with parenthetical suffixes.
  if ($Name -match '\(') {
    $score -= 25
  }

  # Penalize storage/generation suffixes that should not win canonical matching.
  if ($lower -match '\bgen\s*[0-9]+\b') {
    $score -= 20
  }
  if ($lower -match '\b\d+(?:\.\d+)?\s*(tb|gb)\b') {
    $score -= 20
  }

  # Slightly prefer shorter, cleaner canonical names.
  $score -= [math]::Min([math]::Floor($Name.Length / 40), 10)

  return $score
}

function Resolve-DeviceName {
  param(
    [string]$RawName,
    [object[]]$KnownDevices,
    [hashtable]$CanonicalLookup,
    [hashtable]$TokenLookup,
    [hashtable]$Aliases
  )

  if ($Aliases.ContainsKey($RawName)) {
    return @{ name = $Aliases[$RawName]; method = 'alias' }
  }

  $canonical = Get-CanonicalName -Name $RawName
  if ([string]::IsNullOrWhiteSpace($canonical)) {
    return $null
  }

  if ($CanonicalLookup.ContainsKey($canonical)) {
    return @{ name = $CanonicalLookup[$canonical]; method = 'canonical' }
  }

  $rawTokens = Get-NormalizedTokens -Name $RawName
  if ($rawTokens.Count -eq 0) {
    return $null
  }

  $rawIdentityTokens = @(Get-IdentityTokens -Tokens $rawTokens)
  $rawIdentitySet = [System.Collections.Generic.HashSet[string]]::new([string[]]$rawIdentityTokens)

  $rawSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$rawTokens)

  $bestName = $null
  $bestScore = -1.0

  foreach ($device in $KnownDevices) {
    $deviceTokens = $TokenLookup[$device.name]
    if ($deviceTokens.Count -eq 0) {
      continue
    }

    $deviceIdentityTokens = @(Get-IdentityTokens -Tokens $deviceTokens)
    if ($rawIdentityTokens.Count -gt 0 -and $deviceIdentityTokens.Count -gt 0) {
      $hasIdentityOverlap = $false
      foreach ($token in $deviceIdentityTokens) {
        if ($rawIdentitySet.Contains($token)) {
          $hasIdentityOverlap = $true
          break
        }
      }

      if (-not $hasIdentityOverlap) {
        continue
      }
    }

    $intersection = 0
    foreach ($token in $deviceTokens) {
      if ($rawSet.Contains($token)) {
        $intersection++
      }
    }

    if ($intersection -lt 2) {
      continue
    }

    $denominator = [math]::Max($deviceTokens.Count, $rawTokens.Count)
    if ($denominator -le 0) {
      continue
    }

    $score = $intersection / $denominator
    if ($score -gt $bestScore) {
      $bestScore = $score
      $bestName = $device.name
    }
  }

  if ($bestScore -ge 0.34) {
    return @{ name = $bestName; method = 'fuzzy'; score = $bestScore }
  }

  return $null
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

$canonicalLookup = @{}
$tokenLookup = @{}
foreach ($device in $devices) {
  $canonical = Get-CanonicalName -Name $device.name
  if (-not [string]::IsNullOrWhiteSpace($canonical)) {
    if (-not $canonicalLookup.ContainsKey($canonical)) {
      $canonicalLookup[$canonical] = $device.name
    } else {
      $existing = $canonicalLookup[$canonical]
      $existingScore = Get-CanonicalPreferenceScore -Name $existing
      $candidateScore = Get-CanonicalPreferenceScore -Name $device.name
      if ($candidateScore -gt $existingScore) {
        $canonicalLookup[$canonical] = $device.name
      }
    }
  }
  $tokenLookup[$device.name] = @(Get-NormalizedTokens -Name $device.name)
}

$aliases = @{
  'Beelink SER10 MAX 1TB Crucial (Gen4)' = 'Beelink SER10 MAX HX 470'
  'Beelink SER10 MAX 1TB Crucial' = 'Beelink SER10 MAX HX 470'
  'Beelink SER9 H255 (Gen4)' = 'Beelink SER9 H 255'
  'Beelink SER9 H255' = 'Beelink SER9 H 255'
  'Beelink SER9 H 255 1TB Crucial (Gen4)' = 'Beelink SER9 H 255'
  'ASUS NUC 15 Pro+ 1TB Micron (Gen4)' = 'ASUS NUC 15 Pro+ Ultra 9 285H'
  'ASUS NUC 14 Pro AI 1TB WD (Gen4)' = 'ASUS NUC 14 Pro AI Ultra 9 288V'
  'GEEKOM GT1 Mega 2TB Crucial (Gen4)' = 'GEEKOM GT1 Mega Ultra 9 185H'
  'GEEKOM IT15 2TB Crucial (Gen4)' = 'GEEKOM IT15 Ultra 9 285H'
  'MSI CUBI Z AI 8M 1TB Phison (Gen4)' = 'MSI CUBI Z AI 8M 8845HS'
  'MSI CUBI NUC AI 1UMG 1TB WD (Gen4)' = 'MSI CUBI NUC AI 1UMG Ultra 7 155H'
  'Minix NGC N512 512GB Kingston (Gen4)' = 'Minix NGC N512 i5-12600H'
  'Minisforum AI X1 Pro 1TB Kingston (Gen4)' = 'Minisforum AI X1 Pro HX 470'
  'Minisforum M1 Pro 1TB Kingston (Gen4)' = 'Minisforum M1 Pro-125H'
  'Minisforum UM750L 1TB Kingston (Gen4)' = 'Minisforum UM750L 7545U'
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

$devicesByName = @{}
foreach ($device in $devices) {
  $devicesByName[$device.name] = $device
}

$updatedCount = 0
$unresolved = [System.Collections.Generic.HashSet[string]]::new()
$fuzzyMatches = @()
$aliasMatches = @()

foreach ($spec in $specs) {
  $path = Join-Path $SourceDir $spec.File
  $metricValues = Get-RowValues -FilePath $path -PreferredRows $spec.Rows

  foreach ($rawName in $metricValues.Keys) {
    $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -TokenLookup $tokenLookup -Aliases $aliases
    if (-not $result) {
      [void]$unresolved.Add($rawName)
      continue
    }

    $resolvedName = $result.name
    $device = $devicesByName[$resolvedName]
    if (-not $device) {
      [void]$unresolved.Add($rawName)
      continue
    }

    # Track match methods
    if ($result.method -eq 'fuzzy') {
      $fuzzyMatches += @{ raw = $rawName; resolved = $resolvedName; score = $result.score }
    } elseif ($result.method -eq 'alias') {
      $aliasMatches += @{ raw = $rawName; resolved = $resolvedName }
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
  $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -TokenLookup $tokenLookup -Aliases $aliases
  if (-not $result) {
    [void]$unresolved.Add($rawName)
    continue
  }

  $resolvedName = $result.name
  if ($result.method -eq 'fuzzy') {
    $fuzzyMatches += @{ raw = $rawName; resolved = $resolvedName; score = $result.score }
  } elseif ($result.method -eq 'alias') {
    $aliasMatches += @{ raw = $rawName; resolved = $resolvedName }
  }

  Set-DeviceMetric -Device $devicesByName[$resolvedName] -Key 'noise_idle' -Value $noiseIdle[$rawName]
  $updatedCount++
}

foreach ($rawName in $noiseLoad.Keys) {
  $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -TokenLookup $tokenLookup -Aliases $aliases
  if (-not $result) {
    [void]$unresolved.Add($rawName)
    continue
  }

  $resolvedName = $result.name
  if ($result.method -eq 'fuzzy') {
    $fuzzyMatches += @{ raw = $rawName; resolved = $resolvedName; score = $result.score }
  } elseif ($result.method -eq 'alias') {
    $aliasMatches += @{ raw = $rawName; resolved = $resolvedName }
  }

  Set-DeviceMetric -Device $devicesByName[$resolvedName] -Key 'noise_load' -Value $noiseLoad[$rawName]
  $updatedCount++
}

foreach ($rawName in $noisePerf.Keys) {
  $result = Resolve-DeviceName -RawName $rawName -KnownDevices $devices -CanonicalLookup $canonicalLookup -TokenLookup $tokenLookup -Aliases $aliases
  if (-not $result) {
    [void]$unresolved.Add($rawName)
    continue
  }

  $resolvedName = $result.name
  if ($result.method -eq 'fuzzy') {
    $fuzzyMatches += @{ raw = $rawName; resolved = $resolvedName; score = $result.score }
  } elseif ($result.method -eq 'alias') {
    $aliasMatches += @{ raw = $rawName; resolved = $resolvedName }
  }

  Set-DeviceMetric -Device $devicesByName[$resolvedName] -Key 'noise_perf' -Value $noisePerf[$rawName]
  $updatedCount++
}

$json = $devices | ConvertTo-Json -Depth 10
Set-Content -LiteralPath $DevicesPath -Value $json -Encoding UTF8

Write-Host "Updated metric entries: $updatedCount"

if ($fuzzyMatches.Count -gt 0) {
  Write-Host ""
  Write-Host "Fuzzy matches (auto-resolved using token scoring, score >= 0.34):"
  $fuzzyMatches | Sort-Object -Property raw -Unique | ForEach-Object {
    Write-Host "  '$($_.raw)' -> '$($_.resolved)' (score: $([math]::Round($_.score, 3)))"
  }
}

if ($aliasMatches.Count -gt 0) {
  Write-Host ""
  Write-Host "Alias matches (explicit mappings):"
  $aliasMatches | Sort-Object -Property raw -Unique | ForEach-Object {
    Write-Host "  '$($_.raw)' -> '$($_.resolved)'"
  }
}

if ($unresolved.Count -gt 0) {
  Write-Host ""
  Write-Host "Unresolved source names:"
  $unresolved | Sort-Object | ForEach-Object { Write-Host " - $_" }
}
