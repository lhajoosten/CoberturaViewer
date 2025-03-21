# Remove existing docs directory if it exists
if (Test-Path -Path "docs") {
    Remove-Item -Path "docs" -Recurse -Force
}

# Create new docs directory
New-Item -Path "docs" -ItemType Directory

# Check if dist exists
if (-not (Test-Path -Path "dist")) {
    Write-Error "Could not find dist directory"
    exit 1
}

# Determine source path based on directory structure
$sourcePath = "dist"
$hasNestedBrowser = $false

# Check if there's a browser subdirectory anywhere in the dist folder
$appDirs = Get-ChildItem -Path $sourcePath -Directory
foreach ($appDir in $appDirs) {
    $browserPath = Join-Path -Path $sourcePath -ChildPath (Join-Path -Path $appDir.Name -ChildPath "browser")
    if (Test-Path -Path $browserPath) {
        $sourcePath = $browserPath
        $hasNestedBrowser = $true
        break
    }
}

# If no browser directory was found, check if dist is the app directory itself
if (-not $hasNestedBrowser) {
    $browserPath = Join-Path -Path $sourcePath -ChildPath "browser"
    if (Test-Path -Path $browserPath) {
        $sourcePath = $browserPath
    }
}

# Copy all files from source directory to docs
Write-Output "Copying files from $sourcePath to docs"
Copy-Item -Path (Join-Path -Path $sourcePath -ChildPath "*") -Destination "docs" -Recurse

# Create .nojekyll file
New-Item -Path "docs/.nojekyll" -ItemType File -Force

Write-Output "Build files copied to docs folder successfully"