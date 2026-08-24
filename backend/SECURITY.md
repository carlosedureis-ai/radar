# Segurança do Radar Backend

## Escopo autorizado

Testes automatizados deste projeto devem atingir apenas o código local e a API em
`http://127.0.0.1:3333`. Não direcione scanners para Spotify, Apple, Last.fm ou qualquer
terceiro. Pentest de staging ou produção exige autorização explícita e escopo documentado.

## Controles implementados

- Senhas derivadas com `scrypt` e salt individual.
- Access token com validade de 15 minutos e algoritmo fixado em HS256.
- Refresh token aleatório, armazenado apenas como hash e rotacionado a cada uso.
- Segredos de provedores criptografados com AES-256-GCM.
- OAuth `state` de uso único, expiração curta e PKCE S256.
- Validação de entrada com Zod, statements SQL parametrizados e corpo limitado a 32 KiB.
- Helmet, CORS por allowlist, rate limiting e logs sem query strings sensíveis.
- Autorização por proprietário nas operações de carta e compartilhamento.
- Deduplicação de escutas independente da ordem de chegada e registro dos motivos de rejeição.
- Uma identidade de provedor musical só pode pertencer a uma conta Radar.
- Segredos de produção obrigatórios e nenhum fallback de desenvolvimento permitido em produção.
- Segredos explícitos também são obrigatórios quando o servidor escuta fora do loopback.

## Modelo de ameaça inicial

Prioridades: tomada de conta, reutilização de refresh token, CSRF/OAuth state, IDOR/BOLA,
injeção, manipulação de XP, replay de escutas, vazamento de tokens musicais e abuso de taxa.

## Relato de vulnerabilidades

Não publique credenciais, tokens ou provas contendo dados pessoais. Registre o achado com rota,
impacto, pré-condições e reprodução mínima, removendo dados sensíveis.
