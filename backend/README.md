# Radar Backend MVP

API do Radar para conexões musicais, escutas externas, cartas de artistas e progressão da conta.
O backend usa Supabase Auth para identidade e Supabase PostgreSQL para persistência. A plataforma
não reproduz música.

## Arquitetura

- Fastify e TypeScript em Node.js 22.
- Supabase Auth: cadastro, verificação de e-mail, recuperação e sessões.
- PostgreSQL: perfis, conexões, eventos auditáveis, cartas e progressão.
- JWTs verificados pelo JWKS público do projeto Supabase.
- Spotify OAuth 2.0 com PKCE e escopo mínimo para histórico recente.
- Tokens musicais criptografados com AES-256-GCM.
- Regras de XP executadas somente no servidor, dentro de transações.
- RLS habilitado e acesso direto de `anon` e `authenticated` revogado nas tabelas do Radar.

Os valores de XP e nomes dos níveis continuam **provisórios** e são registrados em
`progression_rules`.

## Configuração

1. Copie `.env.example` para `.env`.
2. No painel do Supabase, abra **Connect** e copie a URL do **Session pooler**.
3. Salve a URL somente em `DATABASE_URL` dentro do `.env`.
4. Gere `TOKEN_ENCRYPTION_KEY` com o comando indicado no `.env.example`.

O projeto Supabase configurado é `fxhvbmidhgdmrdyrywqw`. O Project ID e a URL pública não são
segredos; senha do banco, token de serviço e `DATABASE_URL` nunca devem ser versionados.

## Criar as tabelas

A migration inicial está em:

```text
../supabase/migrations/202608260001_radar_core.sql
```

Para o primeiro ambiente, abra **SQL Editor** no Supabase, cole a migration e execute uma vez.
Depois valide a conexão:

```powershell
pnpm db:check
```

Também é possível executar `supabase init`, vincular o projeto pela CLI e usar `supabase db push`.
Não execute reset em um banco remoto com dados reais.

## Autenticação

Cadastro, login, logout, confirmação de e-mail e renovação de sessão pertencem ao Supabase Auth,
não à API Fastify. O cliente envia o access token em todas as rotas privadas:

```http
Authorization: Bearer <supabase-access-token>
```

No primeiro acesso autenticado, o backend cria ou sincroniza o registro correspondente em
`profiles`. A conexão musical com Spotify é independente do login do Supabase.

## Rodar no Windows

Depois de configurar `.env`, execute `iniciar-backend.bat` ou:

```powershell
pnpm install
pnpm dev
```

Teste de saúde:

```powershell
Invoke-RestMethod http://127.0.0.1:3333/health
```

## Spotify

1. Crie um app no painel Spotify for Developers.
2. Cadastre exatamente a URI definida em `SPOTIFY_REDIRECT_URI`.
3. Preencha `SPOTIFY_CLIENT_ID` no `.env`.
4. Mantenha a API acessível apenas em HTTPS fora do desenvolvimento local.

Sem `SPOTIFY_CLIENT_ID`, a rota de autorização retorna `503 SPOTIFY_NOT_CONFIGURED`.

## Scripts

- `pnpm dev`: servidor com reload.
- `pnpm build`: compilação TypeScript.
- `pnpm test`: testes com PostgreSQL em memória, sem Docker.
- `pnpm check`: typecheck e testes.
- `pnpm db:check`: valida a conexão configurada sem alterar dados.

## Antes da produção

- Configurar confirmação de e-mail e SMTP no Supabase Auth.
- Aplicar a migration em um projeto de desenvolvimento antes de produção.
- Usar KMS ou secret manager para a chave e os tokens de provedores.
- Trocar sincronização manual por fila agendada com backoff e jitter.
- Implementar revogação no provedor quando ele disponibilizar esse fluxo.
- Definir retenção, exportação e exclusão de dados conforme a LGPD.
- Aprovar os valores definitivos de XP e regras de elegibilidade.
- Executar pentest somente em staging autorizado.
