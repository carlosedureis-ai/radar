# Segurança do Radar Backend

## Escopo autorizado

Testes automatizados deste projeto devem atingir apenas o código local e a API em
`http://127.0.0.1:3333`. Não direcione scanners para Spotify, Apple, Last.fm ou qualquer
terceiro. Pentest de staging ou produção exige autorização explícita e escopo documentado.

## Controles implementados

- Cadastro, confirmação de e-mail, recuperação e sessões delegados ao Supabase Auth.
- Access tokens verificados contra o JWKS público e vinculados ao emissor do projeto.
- Perfis locais vinculados por UUID ao usuário autenticado do Supabase.
- Segredos de provedores criptografados com AES-256-GCM.
- OAuth `state` de uso único, expiração curta e PKCE S256.
- Validação de entrada com Zod, statements SQL parametrizados e corpo limitado a 32 KiB.
- Helmet, CORS por allowlist, rate limiting e logs sem query strings sensíveis.
- Autorização por proprietário nas operações de carta e compartilhamento.
- Deduplicação de escutas independente da ordem de chegada e registro dos motivos de rejeição.
- Uma identidade de provedor musical só pode pertencer a uma conta Radar.
- RLS habilitado e privilégios diretos removidos de `anon` e `authenticated`.
- A senha PostgreSQL e a chave de criptografia permanecem somente no backend.
- A chave de criptografia é obrigatória em produção e fora do loopback.

## Modelo de ameaça inicial

Prioridades: tomada de conta, JWT inválido, CSRF/OAuth state, IDOR/BOLA, injeção, manipulação de
XP, replay de escutas, vazamento de tokens musicais e abuso de taxa.

## Relato de vulnerabilidades

Não publique credenciais, tokens ou provas contendo dados pessoais. Registre o achado com rota,
impacto, pré-condições e reprodução mínima, removendo dados sensíveis.
