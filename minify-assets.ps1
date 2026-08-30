param(
    [string]$SiteDir = "_site"
)

$ErrorActionPreference = "Stop"

Write-Host "Minifying assets for deployment..."

# Files to minify
$assets = @(
    @{ src = "app.js"; dest = "$SiteDir/app.js" },
    @{ src = "theme.js"; dest = "$SiteDir/theme.js" },
    @{ src = "styles.css"; dest = "$SiteDir/styles.css" }
)

$hashes = @{}

# Minify each asset using esbuild
foreach ($asset in $assets) {
    $srcPath = $asset.src
    $destPath = $asset.dest
    
    Write-Host "Minifying $srcPath..."
    
    & npx esbuild "$srcPath" --outfile="$destPath" --minify
    
    if ($LASTEXITCODE -ne 0) {
        throw "esbuild failed for $srcPath"
    }
    
    # Compute hash of minified content
    $minifiedContent = Get-Content $destPath -Raw
    $bytes = [Text.Encoding]::UTF8.GetBytes($minifiedContent)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha256.ComputeHash($bytes)
    $hash = ([System.BitConverter]::ToString($hashBytes) -replace '-', '').Substring(0, 8).ToLower()
    $hashes[$asset.src] = $hash
    
    Write-Host "  $srcPath → $destPath (hash: $hash)"
}

Write-Host "Updating HTML files with cache-bust query strings..."

# Update index.html and 404.html with hashes
$htmlFiles = @("$SiteDir/index.html", "$SiteDir/404.html")

foreach ($htmlFile in $htmlFiles) {
    if (-not (Test-Path $htmlFile)) {
        Write-Error "File not found: $htmlFile"
    }
    
    Write-Host "  Updating $htmlFile..."
    $content = Get-Content $htmlFile -Raw
    
    # Replace or add query strings for cache busting
    # For styles.css
    $content = $content -replace 'styles\.css\?v=[^\s"]+', ('styles.css?v=' + $hashes["styles.css"])
    if ($content -notmatch 'styles\.css\?v=') {
        $content = $content -replace 'styles\.css(?=[\s"])', ('styles.css?v=' + $hashes["styles.css"])
    }
    
    # For theme.js
    $content = $content -replace 'theme\.js\?v=[^\s"]+', ('theme.js?v=' + $hashes["theme.js"])
    if ($content -notmatch 'theme\.js\?v=') {
        $content = $content -replace 'theme\.js(?=[\s"])', ('theme.js?v=' + $hashes["theme.js"])
    }
    
    # For app.js
    $content = $content -replace 'app\.js\?v=[^\s"]+', ('app.js?v=' + $hashes["app.js"])
    if ($content -notmatch 'app\.js\?v=') {
        $content = $content -replace 'app\.js(?=[\s"])', ('app.js?v=' + $hashes["app.js"])
    }
    
    Set-Content $htmlFile -Value $content -NoNewline
}

Write-Host "✓ Minification and cache-bust generation complete"
Write-Host "Generated hashes:"
$hashes.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Key): $($_.Value)" }
