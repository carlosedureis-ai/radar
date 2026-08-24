# Segurança automatizada

## CI obrigatório

O workflow `.github/workflows/backend-ci.yml` executa instalação reproduzível, typecheck, testes,
build e auditoria das dependências de produção em alterações do backend.

## Strix sem Docker local

Para este repositório, a opção recomendada é o aplicativo gerenciado do Strix:

1. Crie o repositório como **privado** no GitHub.
2. Entre em `https://app.strix.ai`.
3. Conecte o aplicativo GitHub do Strix somente a este repositório.
4. Habilite revisões de pull request no painel.
5. Confira as permissões solicitadas e remova o acesso quando ele não for mais necessário.

Esse modo não exige workflow Strix, Docker ou chave de LLM no repositório. Os resultados ficam no
dashboard e podem aparecer como comentários nas pull requests.

## Alternativa por API

Se o aplicativo GitHub não puder ser usado, crie um token organizacional em **Settings → API
Access** com o menor escopo possível. Armazene-o somente como secret do GitHub
`STRIX_API_TOKEN`; nunca em `.env.example`, código, logs ou documentação. A integração ainda não é
ativada automaticamente porque depende de uma organização e de um repositório já registrados.

## Escopo autorizado

O Strix pode analisar este repositório e ambientes que o proprietário tenha autorizado. Ele nunca
deve testar Spotify, Apple Music, Last.fm ou outros serviços externos usados pelo produto.
