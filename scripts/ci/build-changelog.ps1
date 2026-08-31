<#
  Converts CHANGELOG.md into a static changelog.html page styled like the rest of the site.
  Run this after editing CHANGELOG.md:  pwsh ./scripts/ci/build-changelog.ps1
#>
param(
  [string]$SourcePath = "./CHANGELOG.md",
  [string]$TemplatePath = "./changelog.template.html",
  [string]$OutputPath = "./changelog.html"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Convert-InlineMarkdown {
  param([string]$Text)

  $escaped = [System.Net.WebUtility]::HtmlEncode($Text)
  $escaped = [regex]::Replace($escaped, '\*\*(.+?)\*\*', '<strong>$1</strong>')
  $escaped = [regex]::Replace($escaped, '`(.+?)`', '<code>$1</code>')
  $escaped = [regex]::Replace($escaped, '\[(.+?)\]\((.+?)\)', '<a href="$2" target="_blank" rel="noopener">$1</a>')
  return $escaped
}

function Convert-MarkdownToHtml {
  param([string[]]$Lines)

  $html = New-Object System.Text.StringBuilder
  $inList = $false

  foreach ($line in $Lines) {
    $trimmed = $line.Trim()

    if ($trimmed -eq '') {
      if ($inList) { [void]$html.AppendLine('</ul>'); $inList = $false }
      continue
    }

    if ($trimmed -match '^##\s+(.*)$') {
      if ($inList) { [void]$html.AppendLine('</ul>'); $inList = $false }
      $heading = $Matches[1]
      $class = if ($heading -match '^\d{4}-\d{2}-\d{2}(\s+(?:[–-]|to)\s+\d{4}-\d{2}-\d{2})?$') { ' class="changelog-date"' } else { '' }
      [void]$html.AppendLine("<h2$class>$(Convert-InlineMarkdown $heading)</h2>")
      continue
    }

    if ($trimmed -match '^#\s+(.*)$') {
      # Top-level title is rendered by the page header, skip it here.
      continue
    }

    if ($trimmed -match '^-\s+(.*)$') {
      if (-not $inList) { [void]$html.AppendLine('<ul>'); $inList = $true }
      [void]$html.AppendLine("<li>$(Convert-InlineMarkdown $Matches[1])</li>")
      continue
    }

    if ($inList) { [void]$html.AppendLine('</ul>'); $inList = $false }
    [void]$html.AppendLine("<p>$(Convert-InlineMarkdown $trimmed)</p>")
  }

  if ($inList) { [void]$html.AppendLine('</ul>') }
  return $html.ToString()
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Changelog source not found: $SourcePath"
}

if (-not (Test-Path -LiteralPath $TemplatePath)) {
  throw "Changelog template not found: $TemplatePath"
}

$lines = Get-Content -LiteralPath $SourcePath
$body = Convert-MarkdownToHtml -Lines $lines

$template = Get-Content -LiteralPath $TemplatePath -Raw
$contentToken = '{{CHANGELOG_CONTENT}}'

if (-not $template.Contains($contentToken)) {
  throw "Changelog template must contain $contentToken"
}

$output = $template.Replace($contentToken, $body.TrimEnd())

Set-Content -LiteralPath $OutputPath -Value $output -NoNewline
Write-Host "Wrote $OutputPath from $SourcePath using $TemplatePath"
