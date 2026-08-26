$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path -LiteralPath $envFile)) {
  Write-Host "Arquivo backend\.env nao encontrado." -ForegroundColor Red
  Read-Host "Pressione Enter para fechar"
  exit 1
}

Write-Host "Radar - atualizar senha do Supabase" -ForegroundColor Cyan
Write-Host "A senha ficara invisivel enquanto voce digita."
$securePassword = Read-Host "Digite a NOVA senha do banco" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  if ([string]::IsNullOrWhiteSpace($plainPassword)) {
    throw "A senha nao pode ficar vazia."
  }

  $encodedPassword = [Uri]::EscapeDataString($plainPassword)
  $contents = [IO.File]::ReadAllText($envFile)
  $pattern = '(?<=postgres\.fxhvbmidhgdmrdyrywqw:).*?(?=@aws-0-ca-central-1\.pooler\.supabase\.com)'
  $match = [regex]::Match($contents, $pattern)
  if (-not $match.Success) {
    throw "A DATABASE_URL esperada nao foi encontrada no backend\.env."
  }

  $updated = $contents.Substring(0, $match.Index) + $encodedPassword +
    $contents.Substring($match.Index + $match.Length)
  [IO.File]::WriteAllText($envFile, $updated, [Text.UTF8Encoding]::new($false))
  Write-Host "Senha atualizada com seguranca." -ForegroundColor Green
  Write-Host "Volte ao Codex e diga: pronto"
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  $plainPassword = $null
}

Read-Host "Pressione Enter para fechar"
