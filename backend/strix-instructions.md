# Regras de engajamento — Radar local

- Alvo autorizado: este diretório e `http://127.0.0.1:3333` somente.
- Não testar domínios, APIs ou contas de Spotify, Apple, Last.fm ou outros terceiros.
- Não executar negação de serviço, persistência, phishing ou exfiltração.
- Limitar testes de taxa para não prejudicar a máquina local.
- Priorizar OWASP API Top 10, especialmente BOLA/IDOR, autenticação, OAuth state, replay de
  refresh token, mass assignment, injeção e manipulação de XP.
- Dados criados durante o teste são descartáveis e devem usar endereços `example.com`.
- O modo Spotify não está configurado no ambiente de pentest; não tentar contornar essa trava.
