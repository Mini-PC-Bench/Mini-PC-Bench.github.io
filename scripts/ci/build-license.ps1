<#
  Converts LICENSE into a static license.html page styled like the rest of the site.
  Run this after editing LICENSE:  pwsh ./scripts/ci/build-license.ps1
#>
param(
  [string]$SourcePath = "./LICENSE",
  [string]$TemplatePath = "./license.template.html",
  [string]$OutputPath = "./license.html"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Convert-InlineText {
  param([string]$Text)

  $escaped = [System.Net.WebUtility]::HtmlEncode($Text)
  $escaped = [regex]::Replace($escaped, '([\w.+-]+@[\w-]+\.[\w.-]+)', '<a href="mailto:$1">$1</a>')
  return $escaped
}

function Convert-HeadingText {
  param([string]$Text)

  $textInfo = (Get-Culture).TextInfo
  $titled = $textInfo.ToTitleCase($Text.ToLowerInvariant())
  return [System.Net.WebUtility]::HtmlEncode($titled)
}

function Convert-LicenseToHtml {
  param([string[]]$Lines)

  # Blocks are separated by blank lines, mirroring how the LICENSE is authored.
  $blocks = New-Object System.Collections.Generic.List[string[]]
  $current = New-Object System.Collections.Generic.List[string]
  foreach ($line in $Lines) {
    if ($line.Trim() -eq '') {
      if ($current.Count -gt 0) { $blocks.Add($current.ToArray()); $current.Clear() }
      continue
    }
    $current.Add($line.Trim())
  }
  if ($current.Count -gt 0) { $blocks.Add($current.ToArray()) }

  $html = New-Object System.Text.StringBuilder
  $isFirstBlock = $true

  foreach ($block in $blocks) {
    $headingMatch = $block.Count -eq 1 -and $block[0] -match '^(\d+)\.\s+(.*)$'
    $isBulletList = @($block | Where-Object { $_ -notmatch '^\*\s+' }).Count -eq 0

    if ($isFirstBlock) {
      [void]$html.AppendLine("<h2>$(Convert-HeadingText $block[0])</h2>")
    }
    elseif ($headingMatch) {
      [void]$html.AppendLine("<h2>$($Matches[1]). $(Convert-HeadingText $Matches[2])</h2>")
    }
    elseif ($isBulletList) {
      [void]$html.AppendLine('<ul>')
      foreach ($item in $block) {
        [void]$html.AppendLine("<li>$(Convert-InlineText ($item -replace '^\*\s+', ''))</li>")
      }
      [void]$html.AppendLine('</ul>')
    }
    else {
      [void]$html.AppendLine("<p>$(Convert-InlineText ($block -join ' '))</p>")
    }

    $isFirstBlock = $false
  }

  return $html.ToString()
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "License source not found: $SourcePath"
}

if (-not (Test-Path -LiteralPath $TemplatePath)) {
  throw "License template not found: $TemplatePath"
}

$lines = Get-Content -LiteralPath $SourcePath
$body = Convert-LicenseToHtml -Lines $lines

$template = Get-Content -LiteralPath $TemplatePath -Raw
$contentToken = '{{LICENSE_CONTENT}}'

if (-not $template.Contains($contentToken)) {
  throw "License template must contain $contentToken"
}

$output = $template.Replace($contentToken, $body.TrimEnd())

Set-Content -LiteralPath $OutputPath -Value $output -NoNewline
Write-Host "Wrote $OutputPath from $SourcePath using $TemplatePath"
