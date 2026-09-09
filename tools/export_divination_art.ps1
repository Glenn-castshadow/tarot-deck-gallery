param([switch]$RequireComplete)
$artRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $artRoot 'output/imagegen/divination-v2'
$webDir = Join-Path $artRoot 'assets/divination-v2'
$detailDir = Join-Path $webDir 'large'
New-Item -ItemType Directory -Force $webDir,$detailDir | Out-Null
$artManifest = Get-Content (Join-Path $sourceDir 'prompts.json') -Raw | ConvertFrom-Json
$missing = @()
foreach ($job in $artManifest.jobs) {
  $artSource = Join-Path $sourceDir $job.out
  if (!(Test-Path -LiteralPath $artSource)) { $missing += $job.out; continue }
  $artSmall = Join-Path $webDir $job.out
  $artLarge = Join-Path $detailDir $job.out
  if (!(Test-Path -LiteralPath $artSmall) -or (Get-Item -LiteralPath $artSource).LastWriteTimeUtc -gt (Get-Item -LiteralPath $artSmall).LastWriteTimeUtc) {
    & magick $artSource -resize '480x768>' -quality 84 $artSmall
    if ($LASTEXITCODE -ne 0) { throw "Unable to export $($job.out)" }
    Copy-Item -LiteralPath $artSource -Destination $artLarge -Force
  }
}
"Exported $($artManifest.jobs.Count - $missing.Count) of $($artManifest.jobs.Count) artworks."
if ($RequireComplete -and $missing.Count) { throw "Missing artworks: $($missing -join ', ')" }
