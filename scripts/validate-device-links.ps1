<#
.SYNOPSIS
  Sanity-checks device-links.json: resolves shortened links and verifies that the
  destination actually relates to the device it is attached to.

.DESCRIPTION
  For every device in device-links.json the script:
    * YouTube links   -> fetches the video title via the oEmbed endpoint and compares
                         it with the device name.
    * Amazon links    -> follows redirects (geni.us / amzn.to / ...) and extracts the
      (affiliate)        search query (keywords / field-keywords / k) or the product
                         path, then compares it with the device name.
    * Other links     -> resolved only, the final host is reported.

  A match score is the fraction of significant device-name tokens found in the
  resolved text. Scores below -MinScore are reported as warnings.

.EXAMPLE
  ./scripts/validate-device-links.ps1
  ./scripts/validate-device-links.ps1 -DeviceId beelink-ser10-max-hx-470 -ReportPath report.md
  ./scripts/validate-device-links.ps1 -DevicesPath beelink-ser10-max-hx-470
#>
[CmdletBinding()]
param(
  [string]$DevicesPath = (Join-Path $PSScriptRoot '..\devices.json'),
  [string]$LinksPath = (Join-Path $PSScriptRoot '..\device-links.json'),
  [string]$ReportPath = (Join-Path $PSScriptRoot '..\device-links-report.md'),
  [string[]]$DeviceId,
  [double]$MinScore = 0.6,
  [int]$DelayMs = 1500,
  [switch]$SkipOther
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

# Tokens that carry no identifying information for a mini PC.
$StopWords = @(
  'mini', 'pc', 'minipc', 'desktop', 'computer', 'review', 'the', 'and', 'with', 'for',
  'new', 'best', 'is', 'a', 'of', 'this', 'it', 'ram', 'ssd', 'gb', 'tb', 'ddr5', 'ddr4'
)

# Tokens that look like a CPU designation (i7, 8845hs, n100, 285h, 9955hx3d, x7, 395).
# These are matched separately because review titles rarely spell out the CPU.
$CpuTokenPattern = '^(?:i[3579]|r[3579]|x[3-9]|ryzen|core|hx|hs|n\d{2,3}|\d{3,5}[a-z0-9]{0,4})$'

# Words that glue a CPU suffix together ("Ryzen AI Max 395", "Core Ultra 9 285H").
$CpuConnectors = @('ai', 'ultra', 'core', 'ryzen', 'intel', 'amd', 'max')

function Get-Tokens {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return @() }
  $normalized = ($Text.ToLowerInvariant() -replace '[^a-z0-9]+', ' ').Trim()
  return @($normalized -split '\s+' | Where-Object { $_ -and $_.Length -ge 2 })
}

function ConvertTo-MarkdownCell {
  param([AllowNull()][object]$Value)

  return (([string]$Value -replace "(\r\n|\r|\n)", ' ' -replace '\|', '\|').Trim())
}

function Get-MatchScore {
  param([string]$DeviceName, [string]$Candidate)

  $allTokens = @(Get-Tokens $DeviceName | Where-Object { $StopWords -notcontains $_ })
  if ($allTokens.Count -eq 0) {
    return [pscustomobject]@{
      Score = 0.0; CpuScore = $null; CodeOk = $false; ModelCode = ''
      Missing = @(); CpuMissing = @()
    }
  }

  # The CPU designation is always the trailing run of the device name
  # ("... hx 470", "... ai max 395", "... ultra 9 285h"), so split from the end.
  $splitAt = $allTokens.Count
  for ($i = $allTokens.Count - 1; $i -ge 1; $i--) {
    $token = $allTokens[$i]
    if ($token -match $CpuTokenPattern -or $token -match '^\d$' -or $CpuConnectors -contains $token) {
      $splitAt = $i
    }
    else {
      break
    }
  }

  $modelTokens = @($allTokens[0..($splitAt - 1)])
  $cpuTokens = @()
  if ($splitAt -lt $allTokens.Count) { $cpuTokens = @($allTokens[$splitAt..($allTokens.Count - 1)]) }

  # The distinctive parts of the name are the tokens containing digits (ser10, it15, z300).
  $modelCodes = @($modelTokens | Where-Object { $_ -match '\d' })

  $candidateTokens = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal)
  foreach ($candidateToken in Get-Tokens $Candidate) {
    [void]$candidateTokens.Add($candidateToken)

    # Split combined model/CPU tokens such as "hx470" without joining words
    # across boundaries, which could otherwise create false matches.
    foreach ($component in [regex]::Matches($candidateToken, '[a-z]+|\d+')) {
      [void]$candidateTokens.Add($component.Value)
    }
  }

  function Test-Token {
    param([string]$Token)
    return $candidateTokens.Contains($Token)
  }

  $missing = @()
  $modelHits = 0
  foreach ($token in $modelTokens) {
    if (Test-Token $token) { $modelHits++ } else { $missing += $token }
  }

  $cpuHits = 0
  $cpuMissing = @()
  foreach ($token in $cpuTokens) {
    if (Test-Token $token) { $cpuHits++ } else { $cpuMissing += $token }
  }

  $matchedCodes = @($modelCodes | Where-Object { Test-Token $_ })

  return [pscustomobject]@{
    Score      = if ($modelTokens.Count) { [math]::Round($modelHits / $modelTokens.Count, 2) } else { 1.0 }
    CpuScore   = if ($cpuTokens.Count) { [math]::Round($cpuHits / $cpuTokens.Count, 2) } else { $null }
    CodeOk     = ($modelCodes.Count -eq 0) -or ($matchedCodes.Count -eq $modelCodes.Count)
    ModelCode  = ($matchedCodes -join ' ')
    Missing    = $missing
    CpuMissing = $cpuMissing
  }
}

function Resolve-Url {
  param([string]$Url, [int]$MaxAttempts = 4)

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -MaximumRedirection 15 -UserAgent $UserAgent -TimeoutSec 40
      return [pscustomobject]@{
        Url    = $response.BaseResponse.RequestMessage.RequestUri.AbsoluteUri
        Status = [int]$response.StatusCode
        Error  = $null
      }
    }
    catch {
      $finalUrl = $null
      $status = $null
      $webResponse = $_.Exception.Response
      if ($webResponse) {
        try { $finalUrl = $webResponse.RequestMessage.RequestUri.AbsoluteUri } catch { }
        try { $status = [int]$webResponse.StatusCode } catch { }
      }

      # Shorteners (geni.us) and Amazon throttle aggressively - back off and retry.
      if (($status -in @(429, 503)) -and $attempt -lt $MaxAttempts) {
        Start-Sleep -Seconds ([math]::Pow(2, $attempt) * 3)
        continue
      }

      return [pscustomobject]@{
        Url    = $finalUrl
        Status = $status
        Error  = $_.Exception.Message
      }
    }
  }
}

function Get-YouTubeTitle {
  param([string]$Url)
  $endpoint = "https://www.youtube.com/oembed?url=$([uri]::EscapeDataString($Url))&format=json"
  try {
    $data = Invoke-RestMethod -Uri $endpoint -UserAgent $UserAgent -TimeoutSec 30
    return [pscustomobject]@{ Title = [string]$data.title; Author = [string]$data.author_name; Error = $null }
  }
  catch {
    return [pscustomobject]@{ Title = $null; Author = $null; Error = $_.Exception.Message }
  }
}

function Get-AmazonProductTitle {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -UserAgent $UserAgent -TimeoutSec 40
    $html = $response.Content

    if ($html -match '<span[^>]*id="productTitle"[^>]*>\s*([^<]+?)\s*</span>') {
      return [System.Web.HttpUtility]::HtmlDecode($matches[1].Trim())
    }
    if ($html -match '<title>\s*([^<]+?)\s*</title>') {
      $title = [System.Web.HttpUtility]::HtmlDecode($matches[1].Trim())
      $title = $title -replace '^Amazon\.[a-z.]+:\s*', '' -replace '\s*:\s*Amazon\.[a-z.]+.*$', ''
      return $title
    }
    return $null
  }
  catch {
    return $null
  }
}

function Get-AmazonQuery {
  param([string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) { return $null }

  $uri = [uri]$Url
  $query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
  $parts = @()
  foreach ($key in @('keywords', 'field-keywords', 'k')) {
    $value = $query[$key]
    if (-not [string]::IsNullOrWhiteSpace($value) -and $parts -notcontains $value) { $parts += $value }
  }
  if ($parts.Count -gt 0) { return ($parts -join ' | ') }

  # Product pages: /Some-Product-Name/dp/ASIN
  $match = [regex]::Match($uri.AbsolutePath, '^/([^/]+)/(?:dp|gp/product)/')
  if ($match.Success) { return ($match.Groups[1].Value -replace '-', ' ') }

  return $null
}

Add-Type -AssemblyName System.Web | Out-Null

if (-not (Test-Path -LiteralPath $LinksPath)) { throw "device-links.json not found: $LinksPath" }

# Accept -DevicesPath <device-id> as a convenient shorthand for -DeviceId. This
# keeps -DevicesPath available for a custom devices.json file when it is a path.
if (-not (Test-Path -LiteralPath $DevicesPath)) {
  if ($PSBoundParameters.ContainsKey('DevicesPath') -and -not $PSBoundParameters.ContainsKey('DeviceId')) {
    $DeviceId = @($DevicesPath)
    $DevicesPath = Join-Path $PSScriptRoot '..\devices.json'
  }
  else {
    throw "devices.json not found: $DevicesPath"
  }
}

$devices = @(Get-Content -LiteralPath $DevicesPath -Raw | ConvertFrom-Json)
$deviceNames = @{}
foreach ($device in $devices) { $deviceNames[[string]$device.id] = [string]$device.name }

$links = Get-Content -LiteralPath $LinksPath -Raw | ConvertFrom-Json
$entries = @($links.PSObject.Properties)
if ($DeviceId) {
  $unknownIds = @($DeviceId | Where-Object { $_ -notin $entries.Name })
  if ($unknownIds.Count -gt 0) {
    throw "Device ID not found in device-links.json: $($unknownIds -join ', ')"
  }
  $entries = @($entries | Where-Object { $DeviceId -contains $_.Name })
}

$results = [System.Collections.Generic.List[object]]::new()
$index = 0

foreach ($entry in $entries) {
  $index++
  $id = $entry.Name
  $name = if ($deviceNames.ContainsKey($id)) { $deviceNames[$id] } else { ($id -replace '-', ' ') }
  Write-Host "[$index/$($entries.Count)] $id" -ForegroundColor Cyan

  $deviceLinks = @($entry.Value)
  if ($deviceLinks.Count -eq 0) {
    $results.Add([pscustomobject]@{
        DeviceId = $id; DeviceName = $name; Label = '(none)'; Kind = 'none'
        Url = ''; ResolvedUrl = ''; Resolved = ''; Score = $null; CpuScore = $null
        Missing = ''; Status = 'NO LINKS'
      })
    Write-Host "    ! no links defined" -ForegroundColor Yellow
    continue
  }

  foreach ($link in $deviceLinks) {
    $label = [string]$link.label
    $url = [string]$link.url
    $kind = if ($link.PSObject.Properties.Name -contains 'kind') { [string]$link.kind } else { '' }

    $isYouTube = $kind -eq 'youtube' -or $url -match 'youtu\.?be'
    $looksAmazon = $kind -eq 'affiliate' -or $label -match '(?i)amazon'

    if (-not $isYouTube -and -not $looksAmazon -and $SkipOther) { continue }

    $resolvedUrl = ''
    $resolvedText = ''
    $status = 'OK'
    $score = $null
    $cpuScore = $null
    $missing = @()

    # Model name must match; a missing CPU code alone is only a soft warning
    # because review titles and search queries often omit it.
    function Get-Verdict {
      param($Match)
      if (-not $Match.CodeOk -or $Match.Score -lt $MinScore) {
        # A distinctive model code (hx90g, z300) is enough on its own; the brand
        # word is often dropped from Amazon queries and video titles.
        if (-not ($Match.CodeOk -and $Match.ModelCode.Length -ge 3)) { return 'MISMATCH?' }
      }
      if ($null -ne $Match.CpuScore -and $Match.CpuScore -lt 1) { return 'CPU?' }
      return 'OK'
    }

    if ($isYouTube) {
      $video = Get-YouTubeTitle -Url $url
      $resolvedUrl = $url
      if ($video.Error) {
        $status = 'UNRESOLVED'
        $resolvedText = "oEmbed failed: $($video.Error)"
      }
      else {
        $resolvedText = $video.Title
        $match = Get-MatchScore -DeviceName $name -Candidate $video.Title
        $score = $match.Score
        $cpuScore = $match.CpuScore
        $missing = @($match.Missing) + @($match.CpuMissing)
        $status = Get-Verdict $match
      }
    }
    else {
      $resolved = Resolve-Url -Url $url
      $resolvedUrl = [string]$resolved.Url
      if ($resolved.Error) {
        $status = if ($resolved.Status -in @(429, 503)) { 'THROTTLED' } else { 'UNRESOLVED' }
        $resolvedText = "HTTP $($resolved.Status): $($resolved.Error)"
      }
      elseif ($looksAmazon) {
        if ($resolvedUrl -notmatch 'amazon\.') {
          $status = 'NOT AMAZON'
          $resolvedText = ([uri]$resolvedUrl).Host
        }
        else {
          $query = Get-AmazonQuery -Url $resolvedUrl
          if ($query) {
            $resolvedText = $query
            $match = Get-MatchScore -DeviceName $name -Candidate $query
            $score = $match.Score
            $cpuScore = $match.CpuScore
            $missing = @($match.Missing) + @($match.CpuMissing)
            $status = Get-Verdict $match
          }
          else {
            # No search keywords on the link (direct /dp/ASIN product page) -
            # fetch the actual product title from the page instead.
            $title = Get-AmazonProductTitle -Url $resolvedUrl
            if (-not $title) {
              $status = 'NO QUERY'
              $resolvedText = ([uri]$resolvedUrl).AbsolutePath
            }
            else {
              $resolvedText = "[product] $title"
              $match = Get-MatchScore -DeviceName $name -Candidate $title
              $score = $match.Score
              $cpuScore = $match.CpuScore
              $missing = @($match.Missing) + @($match.CpuMissing)
              $status = Get-Verdict $match
            }
          }
        }
      }
      else {
        $resolvedText = if ($resolvedUrl) { ([uri]$resolvedUrl).Host } else { '' }
        $status = 'INFO'
      }
    }

    $color = switch ($status) {
      'OK' { 'Green' }
      'INFO' { 'DarkGray' }
      'CPU?' { 'DarkYellow' }
      default { 'Yellow' }
    }
    Write-Host ("    {0,-11} {1,-24} {2}" -f $status, $label, $resolvedText) -ForegroundColor $color

    $results.Add([pscustomobject]@{
        DeviceId    = $id
        DeviceName  = $name
        Label       = $label
        Kind        = if ($isYouTube) { 'youtube' } elseif ($looksAmazon) { 'amazon' } else { 'other' }
        Url         = $url
        ResolvedUrl = $resolvedUrl
        Resolved    = $resolvedText
        Score       = $score
        CpuScore    = $cpuScore
        Missing     = ($missing -join ' ')
        Status      = $status
      })

    if ($DelayMs -gt 0) { Start-Sleep -Milliseconds $DelayMs }
  }
}

$problems = @($results | Where-Object { $_.Status -notin @('OK', 'INFO', 'CPU?') })
$softWarnings = @($results | Where-Object { $_.Status -eq 'CPU?' })

$report = [System.Collections.Generic.List[string]]::new()
$report.Add("# Device links sanity report")
$report.Add("")
$report.Add("Generated: $((Get-Date).ToString('yyyy-MM-dd HH:mm'))  ")
$report.Add("Devices checked: $($entries.Count) | Links checked: $($results.Count) | Needs attention: $($problems.Count) | CPU-only warnings: $($softWarnings.Count)")
$report.Add("")
$report.Add("Status legend: ``OK`` model matched | ``CPU?`` model matched but CPU code absent (usually fine) | ``MISMATCH?`` model name not found | ``NO QUERY`` Amazon product page without search keywords or fetchable title | ``NOT AMAZON`` affiliate link left Amazon | ``UNRESOLVED``/``THROTTLED`` request failed. Resolved values prefixed with ``[product]`` were read from the Amazon product page title (no search query in the link).")
$report.Add("")

if ($problems.Count -gt 0) {
  $report.Add("## Needs attention")
  $report.Add("")
  $report.Add("| Device | Link | Status | Model score | Resolved | Missing tokens |")
  $report.Add("| --- | --- | --- | --- | --- | --- |")
  foreach ($row in $problems) {
    $report.Add("| $(ConvertTo-MarkdownCell $row.DeviceId) | $(ConvertTo-MarkdownCell $row.Label) | $(ConvertTo-MarkdownCell $row.Status) | $(ConvertTo-MarkdownCell $row.Score) | $(ConvertTo-MarkdownCell $row.Resolved) | $(ConvertTo-MarkdownCell $row.Missing) |")
  }
  $report.Add("")
}

if ($softWarnings.Count -gt 0) {
  $report.Add("## CPU code not mentioned (likely fine)")
  $report.Add("")
  $report.Add("| Device | Link | Resolved | Missing CPU tokens |")
  $report.Add("| --- | --- | --- | --- |")
  foreach ($row in $softWarnings) {
    $report.Add("| $(ConvertTo-MarkdownCell $row.DeviceId) | $(ConvertTo-MarkdownCell $row.Label) | $(ConvertTo-MarkdownCell $row.Resolved) | $(ConvertTo-MarkdownCell $row.Missing) |")
  }
  $report.Add("")
}

$report.Add("## All links")
$report.Add("")
foreach ($group in $results | Group-Object DeviceId) {
  $report.Add("### $($group.Name)")
  $report.Add("")
  $report.Add("| Link | Kind | Status | Model score | Resolved |")
  $report.Add("| --- | --- | --- | --- | --- |")
  foreach ($row in $group.Group) {
    $report.Add("| $(ConvertTo-MarkdownCell $row.Label) | $(ConvertTo-MarkdownCell $row.Kind) | $(ConvertTo-MarkdownCell $row.Status) | $(ConvertTo-MarkdownCell $row.Score) | $(ConvertTo-MarkdownCell $row.Resolved) |")
  }
  $report.Add("")
}

Set-Content -LiteralPath $ReportPath -Value ($report -join "`n") -Encoding UTF8

Write-Host ""
Write-Host "Links checked : $($results.Count)"
Write-Host "Needs attention: $($problems.Count)" -ForegroundColor $(if ($problems.Count -gt 0) { 'Yellow' } else { 'Green' })
Write-Host "CPU-only warnings: $($softWarnings.Count)" -ForegroundColor DarkYellow
Write-Host "Report written : $ReportPath"

if ($problems.Count -gt 0) { exit 1 }
