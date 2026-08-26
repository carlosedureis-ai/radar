# Radar

Rede social musical em desenvolvimento na qual escutas autorizadas em serviços externos viram
progresso, cartas evolutivas de artistas e histórias compartilháveis. O Radar não reproduz música.

> **Status:** migration aplicada e validada no Supabase, PWA com Auth configurado e backend com
> TLS verificado pelo certificado oficial. A validação local aguarda apenas a senha PostgreSQL
> corresponder à senha atual do projeto. O nome Radar continua provisório e não há parceria
> confirmada com plataformas.

## O que existe neste repositório

- Backend TypeScript/Fastify com Supabase Auth, PostgreSQL, Spotify OAuth/PKCE, XP e cartas.
- PWA React/Vite com cadastro, painel, cartas, escutas, conexões, conta e compartilhamento público.
- Testes de integração, contrato OpenAPI e controles de segurança.
- Identidade visual “Camadas Vivas”, logos, tokens, fontes e guia interativo.
- Documentos de produto e design que registram as decisões aprovadas.

## Estrutura

```text
.
├── backend/                  API e testes
├── frontend/                 PWA React/Vite
├── supabase/migrations/      schema PostgreSQL versionado
├── outputs/                  identidade visual e ativos versionáveis
├── .impeccable/design.json   sidecar do sistema visual
├── DESIGN.md                 regras normativas de design
└── PRODUCT.md                verdade de produto e limites
```

`work/`, `tools/strix/`, bancos locais, dependências e ZIPs de entrega ficam fora do Git.

## Rodar o backend no Windows

```powershell
cd backend
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm db:check
pnpm dev
```

Ou execute `backend/iniciar-backend.bat`. A API inicia em `http://127.0.0.1:3333` e o teste de
saúde está em `GET /health`.

Comandos principais:

```powershell
cd backend
pnpm check
pnpm build
pnpm audit --prod
```

## Rodar a PWA no Windows

```powershell
cd frontend
Copy-Item .env.example .env
# Preencha VITE_SUPABASE_PUBLISHABLE_KEY com a chave publica do projeto.
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://127.0.0.1:5174`. Depois que `backend/.env` e `frontend/.env` estiverem configurados,
você também pode executar `iniciar-radar.bat` para iniciar os dois serviços.

Valide com `pnpm check`, `pnpm build` e `pnpm audit --prod` dentro de `frontend/`.

## Supabase e configuração musical

O backend exige `DATABASE_URL` do Supabase no arquivo local `backend/.env`, usa
`DATABASE_SSL_CA_PATH` para verificar o certificado do servidor e nunca desativa TLS para contornar
erros. Cadastro e sessões são gerenciados pelo Supabase Auth. A conexão musical real exige também
`SPOTIFY_CLIENT_ID` e uma redirect URI cadastrada no painel do Spotify. Nunca coloque senhas,
chaves ou tokens no Git.

## Identidade visual

Abra `outputs/radar-identidade-visual.html` no navegador para consultar marca, cores, tipografia,
progressão das cartas, componentes e downloads. Os arquivos de licença das fontes estão em
`outputs/assets/fonts/`.

## Segurança

- O CI executa typecheck, testes, build e auditoria de dependências.
- O pentest gerenciado do Strix deve ser conectado pelo aplicativo oficial no GitHub; não exige
  Docker local e não exige armazenar token no código.
- Testes ofensivos só podem atingir ativos próprios ou explicitamente autorizados.

Consulte `SECURITY.md`, `backend/SECURITY.md` e `docs/SECURITY-SCANNING.md`.

## Publicação no GitHub

Depois de criar um repositório vazio e privado:

```powershell
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git branch -M main
git push -u origin main
```

Este projeto ainda não possui uma licença pública. Não presuma permissão de redistribuição além das
licenças individuais incluídas para dependências e fontes.
