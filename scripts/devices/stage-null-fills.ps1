# stage-null-fills.ps1
#
# Usage:
#
#   ./scripts/devices/stage-null-fills.ps1 -JsonPath ./devices.json
#
# Stages only:
#
#   "property": null
# ->
#   "property": value
#
# Everything else stays unstaged.
#
# Existing staged changes in the target file are intentionally rejected.

[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [string]$JsonPath
)

$ErrorActionPreference = 'Stop'


# ============================================================
# Git helpers
# ============================================================

function Get-GitOutput {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    $output = & git @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }

    return @($output | ForEach-Object { [string]$_ })
}


# ============================================================
# Resolve repository
# ============================================================

$repoRoot = (
    Get-GitOutput @(
        'rev-parse',
        '--show-toplevel'
    ) | Select-Object -First 1
).Trim()

$fullPath = [IO.Path]::GetFullPath($JsonPath)

if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    throw "File not found: $fullPath"
}

$relativePath = [IO.Path]::GetRelativePath(
    $repoRoot,
    $fullPath
)

$relativePath = $relativePath -replace '\\', '/'


if (
    $relativePath -eq '..' -or
    $relativePath.StartsWith('../') -or
    [IO.Path]::IsPathRooted($relativePath)
) {
    throw "JSON file must be inside the Git repository."
}


Write-Host "File: $relativePath"


# ============================================================
# Verify tracked file
# ============================================================

& git ls-files --error-unmatch -- "$relativePath" *> $null

if ($LASTEXITCODE -ne 0) {
    throw "File is not tracked by Git: $relativePath"
}


# ============================================================
# Refuse existing staged changes
#
# git diff --cached --quiet:
#
#   0 = no changes
#   1 = changes exist
#   >1 = actual error
# ============================================================

& git diff --cached --quiet -- "$relativePath"

$cachedExit = $LASTEXITCODE

if ($cachedExit -gt 1) {
    throw "Unable to inspect staged changes."
}

if ($cachedExit -eq 1) {
    throw @"
The file already has staged changes:

$relativePath

Please unstage those changes before running this script.
"@
}


# ============================================================
# Get unstaged diff
# ============================================================

$diff = @(
    & git diff `
        --no-ext-diff `
        --no-color `
        --no-renames `
        --unified=0 `
        -- "$relativePath"
)

if ($LASTEXITCODE -ne 0) {
    throw "Unable to obtain Git diff."
}

if ($diff.Count -eq 0) {
    Write-Host "No unstaged changes."
    exit 0
}


# ============================================================
# Find diff hunks
# ============================================================

$hunks = @()
$currentHunk = $null

foreach ($line in $diff) {

    $line = [string]$line

    if ($line.StartsWith('@@ ')) {

        if ($null -ne $currentHunk) {
            $hunks += , $currentHunk
        }

        $currentHunk = @($line)
    }
    elseif ($null -ne $currentHunk) {

        $currentHunk += $line
    }
}

if ($null -ne $currentHunk) {
    $hunks += , $currentHunk
}


# ============================================================
# Process hunks
# ============================================================

$patchHunks = @()

$stagedCount = 0
$skippedCount = 0


foreach ($hunk in $hunks) {

    if ($hunk.Count -eq 0) {
        continue
    }


    # --------------------------------------------------------
    # Parse hunk header
    #
    # @@ -123,2 +123,2 @@
    # --------------------------------------------------------

    $header = [string]$hunk[0]

    if (
        $header -notmatch
        '^@@ -(?<oldStart>\d+)(?:,(?<oldCount>\d+))? \+(?<newStart>\d+)(?:,(?<newCount>\d+))? @@'
    ) {
        $skippedCount++
        continue
    }


    $oldLine = [int]$Matches['oldStart']
    $newLine = [int]$Matches['newStart']


    # --------------------------------------------------------
    # Walk lines in this hunk
    # --------------------------------------------------------

    $removedLines = @()
    $addedLines = @()


    function Process-ChangeBlock {

        if (
            $removedLines.Count -eq 0 -and
            $addedLines.Count -eq 0
        ) {
            return
        }


        # We can safely pair lines when counts are equal.
        if ($removedLines.Count -eq $addedLines.Count) {

            for (
                $i = 0;
                $i -lt $removedLines.Count;
                $i++
            ) {

                $old = $removedLines[$i]
                $new = $addedLines[$i]


                # ------------------------------------------------
                # Check old line:
                #
                #     "gb7s": null,
                # ------------------------------------------------

                $oldText = [string]$old.Text

                $oldMatch = [regex]::Match(
                    $oldText,
                    '^\s*"(?<key>(?:[^"\\]|\\.)+)"\s*:\s*null\s*,?\s*$'
                )


                if (-not $oldMatch.Success) {
                    $script:skippedCount++
                    continue
                }


                $key = [string]$oldMatch.Groups['key'].Value

                $escapedKey = [regex]::Escape($key)


                # ------------------------------------------------
                # Check new line:
                #
                #     "gb7s": 1234,
                # ------------------------------------------------

                $newText = [string]$new.Text

                $newMatch = [regex]::Match(
                    $newText,
                    '^\s*"' + $escapedKey + '"\s*:\s*(?<value>.+?)\s*,?\s*$'
                )


                if (-not $newMatch.Success) {
                    $script:skippedCount++
                    continue
                }


                $newValue = [string]$newMatch.Groups['value'].Value

                $newValue = $newValue.Trim()


                # Still null -> nothing to stage.
                if ($newValue -eq 'null') {
                    $script:skippedCount++
                    continue
                }


                # ------------------------------------------------
                # Create an individual one-line Git hunk.
                # ------------------------------------------------

                $script:patchHunks += @(
                    "@@ -$($old.Line),1 +$($new.Line),1 @@"
                    "-$oldText"
                    "+$newText"
                )

                $script:stagedCount++
            }
        }
        else {

            # Ambiguous block. Don't guess.
            $script:skippedCount++
        }


        $script:removedLines = @()
        $script:addedLines = @()
    }


    # --------------------------------------------------------
    # Process every line
    # --------------------------------------------------------

    for ($i = 1; $i -lt $hunk.Count; $i++) {

        $line = [string]$hunk[$i]


        # Git metadata line
        if ($line.StartsWith('\')) {
            continue
        }


        # Removed line
        if ($line.StartsWith('-')) {

            $removedLines += [pscustomobject]@{
                Line = $oldLine
                Text = $line.Substring(1)
            }

            $oldLine++

            continue
        }


        # Added line
        if ($line.StartsWith('+')) {

            $addedLines += [pscustomobject]@{
                Line = $newLine
                Text = $line.Substring(1)
            }

            $newLine++

            continue
        }


        # Context line.
        #
        # Finish previous changed block.
        Process-ChangeBlock


        $oldLine++
        $newLine++
    }


    # Flush last change block.
    Process-ChangeBlock
}


# ============================================================
# Nothing to stage
# ============================================================

if ($patchHunks.Count -eq 0) {

    Write-Host ""
    Write-Host "No null-to-value changes found."
    Write-Host "Other changes remain untouched."
    Write-Host ""
    exit 0
}


# ============================================================
# Build patch
# ============================================================

$patchLines = @()

# Original Git diff header.
#
# Example:
#
# diff --git a/devices.json b/devices.json
# index ...
# --- a/devices.json
# +++ b/devices.json
#

foreach ($line in $diff) {

    $line = [string]$line

    if ($line.StartsWith('@@ ')) {
        break
    }

    $patchLines += $line
}


# Add our individual hunks.
foreach ($line in $patchHunks) {
    $patchLines += $line
}


# ============================================================
# Write temporary patch
# ============================================================

$patchPath = Join-Path `
([IO.Path]::GetTempPath()) `
("stage-null-fills-" + [guid]::NewGuid().ToString() + ".patch")


try {

    [IO.File]::WriteAllText(
        $patchPath,
        ($patchLines -join "`n") + "`n",
        [Text.UTF8Encoding]::new($false)
    )


    # ========================================================
    # Stage selected changes
    # ========================================================

    & git apply `
        --cached `
        --unidiff-zero `
        $patchPath


    if ($LASTEXITCODE -ne 0) {
        throw "Git could not apply the generated staging patch."
    }

}
finally {

    Remove-Item `
        -LiteralPath $patchPath `
        -Force `
        -ErrorAction SilentlyContinue
}


# ============================================================
# Result
# ============================================================

Write-Host ""
Write-Host "========================================"
Write-Host "stage-null-fills complete"
Write-Host "========================================"
Write-Host ""

Write-Host "Staged null -> value: $stagedCount"
Write-Host "Skipped/other:        $skippedCount"

Write-Host ""
Write-Host "Review staged:"
Write-Host "  git diff --cached -- $relativePath"

Write-Host ""
Write-Host "Review unstaged:"
Write-Host "  git diff -- $relativePath"

Write-Host ""