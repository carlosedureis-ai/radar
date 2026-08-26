# Radar PWA

Cliente React/Vite mobile-first do Radar. Usa Supabase Auth para cadastro e sessão, e envia o JWT
ao backend Fastify para todas as operações privadas.

## Configuração local

```powershell
Copy-Item .env.example .env
```

Preencha apenas `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave pública do projeto. Não use
`service_role` no frontend. Depois:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://127.0.0.1:5174`. Abrir `index.html` diretamente não funciona porque Vite precisa
servir os módulos, as rotas da PWA e as variáveis de ambiente.

## Validação

```powershell
pnpm check
pnpm build
pnpm audit --prod
```

As telas não gravam XP, escutas, cartas ou conexões diretamente no Supabase. Toda regra de produto
passa pela API autenticada em `VITE_API_URL`.
