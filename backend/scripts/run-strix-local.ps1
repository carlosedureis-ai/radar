param(
  [ValidateSet("quick", "standard", "deep")]
  [string]$ScanMode = "quick",
  [int]$MaxBudget = 10
)

$ErrorActionPreference = "Stop"
$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker não está instalado. Instale e inicie o Docker antes do pentest local."
}
docker info | Out-Null

if (-not (Get-Command strix -ErrorAction SilentlyContinue)) {
  throw "A CLI Strix não está no PATH. Instale-a conforme https://github.com/usestrix/strix."
}

if (-not $env:STRIX_LLM -or (-not $env:LLM_API_KEY -and -not $env:STRIX_API_TOKEN)) {
  throw "Configure STRIX_LLM e uma credencial autorizada antes de iniciar o scan."
}

Set-Location $backendRoot
strix -n `
  --target $backendRoot `
  --scan-mode $ScanMode `
  --max-budget $MaxBudget `
  --instruction-file (Join-Path $backendRoot "strix-instructions.md")
