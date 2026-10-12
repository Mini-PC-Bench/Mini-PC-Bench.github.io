#requires -Version 7.4
<#
  Refreshes recommendations.json from its YouTube playlist.
  Run: pwsh ./scripts/source/update-recommendations.ps1
  Supply YOUTUBE_API_KEY in the environment, or use -ApiKey.
  Run the offline regression check with -SelfTest.
#>
[CmdletBinding()]
param(
  [string]$DataPath = (Join-Path $PSScriptRoot '../../recommendations.json'),
  [string]$ApiKey = $env:YOUTUBE_API_KEY,
  [switch]$SelfTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Save-Recommendations {
  param([string]$Path, [string]$Content)

  $original = Get-Item -LiteralPath $Path
  $temporaryPath = "$($original.FullName).$([guid]::NewGuid().ToString('N')).tmp"
  try {
    [IO.File]::WriteAllText($temporaryPath, $Content, [Text.UTF8Encoding]::new($false))
    if ($IsWindows) {
      Set-Acl -LiteralPath $temporaryPath -AclObject (Get-Acl -LiteralPath $original.FullName)
    }
    else {
      & chown ('{0}:{1}' -f $original.UnixStat.UserId, $original.UnixStat.GroupId) $temporaryPath
      if ($LASTEXITCODE -ne 0) { throw 'Cannot preserve file ownership; existing data has not been changed' }
      [IO.File]::SetUnixFileMode($temporaryPath, [IO.File]::GetUnixFileMode($original.FullName))
    }
    [IO.File]::Move($temporaryPath, $original.FullName, $true)
  }
  finally {
    if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force }
  }
}

function Invoke-PlaylistPage {
  param([System.Collections.IDictionary]$Query)

  try {
    $response = Invoke-WebRequest -Uri 'https://www.googleapis.com/youtube/v3/playlistItems' -Method Get -Body $Query -TimeoutSec 30 -SkipHttpErrorCheck -Verbose:$false
  }
  catch {
    throw 'YouTube request failed; existing data has not been changed'
  }
  if ($response.StatusCode -ne 200) { throw "YouTube API returned HTTP $($response.StatusCode); check the API key and quota" }
  try { return ($response.Content | ConvertFrom-Json -AsHashtable) }
  catch { throw 'Invalid playlist JSON response' }
}

function Get-Recommendations {
  param(
    [System.Collections.IDictionary]$Previous,
    [string]$Key,
    [scriptblock]$Request = { param($Query) Invoke-PlaylistPage -Query $Query }
  )

  if ($Previous['playlistId'] -isnot [string] -or $Previous['playlistId'] -cnotmatch '^PL[A-Za-z0-9_-]+$' -or $Previous['videos'] -isnot [array]) { throw 'Invalid existing recommendations model' }
  $entries = [Collections.Generic.List[object]]::new()
  $seenTokens = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $pageToken = ''
  $total = $null
  do {
    $query = @{ part = 'snippet,contentDetails'; playlistId = $Previous['playlistId']; maxResults = '50'; key = $Key }
    if ($pageToken) { $query.pageToken = $pageToken }
    $page = & $Request $query
    if ($page -isnot [System.Collections.IDictionary] -or $page['items'] -isnot [array] -or $page['pageInfo'] -isnot [System.Collections.IDictionary]) { throw 'Invalid playlist response' }
    $count = $page['pageInfo']['totalResults']
    if (($count -isnot [int] -and $count -isnot [long]) -or $count -lt 0) { throw 'Invalid playlist count' }
    if ($null -eq $total) { $total = $count }
    if ($total -ne $count) { throw 'Playlist changed during refresh; run again' }
    foreach ($entry in $page['items']) { $entries.Add($entry) }
    $pageToken = $page['nextPageToken']
    if ($pageToken -and -not $seenTokens.Add($pageToken)) { throw 'Repeated playlist page token' }
  } while ($pageToken)
  if ($entries.Count -ne $total) { throw 'Incomplete playlist response; existing data has not been changed' }

  $videos = [Collections.Generic.Dictionary[string, object]]::new([StringComparer]::Ordinal)
  $skipped = [Collections.Generic.List[string]]::new()
  foreach ($entry in $entries) {
    $title = $entry['snippet']['title']
    if ($title -isnot [string] -or [string]::IsNullOrWhiteSpace($title)) { throw 'Missing video title' }
    # ponytail: curation follows the current series titles; extend this predicate if Robtech changes the naming.
    if ($title -match '\breasons?\b' -or ($title -notmatch '\btop\s+\d+\b.*\bmini\s*pcs?\b' -and $title -notmatch '^which mini pc should you buy\?')) {
      $skipped.Add($title)
      continue
    }
    $id = $entry['contentDetails']['videoId']
    $published = $entry['contentDetails']['videoPublishedAt']
    $date = [datetimeoffset]::MinValue
    if ($published -is [datetime] -or $published -is [datetimeoffset]) { $date = [datetimeoffset]$published }
    elseif ($published -isnot [string] -or -not [datetimeoffset]::TryParse($published, [cultureinfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$date)) { throw "Missing video metadata for $title" }
    if ($id -isnot [string] -or $id -cnotmatch '^[A-Za-z0-9_-]{11}$') { throw "Missing video metadata for $title" }
    $publishedAt = $date.UtcDateTime.ToString('yyyy-MM-dd', [cultureinfo]::InvariantCulture)
    $yearMatch = [regex]::Match($title, '\b20\d{2}\b')
    $year = if ($yearMatch.Success) { [int]$yearMatch.Value } else { [int]$publishedAt.Substring(0, 4) }
    $video = [ordered]@{ id = $id; title = $title.Trim(); year = $year; publishedAt = $publishedAt }
    $old = $Previous['videos'] | Where-Object { $_['id'] -ceq $id } | Select-Object -First 1
    if ($null -ne $old -and $null -ne $old['startSeconds']) {
      $start = $old['startSeconds']
      if (($start -isnot [int] -and $start -isnot [long]) -or $start -lt 0 -or $start -gt 9007199254740991) { throw "Invalid start time for $id" }
      $video.startSeconds = $start
    }
    $videos[$id] = $video
  }
  if ($videos.Count -eq 0) { throw 'No recommendation lists found; refusing to replace existing data' }
  return @{
    data = [ordered]@{ playlistId = $Previous['playlistId']; videos = @($videos.Values | Sort-Object -Property @{ Expression = { $_.year }; Descending = $true }, @{ Expression = { $_.publishedAt }; Descending = $true }) }
    skipped = $skipped.ToArray()
  }
}

function Invoke-SelfTest {
  function Assert-Condition([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw "Self-test failed: $Message" }
  }
  function Assert-Throws([scriptblock]$Action, [string]$Pattern) {
    $message = ''
    try { & $Action | Out-Null } catch { $message = $_.Exception.Message }
    Assert-Condition ($message -match $Pattern) "Expected failure matching $Pattern; got $message"
  }
  function New-TestItem($Id, $Title, $Date = '2025-11-28T12:00:00Z') {
    return @{ snippet = @{ title = $Title }; contentDetails = @{ videoId = $Id; videoPublishedAt = $Date } }
  }
  $previous = @{ playlistId = 'PLtest'; videos = @(@{ id = 'AymVXWyJ34A'; startSeconds = 165 }) }
  $fixtureEntries = @(
    (New-TestItem 'AymVXWyJ34A' 'Top 5 Mini PCs Right Now (2026)' '2026-05-19T12:00:00Z'),
    (New-TestItem '8-H2Fd9TSZk' 'Which Mini PC Should You Buy? (2026)'),
    (New-TestItem 'LSnCIl3Q8t8' 'Top 5 Best Mini PCs Under $500'),
    (New-TestItem 'N1Ana_j3dks' 'Top 10 Reasons NOT to Buy A Mini PC'),
    (New-TestItem 'R7n1PH-h_OM' 'Top 10 Reasons to Buy A Mini PC'),
    (New-TestItem 'fNmqfQFBFrg' 'A single mini PC review'),
    (New-TestItem 'private0000' 'Private video')
  )
  $requests = [Collections.Generic.List[object]]::new()
  $result = Get-Recommendations -Previous $previous -Key 'test-key' -Request {
    param($Query)
    $requests.Add($Query)
    if ($Query['pageToken'] -eq 'next') { return @{ items = @($fixtureEntries[2..6]); pageInfo = @{ totalResults = 7 } } }
    return @{ items = @($fixtureEntries[0..1]); pageInfo = @{ totalResults = 7 }; nextPageToken = 'next' }
  }
  Assert-Condition ($requests.Count -eq 2 -and $requests[1]['pageToken'] -eq 'next') 'pagination'
  Assert-Condition (($result.data.videos.id -join ',') -ceq 'AymVXWyJ34A,8-H2Fd9TSZk,LSnCIl3Q8t8') 'filtering and newest-first ordering'
  Assert-Condition (($result.data.videos.year -join ',') -eq '2026,2026,2025') 'title year and publication-year fallback'
  Assert-Condition ($result.data.videos[0].startSeconds -eq 165 -and $result.data.videos[1].publishedAt -eq '2025-11-28') 'timestamp and publication date'
  Assert-Condition ($result.skipped.Count -eq 4 -and $previous.videos[0].startSeconds -eq 165) 'skipped entries and unchanged input'
  $parsedPage = @{ items = @((New-TestItem 'AymVXWyJ34A' 'Top 5 Mini PCs (2026)' '2025-11-28T23:45:00-08:00')); pageInfo = @{ totalResults = 1 } } | ConvertTo-Json -Depth 10 | ConvertFrom-Json -AsHashtable
  $parsedResult = Get-Recommendations $previous 'test-key' { $parsedPage }
  Assert-Condition ($parsedResult.data.videos.Count -eq 1 -and $parsedResult.data.videos[0].publishedAt -eq '2025-11-29') 'single-item arrays and UTC dates decoded from API JSON'
  Assert-Throws { Get-Recommendations $previous 'test-key' { throw 'HTTP 403' } } 'HTTP 403'
  Assert-Throws { Get-Recommendations $previous 'test-key' { @{ items = @(); pageInfo = @{ totalResults = 0 } } } } 'No recommendation'
  Assert-Throws { Get-Recommendations $previous 'test-key' { @{ items = @($fixtureEntries[0]); pageInfo = @{ totalResults = 2 } } } } 'Incomplete'
  Assert-Throws { Get-Recommendations $previous 'test-key' { @{ items = @((New-TestItem 'invalid' 'Top 5 Mini PCs')); pageInfo = @{ totalResults = 1 } } } } 'Missing video metadata'
  Assert-Throws { Get-Recommendations $previous 'test-key' { @{ items = @($fixtureEntries[0]); pageInfo = @{ totalResults = 2 }; nextPageToken = 'repeat' } } } 'Repeated playlist page token'

  $directory = Join-Path ([IO.Path]::GetTempPath()) ('recommendations-test-' + [guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory($directory)
  try {
    $path = Join-Path $directory 'recommendations.json'
    [IO.File]::WriteAllText($path, 'old data')
    if (-not $IsWindows) {
      [IO.File]::SetUnixFileMode($path, [IO.UnixFileMode]0x1A0)
      if ((& id -u) -eq '0') {
        & chown '1000:1000' $path
        if ($LASTEXITCODE -ne 0) { throw 'Cannot prepare ownership regression check' }
      }
      $before = (Get-Item -LiteralPath $path).UnixStat
    }
    else { $before = (Get-Acl -LiteralPath $path).Sddl }
    Save-Recommendations -Path $path -Content 'new data'
    Assert-Condition ([IO.File]::ReadAllText($path) -ceq 'new data') 'saved content'
    if (-not $IsWindows) {
      $after = (Get-Item -LiteralPath $path).UnixStat
      Assert-Condition ($after.UserId -eq $before.UserId -and $after.GroupId -eq $before.GroupId -and $after.Mode -eq $before.Mode) 'saved ownership and permissions'
    }
    else { Assert-Condition ((Get-Acl -LiteralPath $path).Sddl -ceq $before) 'saved permissions' }
    Assert-Condition (@(Get-ChildItem -LiteralPath $directory).Count -eq 1) 'temporary-file cleanup'
  }
  finally { Remove-Item -LiteralPath $directory -Recurse -Force }
  Write-Host 'Passed: pagination, list filtering, year inference, ordering, timestamps, failed/empty/incomplete refreshes, and saved file ownership/permissions'
}

if ($SelfTest) { Invoke-SelfTest; return }
if ([string]::IsNullOrWhiteSpace($ApiKey)) { throw 'Set YOUTUBE_API_KEY or supply -ApiKey before refreshing' }
$originalContent = Get-Content -LiteralPath $DataPath -Raw
$previous = $originalContent | ConvertFrom-Json -AsHashtable
$result = Get-Recommendations -Previous $previous -Key $ApiKey
$content = ($result.data | ConvertTo-Json -Depth 10).Replace("`r`n", "`n") + "`n"
if ($content -ceq $originalContent) { Write-Host 'Recommendations are already up to date'; return }
Save-Recommendations -Path $DataPath -Content $content
Write-Host "Updated $($result.data.videos.Count) recommendation videos; skipped $($result.skipped.Count) other playlist entries"
$result.skipped | ForEach-Object { Write-Host "Skipped: $_" }
