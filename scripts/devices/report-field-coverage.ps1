<#
.SYNOPSIS
  Reports current field coverage and numeric ranges in a device dataset.
.DESCRIPTION
  Discovers JSON leaf fields, including nested paths such as noise.idle.
  Present means non-null and non-blank. Reports stored data only, not
  browser-derived scores or normalized aliases. Numeric counts and types
  identify candidates for numeric filtering.
.EXAMPLE
  ./scripts/devices/report-field-coverage.ps1
  ./scripts/devices/report-field-coverage.ps1 -Fields cb23s,cb23m,noise.idle -IncludeMissingDevices
  ./scripts/devices/report-field-coverage.ps1 -ReportPath ./field-coverage.md
  ./scripts/devices/report-field-coverage.ps1 -PassThru | Export-Csv ./field-coverage.csv -NoTypeInformation
#>
[CmdletBinding()]
param(
  [string]$DevicesPath = (Join-Path $PSScriptRoot '../../devices.json'),
  [Alias('Field')]
  [string[]]$Fields,
  [switch]$IncludeMissingDevices = $true,
  [string]$ReportPath,
  [switch]$PassThru
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-LeafPaths {
  param([AllowNull()][object]$Value, [string]$Path = '')
  if ($Value -is [System.Collections.IDictionary] -and $Value.Count -gt 0) {
    foreach ($key in $Value.Keys) {
      $childPath = if ($Path) { "$Path.$key" } else { [string]$key }
      Get-LeafPaths -Value $Value[$key] -Path $childPath
    }
  }
  elseif ($Path) { $Path }
}

function Get-FieldValue {
  param([object]$Device, [string]$Path)
  $value = $Device
  foreach ($segment in $Path.Split('.')) {
    if ($value -isnot [System.Collections.IDictionary] -or -not $value.Contains($segment)) {
      return $null
    }
    $value = $value[$segment]
  }
  # Preserve array-valued leaves instead of enumerating them into the pipeline.
  return ,$value
}

function ConvertTo-MarkdownCell {
  param([AllowNull()][object]$Value)
  return ([string]$Value -replace '(\r\n|\r|\n)', ' ' -replace '\|', '\|')
}

$data = Get-Content -LiteralPath $DevicesPath -Raw | ConvertFrom-Json -AsHashtable -NoEnumerate
if ($data -isnot [array]) { throw 'Expected a JSON array of device objects.' }
$devices = @($data)
foreach ($device in $devices) {
  if ($device -isnot [System.Collections.IDictionary]) { throw 'Expected a JSON array of device objects.' }
}
$total = $devices.Count
$discovered = @($devices | ForEach-Object { Get-LeafPaths -Value $_ } | Sort-Object -Unique)
# A null parent in one record is missing data for child paths, not a separate leaf.
$availableFields = @($discovered | Where-Object {
  $candidate = $_
  -not @($discovered | Where-Object { $_.StartsWith("$candidate.", [StringComparison]::Ordinal) }).Count
})
if ($Fields) {
  $unknown = @($Fields | Where-Object { $_ -cnotin $availableFields })
  if ($unknown.Count) {
    throw "Unknown field(s): $($unknown -join ', '). Available fields: $($availableFields -join ', ')"
  }
  $selectedFields = @($Fields | Select-Object -Unique)
}
else { $selectedFields = $availableFields }

$fieldLabels = @{
  watts = 'Max power draw'
  power_idle_watts = 'Max idle power'
  volume = 'Max volume'
  'noise.idle' = 'Max idle noise'
  'noise.load_default' = 'Max load noise'
  'noise.load_performance' = 'Max performance noise'
  cb23s = 'Cinebench R23 single-core'
  cb23m = 'Cinebench R23 multi-core'
}

$rows = @(foreach ($field in $selectedFields) {
  $present = 0
  $numericValues = @()
  $types = @()
  $distinctValues = @()
  $missingDevices = @()
  foreach ($device in $devices) {
    $value = Get-FieldValue -Device $device -Path $field
    if ($null -eq $value -or ($value -is [string] -and [string]::IsNullOrWhiteSpace($value))) {
      $missingDevices += [pscustomobject]@{ Id = $device['id']; Name = $device['name'] }
      continue
    }
    $present++
    $type = if ($value -is [string]) { 'string' }
      elseif ($value -is [bool]) { 'boolean' }
      elseif ($value -is [ValueType]) { 'number' }
      elseif ($value -is [array]) { 'array' }
      else { 'object' }
    $types += $type
    $distinctValues += ConvertTo-Json -InputObject $value -Depth 100 -Compress
    if ($type -eq 'number') { $numericValues += $value }
  }
  $range = $numericValues | Measure-Object -Minimum -Maximum
  [pscustomobject]@{
    Field = $field
    Label = if ($fieldLabels.ContainsKey($field)) { $fieldLabels[$field] } else { $field }
    Types = (@($types | Sort-Object -Unique) -join ', ')
    Present = $present
    Missing = $total - $present
    CoveragePct = if ($total) { [int][math]::Round(100 * $present / $total) } else { 0 }
    MissingPct = if ($total) { [int][math]::Round(100 * ($total - $present) / $total) } else { 0 }
    Numeric = $numericValues.Count
    NumericFilterCandidate = $numericValues.Count -gt 0 -and $numericValues.Count -eq $present
    Min = if ($numericValues.Count) { $range.Minimum } else { $null }
    Max = if ($numericValues.Count) { $range.Maximum } else { $null }
    Distinct = @($distinctValues | Sort-Object -Unique).Count
    MissingDevices = $missingDevices
  }
})

if ($ReportPath) {
  $lines = @(
    '# Device Field Coverage'
    ''
    "Coverage across $total devices. Present means non-null and non-blank. Paths refer to stored JSON fields; browser-derived scores and normalized aliases are excluded."
    ''
    '| Field | Types | Present | Missing | Coverage % | Missing % | Numeric | Min | Max | Distinct | Numeric filter candidate |'
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |'
  )
  foreach ($row in $rows) {
    $cells = @($row.Field, $row.Types, $row.Present, $row.Missing, $row.CoveragePct, $row.MissingPct, $row.Numeric, $row.Min, $row.Max, $row.Distinct, $row.NumericFilterCandidate)
    $lines += '| ' + (($cells | ForEach-Object { ConvertTo-MarkdownCell $_ }) -join ' | ') + ' |'
  }
  if ($IncludeMissingDevices) {
    foreach ($row in $rows) {
      $lines += '', "## Missing: $($row.Field)", ''
      if (-not $row.Missing) { $lines += 'None.' }
      foreach ($device in $row.MissingDevices) {
        $lines += "- $(ConvertTo-MarkdownCell $device.Name) (``$(ConvertTo-MarkdownCell $device.Id)``)"
      }
    }
  }
  [IO.File]::WriteAllText([IO.Path]::GetFullPath($ReportPath), ($lines -join [Environment]::NewLine) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
  Write-Host "Report: $([IO.Path]::GetFullPath($ReportPath))"
}
if ($PassThru) { $rows }
else {
  Write-Host "Field coverage across $total devices" -ForegroundColor Cyan
  $rows | Format-Table Field, Label, Present, Missing, @{ Label = 'Missing %'; Expression = { $_.MissingPct } } -AutoSize | Out-String -Width 200 | Write-Host
  if ($IncludeMissingDevices) {
    Write-Host 'Devices missing each field:' -ForegroundColor Cyan
    foreach ($row in $rows) {
      if (-not $row.Missing) {
        Write-Host "  $($row.Field): none missing" -ForegroundColor Green
        continue
      }
      Write-Host "  $($row.Field) ($($row.Missing) missing):" -ForegroundColor Yellow
      foreach ($device in $row.MissingDevices) { Write-Host "    - $($device.Name)" }
    }
  }
}
