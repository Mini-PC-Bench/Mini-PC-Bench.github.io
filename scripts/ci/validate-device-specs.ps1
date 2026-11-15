[CmdletBinding()]
param(
  [string]$SpecsPath = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'device-specs.json'),
  [string]$DevicesPath = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'devices.json'),
  [string]$SchemaPath = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'schemas/device-specs-public.schema.json')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# The public schema is pulled with the data from the research repository.
$json = Get-Content -LiteralPath $SpecsPath -Raw
if (-not (Test-Json -Json $json -SchemaFile $SchemaPath)) { throw 'Invalid data-only specifications' }
$document = [System.Text.Json.JsonDocument]::Parse([string]$json)
try {
  $ids = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($device in (Get-Content -LiteralPath $DevicesPath -Raw | ConvertFrom-Json)) {
    if (-not $ids.Add($device.id)) { throw "Duplicate catalog device ID: $($device.id)" }
  }
  $seen = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  # Mirrors slugCpuFacet in frontend/filters.js: filter ids must map to exactly one label.
  $slug = { param([string]$value) ($value.ToLowerInvariant().Trim() -replace '[^a-z0-9]+', '-') -replace '^-|-$', '' }
  $facetIds = [System.Collections.Generic.Dictionary[string, string]]::new([StringComparer]::Ordinal)
  foreach ($record in $document.RootElement.EnumerateObject()) {
    if (-not $seen.Add($record.Name)) { throw "Duplicate specification device ID: $($record.Name)" }
    if (-not $ids.Contains($record.Name)) { throw "Unknown specification device ID: $($record.Name)" }
    $fields = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($field in $record.Value.EnumerateObject()) {
      if (-not $fields.Add($field.Name)) { throw "Duplicate specification field: $($record.Name).$($field.Name)" }
      if ($field.Name -eq 'cpu_model' -and $field.Value.ValueKind -eq 'String' -and -not $field.Value.GetString().Trim()) { throw "Empty processor model: $($record.Name)" }
      if ($field.Name -in @('cpu_brand', 'cpu_family') -and $field.Value.ValueKind -eq 'String' -and -not $field.Value.GetString().Trim()) { throw "Empty processor facet: $($record.Name).$($field.Name)" }
    }
    $recordElement = $record.Value
    $model = [System.Text.Json.JsonElement]::new()
    $brand = [System.Text.Json.JsonElement]::new()
    $family = [System.Text.Json.JsonElement]::new()
    $hasModel = $recordElement.TryGetProperty('cpu_model', [ref]$model) -and $model.ValueKind -eq 'String'
    $hasBrand = $recordElement.TryGetProperty('cpu_brand', [ref]$brand) -and $brand.ValueKind -eq 'String'
    $hasFamily = $recordElement.TryGetProperty('cpu_family', [ref]$family) -and $family.ValueKind -eq 'String'
    if ($hasModel -and (-not $hasBrand -or -not $hasFamily)) { throw "Processor model is missing facets: $($record.Name)" }
    if ($hasBrand -ne $hasFamily) { throw "Incomplete processor facet: $($record.Name)" }
    if ($hasBrand) {
      $brandName = $brand.GetString()
      $familyName = $family.GetString()
      $brandId = & $slug $brandName
      $familySlug = & $slug $familyName
      if (-not $brandId -or -not $familySlug) { throw "Processor facet has no filter ID: $($record.Name)" }
      foreach ($facet in @(@($brandId, $brandName), @("$brandId-$familySlug", "$brandName / $familyName"))) {
        $existing = $null
        if ($facetIds.TryGetValue($facet[0], [ref]$existing)) {
          if ($existing -cne $facet[1]) { throw "Processor facets '$existing' and '$($facet[1])' share filter ID $($facet[0]): $($record.Name)" }
        } else { $facetIds[$facet[0]] = $facet[1] }
      }
    }
  }
  Write-Output "Data-only specifications validated: $($seen.Count)/$($ids.Count) devices."
} finally { $document.Dispose() }
