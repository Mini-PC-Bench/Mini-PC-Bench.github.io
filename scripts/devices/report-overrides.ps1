<#[
.SYNOPSIS
  Reports remaining non-null overrides in devices.json.

.DESCRIPTION
  Compares the staged devices.json against the working-tree devices.json.
  Existing device records with changed values are reported as overrides.
  Added and removed device records are listed separately.

.EXAMPLE
  ./scripts/devices/report-overrides.ps1
  ./scripts/devices/report-overrides.ps1 -ReportPath ./override-report.md
#>
[CmdletBinding()]
param(
  [string]$JsonPath = (Join-Path $PSScriptRoot '..\..\devices.json'),
  [string]$ReportPath = (Join-Path $PSScriptRoot '..\..\override-report.md')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepositoryRoot {
  $root = @(& git rev-parse --show-toplevel)
  if ($LASTEXITCODE -ne 0 -or $root.Count -eq 0) {
    throw 'Unable to resolve Git repository root.'
  }
  return ([string]$root[0]).Trim()
}

function Get-RelativeRepositoryPath {
  param(
    [Parameter(Mandatory)]
    [string]$RepositoryRoot,
    [Parameter(Mandatory)]
    [string]$Path
  )

  $fullPath = [IO.Path]::GetFullPath($Path)
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    throw "File not found: $fullPath"
  }

  $relativePath = [IO.Path]::GetRelativePath($RepositoryRoot, $fullPath) -replace '\\', '/'
  if ($relativePath -eq '..' -or $relativePath.StartsWith('../') -or [IO.Path]::IsPathRooted($relativePath)) {
    throw "File must be inside the Git repository: $Path"
  }

  return $relativePath
}

function Get-StagedJson {
  param([Parameter(Mandatory)][string]$RelativePath)

  $content = @(& git show ":$RelativePath")
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read staged file: $RelativePath"
  }

  return (($content -join [Environment]::NewLine) | ConvertFrom-Json)
}

function Get-LeafValues {
  param(
    [AllowNull()]
    [object]$Value,
    [string]$Path = ''
  )

  $values = [ordered]@{}
  if ($null -eq $Value) {
    $values[$Path] = $null
    return ,$values
  }

  $properties = @()
  if ($Value -is [pscustomobject]) {
    $properties = @($Value.PSObject.Properties)
  }

  if ($properties.Count -eq 0) {
    $values[$Path] = $Value
    return ,$values
  }

  foreach ($property in $properties) {
    $propertyPath = if ($Path) { "$Path.$($property.Name)" } else { $property.Name }
    $childValues = Get-LeafValues -Value $property.Value -Path $propertyPath
    foreach ($childPath in $childValues.Keys) {
      $values[$childPath] = $childValues[$childPath]
    }
  }

  return ,$values
}

function ConvertTo-DisplayValue {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value) {
    return 'null'
  }

  if ($Value -is [string]) {
    return ($Value | ConvertTo-Json -Compress)
  }

  return ($Value | ConvertTo-Json -Compress)
}

function ConvertTo-MarkdownCell {
  param([AllowNull()][object]$Value)

  return (([string]$Value -replace "(\r\n|\r|\n)", ' ' -replace '\|', '\|').Trim())
}

$repositoryRoot = Get-RepositoryRoot
$relativePath = Get-RelativeRepositoryPath -RepositoryRoot $repositoryRoot -Path $JsonPath
$fullJsonPath = Join-Path $repositoryRoot $relativePath

$beforeDevices = @(Get-StagedJson -RelativePath $relativePath)
$afterDevices = @(Get-Content -LiteralPath $fullJsonPath -Raw | ConvertFrom-Json)

$beforeById = @{}
foreach ($device in $beforeDevices) {
  $beforeById[[string]$device.id] = $device
}

$afterById = @{}
foreach ($device in $afterDevices) {
  $afterById[[string]$device.id] = $device
}

$overrideReports = @()
$addedDevices = @()

foreach ($afterDevice in $afterDevices) {
  $deviceId = [string]$afterDevice.id
  if (-not $beforeById.ContainsKey($deviceId)) {
    $addedDevices += $afterDevice
    continue
  }

  $beforeDevice = $beforeById[$deviceId]
  $beforeValues = Get-LeafValues -Value $beforeDevice
  $afterValues = Get-LeafValues -Value $afterDevice
  $changeRows = @()

  $propertyPaths = @($beforeValues.Keys + $afterValues.Keys | Select-Object -Unique)
  foreach ($propertyPath in $propertyPaths) {
    if ($propertyPath -in @('id', 'name')) {
      continue
    }

    $beforeExists = $beforeValues.Contains($propertyPath)
    $afterExists = $afterValues.Contains($propertyPath)
    $beforeValue = if ($beforeExists) { $beforeValues[$propertyPath] } else { $null }
    $afterValue = if ($afterExists) { $afterValues[$propertyPath] } else { $null }

    $beforeText = ConvertTo-DisplayValue $beforeValue
    $afterText = ConvertTo-DisplayValue $afterValue
    if ($beforeExists -and $afterExists -and $beforeText -eq $afterText) {
      continue
    }

    $changeRows += [pscustomobject]@{
      Property = $propertyPath
      Before   = $beforeText
      After    = $afterText
    }
  }

  if ($changeRows.Count -gt 0) {
    $overrideReports += [pscustomobject]@{
      Id      = $deviceId
      Name    = [string]$afterDevice.name
      Changes = $changeRows
    }
  }
}

$removedDevices = @(
  $beforeDevices | Where-Object { -not $afterById.ContainsKey([string]$_.id) }
)

$reportLines = @(
  '# Override Report'
  ''
  "Compared staged ``$relativePath`` with working-tree ``$relativePath``."
  ''
  "Overrides: $($overrideReports.Count) devices, $(($overrideReports | ForEach-Object { $_.Changes.Count } | Measure-Object -Sum).Sum) values"
  "Added devices excluded from override tables: $($addedDevices.Count)"
  "Removed devices excluded from override tables: $($removedDevices.Count)"
  ''
)

if ($overrideReports.Count -eq 0) {
  $reportLines += 'No existing-device overrides found.'
}
else {
  foreach ($deviceReport in $overrideReports) {
    $reportLines += "## $($deviceReport.Name) (``$($deviceReport.Id)``)"
    $reportLines += ''
    $reportLines += '| Property | Before | After |'
    $reportLines += '| --- | ---: | ---: |'
    foreach ($change in $deviceReport.Changes) {
      $reportLines += "| $(ConvertTo-MarkdownCell $change.Property) | $(ConvertTo-MarkdownCell $change.Before) | $(ConvertTo-MarkdownCell $change.After) |"
    }
    $reportLines += ''
  }
}

if ($addedDevices.Count -gt 0) {
  $reportLines += '## Added Devices Excluded'
  $reportLines += ''
  foreach ($device in $addedDevices) {
    $reportLines += "- $($device.name) (``$($device.id)``)"
  }
  $reportLines += ''
}

if ($removedDevices.Count -gt 0) {
  $reportLines += '## Removed Devices Excluded'
  $reportLines += ''
  foreach ($device in $removedDevices) {
    $reportLines += "- $($device.name) (``$($device.id)``)"
  }
  $reportLines += ''
}

[IO.File]::WriteAllText(
  [IO.Path]::GetFullPath($ReportPath),
  ($reportLines -join [Environment]::NewLine) + [Environment]::NewLine,
  [Text.UTF8Encoding]::new($false)
)

Write-Host "Report: $([IO.Path]::GetFullPath($ReportPath))"
Write-Host "Overrides: $($overrideReports.Count) devices, $(($overrideReports | ForEach-Object { $_.Changes.Count } | Measure-Object -Sum).Sum) values"
Write-Host "Added devices excluded: $($addedDevices.Count)"
Write-Host "Removed devices excluded: $($removedDevices.Count)"
