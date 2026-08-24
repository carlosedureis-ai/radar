# Política de segurança

## Escopo

O repositório contém um MVP. Não use dados pessoais reais, credenciais de produção ou contas
musicais de terceiros nos ambientes de desenvolvimento e teste.

## Relato responsável

Registre vulnerabilidades de forma privada com rota ou arquivo afetado, impacto, pré-condições e
reprodução mínima. Remova tokens, senhas, cookies e dados pessoais de capturas e relatórios.

## Testes autorizados

Pentests locais devem se limitar ao código deste repositório e a `http://127.0.0.1:3333`. Testes em
staging ou produção exigem autorização explícita do proprietário. Nunca direcione Strix ou outro
scanner para Spotify, Apple Music, Last.fm ou qualquer serviço de terceiros.

Os controles específicos do backend estão documentados em `backend/SECURITY.md`.
