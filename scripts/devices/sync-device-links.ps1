param(
  [string]$DevicesPath = "./devices.json",
  [string]$LinksPath = "./device-links.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $DevicesPath)) {
  throw "devices.json not found: $DevicesPath"
}

if (-not (Test-Path -LiteralPath $LinksPath)) {
  throw "device-links.json not found: $LinksPath"
}

$devices = @(Get-Content -LiteralPath $DevicesPath -Raw | ConvertFrom-Json)
$links = Get-Content -LiteralPath $LinksPath -Raw | ConvertFrom-Json

$deviceIds = [System.Collections.Generic.HashSet[string]]::new()
foreach ($device in $devices) {
  $id = [string]$device.id
  if ([string]::IsNullOrWhiteSpace($id)) {
    throw "Device '$($device.name)' has no id"
  }

  if (-not $deviceIds.Add($id)) {
    throw "Duplicate device id: $id"
  }
}

$existingKeys = [System.Collections.Generic.HashSet[string]]::new()
foreach ($property in $links.PSObject.Properties) {
  [void]$existingKeys.Add($property.Name)
}

$missing = @()
foreach ($id in $deviceIds) {
  if ($existingKeys.Contains($id)) {
    continue
  }

  $links | Add-Member -NotePropertyName $id -NotePropertyValue @() -Force
  $missing += $id
}

$dangling = @($existingKeys | Where-Object { -not $deviceIds.Contains($_) } | Sort-Object)
$json = $links | ConvertTo-Json -Depth 10
Set-Content -LiteralPath $LinksPath -Value $json -Encoding UTF8

Write-Host "Device IDs: $($deviceIds.Count)"
Write-Host "Link entries: $($existingKeys.Count + $missing.Count)"
Write-Host "Added missing link entries: $($missing.Count)"

if ($missing.Count -gt 0) {
  $missing | Sort-Object | ForEach-Object { Write-Host "  + $_" }
}

if ($dangling.Count -gt 0) {
  Write-Host "Dangling link entries (not removed): $($dangling.Count)"
  $dangling | ForEach-Object { Write-Host "  ! $_" }
}
