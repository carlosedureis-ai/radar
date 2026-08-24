# Contribuindo

## Antes de alterar

1. Leia `PRODUCT.md` e `DESIGN.md`.
2. Não transforme o produto em player, cassino, gacha, NFT ou ativo financeiro.
3. Não invente parcerias, números de usuários, permissões de API ou imagens licenciadas.
4. Mantenha segredos apenas em arquivos `.env` ignorados pelo Git.

## Backend

```powershell
cd backend
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm audit --prod
```

Toda nova rota privada precisa de teste de autenticação e autorização por proprietário. Alterações
na ingestão de escutas precisam testar idempotência, repetição e limites de XP.

## Pull requests

- Explique o problema, a solução e como foi validada.
- Inclua riscos e decisões ainda provisórias.
- Não inclua `node_modules`, bancos, ZIPs, tokens ou relatórios com dados sensíveis.
- Faça alterações pequenas o suficiente para revisão e reversão seguras.
