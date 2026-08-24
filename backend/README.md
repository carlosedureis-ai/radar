# Radar Backend MVP

Backend funcional do Radar: autenticação, conexões musicais, sincronização de escutas,
proteção contra repetição artificial, evolução das cartas, progressão da conta e
compartilhamentos públicos.

## O que está implementado

- API TypeScript/Fastify com validação estrita e respostas de erro padronizadas.
- Cadastro e login com `scrypt`, access tokens curtos e refresh tokens opacos rotativos.
- Tokens de provedores criptografados com AES-256-GCM.
- Spotify OAuth 2.0 com PKCE e escopo mínimo para histórico recente.
- Ingestão idempotente de escutas e trilha de auditoria para eventos rejeitados.
- Bônus provisório para artistas emergentes, janela antirrepetição e teto diário.
- Cartas, nível da conta e peças compartilháveis com proteção contra IDOR.
- SQLite no MVP local, isolado atrás da camada de acesso a dados.
- Contrato OpenAPI para desenvolvimento e pentest.

Os valores de XP e os nomes dos níveis são **provisórios**, registrados na tabela
`progression_rules`. A plataforma não reproduz música.

## Rodar no Windows

Execute `iniciar-backend.bat`. Na primeira execução ele instala as dependências e inicia a API
em `http://127.0.0.1:3333`.

Alternativamente:

```powershell
copy .env.example .env
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

O fluxo é:

1. `POST /v1/music/spotify/authorize` autenticado.
2. Abra `authorizationUrl` no navegador do usuário.
3. O Spotify retorna em `/v1/music/spotify/callback`.
4. O callback volta ao app por `APP_DEEP_LINK`.
5. `POST /v1/music/spotify/sync` importa as novas escutas.

Não há credenciais reais no repositório. Sem `SPOTIFY_CLIENT_ID`, a rota de autorização retorna
`503 SPOTIFY_NOT_CONFIGURED` de forma intencional.

## Scripts

- `pnpm dev`: servidor com reload.
- `pnpm build`: compilação TypeScript.
- `pnpm test`: testes de integração em memória.
- `pnpm check`: typecheck e testes.
- `pnpm db:reset`: recria o banco local; bloqueado em produção.

## Strix

Para um scan local, inicie a API e execute `scripts/run-strix-local.ps1`. O script restringe o
alvo ao projeto local e interrompe antes de qualquer teste quando Docker, a CLI ou as credenciais
autorizadas não estão disponíveis. O clone local em `../tools/strix` é ignorado pelo Git.

Para testar sem Docker local, conecte o aplicativo gerenciado do Strix ao repositório privado.
As instruções estão em `../docs/SECURITY-SCANNING.md`; nenhum token deve ser salvo no código.

## Estrutura

- `src/auth.ts`: identidade, JWT e sessões rotativas.
- `src/spotify.ts`: OAuth/PKCE, renovação e sincronização Spotify.
- `src/progression.ts`: idempotência, antifraude inicial, XP, cartas e conta.
- `src/db.ts`: esquema e regras provisórias.
- `openapi.yaml`: contrato para clientes e ferramentas de segurança.
- `SECURITY.md`: modelo de ameaça e regras operacionais.

## Antes da produção

- Migrar SQLite para PostgreSQL gerenciado com migrations versionadas.
- Usar KMS/secret manager para as chaves e tokens de provedores.
- Trocar sincronização manual por fila agendada com backoff e jitter.
- Implementar revogação no provedor quando ele disponibilizar esse fluxo.
- Criar painel administrativo protegido para curadoria e mapeamento de artistas.
- Definir política de retenção, exportação e exclusão de dados.
- Aprovar os valores definitivos de XP e regras de elegibilidade.
- Executar Strix em staging autorizado e corrigir achados antes da abertura pública.
