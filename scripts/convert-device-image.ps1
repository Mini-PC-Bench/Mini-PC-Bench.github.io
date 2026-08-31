#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Converts a device source image using cardglow into a consistent tile
    for the Mini-PC Bench UI.

.DESCRIPTION
    Takes a source image from temp/devices-source/<device-id>.<ext> and
    produces a processed WebP tile in images/devices/<device-id>.webp using the
    cardglow Docker image.

    The output is a 600x600 transparent-background PNG with the product
    photo centered and background removed. This works well with the UI's
    detail-photo container (220px height, object-fit: contain) in both
    light (white bg) and dark (dark bg) themes.

.PARAMETER DeviceId
    The device id as used in devices.json (e.g. asus-rog-nuc-15-ultra-9-275hx).

.PARAMETER All
    Converts every source image with a filename that matches a device id in
    devices.json and updates each matching photo property.

.PARAMETER BgTolerance
    Background removal tolerance (default: 30). Increase if white bg is not
    fully removed.

.PARAMETER BgFeather
    Edge feather radius in px (default: 3).

.EXAMPLE
    .\scripts\convert-device-image.ps1 -DeviceId asus-rog-nuc-15-ultra-9-275hx

.EXAMPLE
    .\scripts\convert-device-image.ps1 -DeviceId asus-rog-nuc-15-ultra-9-275hx -BgTolerance 40
#>

param(
    [string]$DeviceId,

    [switch]$All,

    [double]$BgTolerance = 30,
    [double]$BgFeather = 3,
    [ValidateRange(1, 600)]
    [int]$IconSize = 560
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot "temp/devices-source"
$outputDir = Join-Path $repoRoot "images/devices"
$devicesFile = Join-Path $repoRoot "devices.json"
$extensions = @('avif', 'webp', 'png', 'jpg', 'jpeg', 'gif', 'svg')

if ($All -and $DeviceId) {
    throw 'Specify either -DeviceId or -All, not both.'
}

if (-not $All -and -not $DeviceId) {
    throw 'Specify -DeviceId <id> or -All.'
}

function Update-DevicePhoto {
    param([string]$Id, [string]$PhotoPath)

    $content = Get-Content -Raw $devicesFile
    $idPattern = [regex]::Escape($Id)
    $devicePattern = '(?ms)(^  \{\r?\n    "id": "' + $idPattern + '".*?^  \})(,?)'
    $match = [regex]::Match($content, $devicePattern)
    if (-not $match.Success) {
        throw "No device with id '$Id' was found in devices.json."
    }

    $deviceBlock = $match.Groups[1].Value
    $photoPattern = '(?m)^(    "photo": )(?:null|"[^"]*")'
    if ([regex]::IsMatch($deviceBlock, $photoPattern)) {
        $deviceBlock = [regex]::Replace(
            $deviceBlock,
            $photoPattern,
            "`$1`"$PhotoPath`"",
            1
        )
    } else {
        $deviceBlock = [regex]::Replace(
            $deviceBlock,
            '(?m)^(    "name": "[^"]+",\r?\n)',
            "`$1    `"photo`": `"$PhotoPath`",`r`n",
            1
        )
    }

    $newBlock = $deviceBlock + $match.Groups[2].Value
    $content = $content.Substring(0, $match.Index) + $newBlock + $content.Substring($match.Index + $match.Length)

    $tempFile = "$devicesFile.tmp"
    Set-Content -NoNewline -Path $tempFile -Value $content
    Move-Item -Force -Path $tempFile -Destination $devicesFile
}

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

if ($All) {
    $deviceIds = (Get-Content -Raw $devicesFile | ConvertFrom-Json).id
    $sourceFiles = Get-ChildItem -File $sourceDir | Where-Object {
        $_.Extension.TrimStart('.').ToLowerInvariant() -in $extensions -and $_.BaseName -in $deviceIds
    }
    $skipped = (Get-ChildItem -File $sourceDir | Where-Object {
        $_.Extension.TrimStart('.').ToLowerInvariant() -in $extensions -and $_.BaseName -notin $deviceIds
    }).Name
    $deviceIdsToConvert = $sourceFiles.BaseName | Select-Object -Unique
    if ($skipped) {
        Write-Warning "Skipped source files without a matching device id: $($skipped -join ', ')"
    }
} else {
    $deviceIdsToConvert = @($DeviceId)
}

foreach ($id in $deviceIdsToConvert) {
    $sourceFile = $null
    foreach ($ext in $extensions) {
        $candidate = Join-Path $sourceDir "$id.$ext"
        if (Test-Path $candidate) {
            $sourceFile = $candidate
            break
        }
    }

    if (-not $sourceFile) {
        throw "No source image found for '$id' in '$sourceDir'."
    }

    $outputFile = Join-Path $outputDir "$id.webp"
    $sourceFileName = Split-Path $sourceFile -Leaf
    $outputFileName = "$id.webp"

    Write-Host "Source : $sourceFile"
    Write-Host "Output : $outputFile"

    # Pull the latest cardglow image so the new padding/fit CLI is available,
    # while keeping the existing output size and removal settings intact.
    docker pull ghcr.io/alan-null/cardglow:latest | Out-Null

    docker run --rm `
        -v "${repoRoot}:/data" `
        ghcr.io/alan-null/cardglow:latest `
        "temp/devices-source/$sourceFileName" `
        --remove-bg `
        --bg-tolerance $BgTolerance `
        --bg-feather $BgFeather `
        --transparent `
        --size 600x600 `
        --padding "10 0 10 0" `
        --fit height `
        --icon-size $IconSize `
        -o "images/devices/$outputFileName"

    if ($LASTEXITCODE -ne 0) {
        throw "cardglow failed for '$id' with exit code $LASTEXITCODE"
    }

    Update-DevicePhoto -Id $id -PhotoPath "./images/devices/$outputFileName"
}

Write-Host "Converted $($deviceIdsToConvert.Count) device image(s)."
