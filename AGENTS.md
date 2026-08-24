# Instruções para agentes

- `PRODUCT.md` é a fonte de verdade do produto; `DESIGN.md` é a fonte de verdade visual.
- O backend fica em `backend/`; valide com `pnpm check` e `pnpm build` dentro dessa pasta.
- Nunca grave segredos, tokens OAuth ou dados reais no repositório.
- Não altere os valores provisórios de XP sem registrar a decisão no produto e nos testes.
- Escutas devem continuar idempotentes, auditáveis e protegidas contra repetição artificial.
- Operações de cartas, conta e conexões sempre usam o usuário autenticado no servidor.
- Strix e outros scanners só podem atingir este código ou alvos explicitamente autorizados.
- `tools/strix/` é uma instalação local de ferramenta e não faz parte do produto.
- Preserve a identidade “Camadas Vivas” e seus arquivos licenciados em `outputs/`.
