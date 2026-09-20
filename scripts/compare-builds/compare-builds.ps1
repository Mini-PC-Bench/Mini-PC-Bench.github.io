<#
.SYNOPSIS
  Builds two git refs of the site, serves them on separate ports and compares the
  rendered output (DOM, text, table data, control counts, screenshots).

.EXAMPLE
  pwsh ./scripts/compare-builds/compare-builds.ps1 -Before master -After feature/abc

.EXAMPLE
  pwsh ./scripts/compare-builds/compare-builds.ps1 -Before master -After HEAD -KeepServers
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$Before,
  [Parameter(Mandatory)][string]$After,
  [string]$OutputDir = "./compare-out",
  [int]$BeforePort = 0,
  [int]$AfterPort = 0,
  [switch]$Minify,
  [switch]$FailOnScreenshotDiff,
  [switch]$KeepServers,
  [switch]$SkipOpenReport
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$scriptDir = $PSScriptRoot
$projectName = "minibench-compare"

function Invoke-Native {
  param([string]$Command, [string[]]$Arguments, [string]$WorkingDirectory = $repoRoot)

  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) {
      throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Resolve-GitRef {
  param([string]$Ref)

  $sha = & git -C $repoRoot rev-parse --verify --quiet "$Ref^{commit}"
  if ($LASTEXITCODE -ne 0 -or -not $sha) { throw "Cannot resolve git ref '$Ref'." }
  return $sha.Trim()
}

function New-SiteBuild {
  param([string]$Ref, [string]$Sha, [string]$TargetDir)

  Write-Host "==> Building '$Ref' ($($Sha.Substring(0,8)))" -ForegroundColor Cyan

  $worktree = Join-Path $TargetDir "src"
  $site = Join-Path $TargetDir "site"
  $buildChangelog = Join-Path $worktree 'scripts/ci/build-changelog.ps1'
  $minifyAssets = Join-Path $worktree 'scripts/ci/minify-assets.ps1'
  New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

  Invoke-Native git @('-C', $repoRoot, 'worktree', 'add', '--detach', '--force', $worktree, $Sha)

  try {
    # changelog.html is generated, not committed.
    if (-not (Test-Path -LiteralPath $buildChangelog -PathType Leaf)) {
      throw "Build script '$buildChangelog' is missing in ref '$Ref'."
    }
    Invoke-Native pwsh @('-NoProfile', '-File', $buildChangelog) -WorkingDirectory $worktree

    New-Item -ItemType Directory -Force -Path $site | Out-Null
    foreach ($rawPath in Get-Content (Join-Path $worktree 'publish-files.txt')) {
      $relative = $rawPath.Trim()
      if (-not $relative) { continue }
      $source = Join-Path $worktree $relative
      if (-not (Test-Path $source)) { throw "Published path '$relative' missing in ref '$Ref'." }
      $destination = Join-Path $site $relative
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
      Copy-Item $source $destination -Recurse -Force
    }

    if ($Minify) {
      if (-not (Test-Path -LiteralPath $minifyAssets -PathType Leaf)) {
        throw "Minification script '$minifyAssets' is missing in ref '$Ref'."
      }
      Invoke-Native pwsh @('-NoProfile', '-File', $minifyAssets, '-SiteDir', $site) -WorkingDirectory $worktree
    }
  } finally {
    Invoke-Native git @('-C', $repoRoot, 'worktree', 'remove', '--force', $worktree)
  }

  return (Resolve-Path $site).Path
}

function Test-PortBindable {
  param([int]$Port)

  # Windows excluded port ranges (Hyper-V/WinNAT) fail only at bind time.
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
  try {
    $listener.Start()
    $listener.Stop()
    return $true
  } catch {
    return $false
  }
}

function Get-FreePort {
  param([int]$Preferred)

  if ($Preferred -gt 0) {
    if (Test-PortBindable -Port $Preferred) { return $Preferred }
    throw "Port $Preferred is not available on this machine."
  }
  foreach ($candidate in 8090..8199) {
    if (Test-PortBindable -Port $candidate) { return $candidate }
  }
  throw "No free port found in range 8090-8199."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker is required but was not found on PATH."
}

$beforeSha = Resolve-GitRef $Before
$afterSha = Resolve-GitRef $After
if ($beforeSha -eq $afterSha) {
  Write-Warning "'$Before' and '$After' point at the same commit - the comparison will trivially pass."
}

$outputRoot = Join-Path $repoRoot ($OutputDir -replace '^\./', '')
if (Test-Path $outputRoot) { Remove-Item $outputRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$beforeSite = New-SiteBuild -Ref $Before -Sha $beforeSha -TargetDir (Join-Path $outputRoot 'build-before')
$afterSite = New-SiteBuild -Ref $After -Sha $afterSha -TargetDir (Join-Path $outputRoot 'build-after')

$env:BEFORE_DIR = $beforeSite
$env:AFTER_DIR = $afterSite
$BeforePort = Get-FreePort -Preferred $BeforePort
$AfterPort = Get-FreePort -Preferred (&{ if ($AfterPort -gt 0) { $AfterPort } else { $BeforePort + 1 } })
$env:BEFORE_PORT = "$BeforePort"
$env:AFTER_PORT = "$AfterPort"
$env:OUTPUT_DIR = $outputRoot
$env:BEFORE_LABEL = "$Before@$($beforeSha.Substring(0,8))"
$env:AFTER_LABEL = "$After@$($afterSha.Substring(0,8))"
$env:FAIL_ON_SCREENSHOT_DIFF = if ($FailOnScreenshotDiff) { "1" } else { "0" }

$composeArgs = @('compose', '-p', $projectName, '-f', 'docker-compose.compare.yml')

Write-Host "==> Serving '$Before' on http://127.0.0.1:$BeforePort and '$After' on http://127.0.0.1:$AfterPort" -ForegroundColor Cyan

$comparisonFailed = $false
Push-Location $scriptDir
try {
  & docker @composeArgs up --build --abort-on-container-exit --exit-code-from compare
  if ($LASTEXITCODE -ne 0) { $comparisonFailed = $true }
} finally {
  if ($KeepServers) {
    Write-Host "Servers left running. Stop them with: docker compose -p $projectName -f scripts/compare-builds/docker-compose.compare.yml down" -ForegroundColor Yellow
  } else {
    & docker @composeArgs down --remove-orphans | Out-Null
  }
  Pop-Location
}

$report = Join-Path $outputRoot 'report.html'
if (Test-Path $report) {
  Write-Host "Report: $report"
  if (-not $SkipOpenReport -and -not $env:CI) { Invoke-Item $report }
}

if ($comparisonFailed) {
  Write-Host "Differences detected between '$Before' and '$After'." -ForegroundColor Red
  exit 1
}

Write-Host "'$Before' and '$After' render identically." -ForegroundColor Green
