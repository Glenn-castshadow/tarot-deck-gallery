# Off-site copy of the VPS database backup. The server keeps 14 nightly copies beside the live database
# (server/backup-ishtar-app.sh), so a lost disk loses both; this pulls the newest one to the NAS over SSH,
# checks it against the server's sha256, and keeps 14 here too, so something a visitor deletes still drops
# out of every copy within about two weeks, as privacy.html says.
# Run by hand, or from C:\Users\glenn\Scripts\daily-prose.ps1 after the nightly prose push.
param([string]$Dest = 'N:\backups\ishtar-app', [int]$Keep = 14)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path 'N:\')) { throw 'N: is not mounted' }
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

$remote = (& ssh -o BatchMode=yes -o ConnectTimeout=15 vps 'ls -1t /var/backups/ishtar-app/db-*.sqlite3 | head -1')
if ($LASTEXITCODE -ne 0 -or -not $remote) { throw 'could not list the backups on the VPS' }
$remote = $remote.Trim()
$name = Split-Path $remote -Leaf
$target = Join-Path $Dest $name

if (-not (Test-Path $target)) {
    & scp -q -o BatchMode=yes "vps:$remote" "$target.part"
    if ($LASTEXITCODE -ne 0) { Remove-Item "$target.part" -ErrorAction SilentlyContinue; throw "scp of $name failed" }
    $want = ((& ssh -o BatchMode=yes vps "sha256sum $remote") -split '\s+')[0]
    $have = (Get-FileHash "$target.part" -Algorithm SHA256).Hash.ToLower()
    if ($want -ne $have) { Remove-Item "$target.part"; throw "sha256 mismatch for $name" }
    Move-Item "$target.part" $target
    "pulled $name ($((Get-Item $target).Length) bytes, sha256 verified)"
} else {
    "already have $name"
}

Get-ChildItem $Dest -Filter 'db-*.sqlite3' | Sort-Object Name -Descending | Select-Object -Skip $Keep |
    ForEach-Object { Remove-Item $_.FullName; "pruned $($_.Name)" }
