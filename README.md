# Radar

Rede social musical em desenvolvimento na qual escutas autorizadas em serviços externos viram
progresso, cartas evolutivas de artistas e histórias compartilháveis. O Radar não reproduz música.

> **Status:** MVP local. O nome Radar é provisório e ainda precisa de validação de marca, domínio e
> lojas. Não há integração comercial ou parceria confirmada com plataformas musicais.

## O que existe neste repositório

- Backend TypeScript/Fastify com autenticação, Spotify OAuth/PKCE, escutas, XP, cartas e conta.
- Testes de integração, contrato OpenAPI e controles de segurança.
- Identidade visual “Camadas Vivas”, logos, tokens, fontes e guia interativo.
- Documentos de produto e design que registram as decisões aprovadas.

## Estrutura

```text
.
├── backend/                  API e testes
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

## Configuração musical

O backend funciona sem credenciais externas, mas a conexão real com Spotify exige
`SPOTIFY_CLIENT_ID` e uma redirect URI cadastrada no painel da plataforma. Nunca coloque chaves ou
tokens no Git. Use `backend/.env.example` como referência.

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
