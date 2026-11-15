[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$SpecsRepo,
  [string]$Root = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-UniquePullKeys([System.Text.Json.JsonElement]$Element) {
  if ($Element.ValueKind -eq 'Object') {
    $keys = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($property in $Element.EnumerateObject()) {
      if (-not $keys.Add($property.Name)) { throw "Duplicate JSON key: $($property.Name)" }
      Assert-UniquePullKeys $property.Value
    }
  } elseif ($Element.ValueKind -eq 'Array') {
    foreach ($item in $Element.EnumerateArray()) { Assert-UniquePullKeys $item }
  }
}

function Get-CpuFacet([string]$Model) {
  if ([string]::IsNullOrWhiteSpace($Model)) { return @{ Brand = $null; Family = $null; Unknown = $false } }
  $normalized = [regex]::Replace($Model.Trim(), '\s+', ' ')
  [void]($normalized -match '^(?<brand>\S+)')
  $brand = $Matches.brand
  if ($brand -ceq 'AMD') {
    $family = if ($normalized -match '^AMD Ryzen AI Max\+?(?:\s|$)') { 'Ryzen AI Max' }
      elseif ($normalized -match '^AMD Ryzen AI (?<tier>\d+)(?:\s|$)') { "Ryzen AI $($Matches.tier)" }
      elseif ($normalized -match '^AMD Ryzen (?<tier>\d+)(?:\s|$)') { "Ryzen $($Matches.tier)" }
      else { 'Other' }
  } elseif ($brand -ceq 'Intel') {
    $family = if ($normalized -match '^Intel Core Ultra (?<tier>X?\d+)(?:\s|$)') { "Core Ultra $($Matches.tier)" }
      elseif ($normalized -match '^Intel Core i(?<tier>\d+)(?:-|\s|$)') { "Core i$($Matches.tier)" }
      elseif ($normalized -match '^Intel Core (?<tier>\d+)(?:\s|$)') { "Core $($Matches.tier)" }
      elseif ($normalized -match '^Intel Processor N\d+(?:\s|$)') { 'Processor N' }
      else { 'Other' }
  } else {
    $family = 'Other'
  }
  return @{ Brand = $brand; Family = $family; Unknown = $family -eq 'Other' }
}

$Root = [IO.Path]::GetFullPath($Root)
$SpecsRepo = [IO.Path]::GetFullPath($SpecsRepo)
if ($Root -eq $SpecsRepo) { throw 'Research and rendering repositories must be different directories' }
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('spec-pull-' + [guid]::NewGuid())
$research = $null
$schema = $null
$writer = $null
$stream = $null
$files = @()
try {
  [void][IO.Directory]::CreateDirectory($temporary)
  $encoding = [Text.UTF8Encoding]::new($false, $true)
  $research = [System.Text.Json.JsonDocument]::Parse([IO.File]::ReadAllText((Join-Path $SpecsRepo 'device-specs.json'), $encoding))
  $schemaText = [IO.File]::ReadAllText((Join-Path $SpecsRepo 'schemas/device-specs-public.schema.json'), $encoding)
  $schema = [System.Text.Json.JsonDocument]::Parse($schemaText)
  Assert-UniquePullKeys $research.RootElement
  Assert-UniquePullKeys $schema.RootElement
  if ($research.RootElement.ValueKind -ne 'Object') { throw 'Research specifications must be an object keyed by device ID' }
  $fields = @($schema.RootElement.GetProperty('additionalProperties').GetProperty('properties').EnumerateObject() | ForEach-Object Name | Where-Object { $_ -notin @('cpu_brand', 'cpu_family') })
  if ($fields -contains 'evidence') { throw 'Public schema must not expose evidence' }
  $stream = [IO.MemoryStream]::new()
  $options = [System.Text.Json.JsonWriterOptions]::new()
  $options.Indented = $true
  $options.Encoder = [System.Text.Encodings.Web.JavaScriptEncoder]::UnsafeRelaxedJsonEscaping
  $writer = [System.Text.Json.Utf8JsonWriter]::new($stream, $options)
  $writer.WriteStartObject()
  foreach ($device in ($research.RootElement.EnumerateObject() | Sort-Object Name -CaseSensitive)) {
    if ($device.Value.ValueKind -ne 'Object') { throw "Invalid research record: $($device.Name)" }
    $writer.WritePropertyName($device.Name)
    $writer.WriteStartObject()
    foreach ($field in $fields) {
      $value = [System.Text.Json.JsonElement]::new()
      if (-not $device.Value.TryGetProperty($field, [ref]$value)) { continue }
      if ($value.ValueKind -ne 'Null') {
        $evidence = [System.Text.Json.JsonElement]::new()
        $fact = [System.Text.Json.JsonElement]::new()
        $status = [System.Text.Json.JsonElement]::new()
        if (-not $device.Value.TryGetProperty('evidence', [ref]$evidence) -or $evidence.ValueKind -ne 'Object' -or -not $evidence.TryGetProperty($field, [ref]$fact) -or $fact.ValueKind -ne 'Object' -or -not $fact.TryGetProperty('status', [ref]$status) -or $status.ValueKind -ne 'String' -or $status.GetString() -cne 'reviewed') {
          throw "Missing or unreviewed evidence: $($device.Name).$field"
        }
      }
      $writer.WritePropertyName($field)
      $value.WriteTo($writer)
    }
    $modelElement = [System.Text.Json.JsonElement]::new()
    $model = if ($device.Value.TryGetProperty('cpu_model', [ref]$modelElement) -and $modelElement.ValueKind -eq 'String') { $modelElement.GetString() } else { $null }
    $facet = Get-CpuFacet $model
    if ($facet.Unknown) { Write-Warning "Unclassified CPU family '$model' for $($device.Name); exported under '$($facet.Brand) / Other'." }
    $writer.WritePropertyName('cpu_brand')
    if ($null -eq $facet.Brand) { $writer.WriteNullValue() } else { $writer.WriteStringValue($facet.Brand) }
    $writer.WritePropertyName('cpu_family')
    if ($null -eq $facet.Family) { $writer.WriteNullValue() } else { $writer.WriteStringValue($facet.Family) }
    $writer.WriteEndObject()
  }
  $writer.WriteEndObject()
  $writer.Flush()
  $specsPath = Join-Path $temporary 'device-specs.json'
  $schemaPath = Join-Path $temporary 'device-specs-public.schema.json'
  [IO.File]::WriteAllText($specsPath, $encoding.GetString($stream.ToArray()) + "`n", [Text.UTF8Encoding]::new($false))
  $schemaOutput = $schemaText | ConvertFrom-Json -AsHashtable
  $properties = $schemaOutput.additionalProperties.properties
  foreach ($field in @('cpu_brand', 'cpu_family')) {
    if (-not $properties.Contains($field)) {
      $properties[$field] = @{ type = @('string', 'null'); minLength = 1 }
    }
  }
  [IO.File]::WriteAllText($schemaPath, ($schemaOutput | ConvertTo-Json -Depth 100) + "`n", [Text.UTF8Encoding]::new($false))
  & (Join-Path $PSScriptRoot '../ci/validate-device-specs.ps1') -SpecsPath $specsPath -DevicesPath (Join-Path $Root 'devices.json') -SchemaPath $schemaPath

  # Prepare both files before replacing either; restore the previous pair if installation fails.
  $files = @(
    @{ Source = $specsPath; Destination = (Join-Path $Root 'device-specs.json') },
    @{ Source = $schemaPath; Destination = (Join-Path $Root 'schemas/device-specs-public.schema.json') }
  )
  foreach ($file in $files) {
    $file.Existed = [IO.File]::Exists($file.Destination)
    $file.Original = if ($file.Existed) { ,[IO.File]::ReadAllBytes($file.Destination) } else { $null }
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($file.Destination))
    $file.Prepared = $file.Destination + '.' + [guid]::NewGuid() + '.tmp'
    [IO.File]::Copy($file.Source, $file.Prepared)
    $file.Installed = $false
  }
  try {
    foreach ($file in $files) { [IO.File]::Move($file.Prepared, $file.Destination, $true); $file.Installed = $true }
  } catch {
    foreach ($file in $files) {
      if (-not $file.Installed) { continue }
      if ($file.Existed) { [IO.File]::WriteAllBytes($file.Destination, $file.Original) } else { [IO.File]::Delete($file.Destination) }
    }
    throw
  }
  Write-Output 'Pulled reviewed specifications and generated CPU facets. Research metadata stripped; source repository unchanged.'
} finally {
  foreach ($file in $files) { if ($file.ContainsKey('Prepared') -and [IO.File]::Exists($file.Prepared)) { [IO.File]::Delete($file.Prepared) } }
  if ($writer) { $writer.Dispose() }
  if ($stream) { $stream.Dispose() }
  if ($research) { $research.Dispose() }
  if ($schema) { $schema.Dispose() }
  if ([IO.Directory]::Exists($temporary)) { [IO.Directory]::Delete($temporary, $true) }
}
