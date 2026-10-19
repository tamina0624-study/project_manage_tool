param([string]$PythonCommand)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not $PythonCommand) {
    foreach ($candidate in @('python', 'py', (Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'))) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) { $PythonCommand = $candidate; break }
    }
}
if (-not $PythonCommand) { throw 'Python 3.11+ is required. Pass -PythonCommand with its executable path.' }
& $PythonCommand -c 'import sys; assert sys.version_info >= (3, 11), "Python 3.11+ is required"'
if ($LASTEXITCODE) { throw 'Python version check failed' }
git submodule update --init --recursive
if ($LASTEXITCODE) { throw 'Submodule initialization failed' }
New-Item -ItemType Directory -Path '00.secret' -Force | Out-Null
if (-not (Test-Path '00.secret/tools-venv/Scripts/python.exe')) {
    & $PythonCommand -m venv '00.secret/tools-venv'
    if ($LASTEXITCODE) { throw 'Virtual environment creation failed' }
}
$python = Join-Path $PSScriptRoot '00.secret/tools-venv/Scripts/python.exe'
& $python -m pip install pre-commit
if ($LASTEXITCODE) { throw 'pre-commit installation failed' }
$exclude = (git -C GitSecurityTool rev-parse --git-path info/exclude).Trim()
foreach ($line in @('/GitSecurityTool/keywords.yaml', '/GitSecurityTool/.secret_detected.log')) {
    if ((Get-Content -LiteralPath $exclude) -notcontains $line) { Add-Content -LiteralPath $exclude -Value $line }
}
$keywords = 'GitSecurityTool/GitSecurityTool/keywords.yaml'
if (-not (Test-Path -LiteralPath $keywords)) { Copy-Item -LiteralPath '01.doc/security-keywords.example.yaml' -Destination $keywords }
if (-not (Test-Path '00.secret/security-bin/gitleaks.exe')) {
    $base = 'https://github.com/gitleaks/gitleaks/releases/download/v8.24.2'
    Invoke-WebRequest "$base/gitleaks_8.24.2_windows_x64.zip" -OutFile '00.secret/gitleaks.zip' -UseBasicParsing -TimeoutSec 60
    Invoke-WebRequest "$base/gitleaks_8.24.2_checksums.txt" -OutFile '00.secret/gitleaks-checksums.txt' -UseBasicParsing -TimeoutSec 60
    $expected = ((Get-Content '00.secret/gitleaks-checksums.txt' | Where-Object { $_ -match 'gitleaks_8.24.2_windows_x64.zip$' }) -split '\s+')[0]
    if ((Get-FileHash '00.secret/gitleaks.zip' -Algorithm SHA256).Hash -ne $expected) { throw 'Gitleaks checksum mismatch' }
    Expand-Archive '00.secret/gitleaks.zip' -DestinationPath '00.secret/security-bin' -Force
}
& $python -m pre_commit install
if ($LASTEXITCODE) { throw 'Hook installation failed' }
Write-Host 'Security hooks installed. Run 00.secret/tools-venv/Scripts/python.exe -m pre_commit run --all-files after staging your changes.'
