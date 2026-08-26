---
name: Radar
description: Escutas reais viram progresso permanente, material e compartilhável.
colors:
  ink: "#181a20"
  bone: "#f4f1e8"
  paper: "#fffdf7"
  ultramarine: "#4255ff"
  coral: "#ff5b3d"
  chartreuse: "#d8ff52"
  sky: "#8fc8ff"
  success: "#16834b"
  warning: "#a44d00"
  danger: "#bb261d"
  ink-muted: "#51545d"
  line: "rgba(24, 26, 32, 0.18)"
  acetate: "rgba(255, 253, 247, 0.78)"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Radar Display, Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(5.2rem, 15vw, 12.5rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Radar Display, Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(3.4rem, 8vw, 7.4rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Radar Display, Anton, Arial Narrow, sans-serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Radar UI, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Radar UI, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
  action:
    fontFamily: "Radar UI, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  control: "12px"
  card: "16px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "6": "1.5rem"
  "8": "2rem"
  "12": "3rem"
  "16": "4rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bone}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.ultramarine}"
    textColor: "{colors.bone}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
  tab-progress:
    backgroundColor: "{colors.ultramarine}"
    textColor: "{colors.white}"
    typography: "{typography.action}"
    rounded: "10px 10px 0 0"
    padding: "10px 14px"
  artist-card:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "18px"
  account-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "18px"
    padding: "32px"
---

# Design System: Radar

## Overview

**Creative North Star: "Camadas Vivas"**

Radar transforma escuta externa em progresso que parece físico, permanente e digno de compartilhar. O mundo visual é direto, inclusivo, tátil e editorial: marfim e tinta criam o plano de leitura, enquanto ultramarino, coral e chartreuse acrescentam ação, sociabilidade e conquista como folhas coloridas que entram na composição.

A profundidade é estrutural. Acetatos translúcidos, abas perfuradas, cartões sobrepostos e sombras macias tornam a evolução visível sem recorrer a brilho tecnológico genérico. A marca-mãe permanece estável e legível; artistas, cartas e coleções trazem a personalização, para que públicos e gêneros musicais diversos caibam no mesmo sistema.

O sistema rejeita interface de player escuro com neon, glassmorphism, linguagem de cassino ou gacha e qualquer enquadramento de cartas como NFT ou ativo financeiro. A sequência narrativa durável é: promessa de marca, progresso material da carta de artista, progresso da conta e componentes reutilizáveis que culminam em peças compartilháveis.

**Key Characteristics:**

- Contraste editorial de marfim e tinta com acentos cromáticos de função clara.
- Progresso representado por camadas, abas, selos e profundidade material.
- Tipografia de display condensada e direta combinada a uma interface hiperlegível.
- Componentes táteis e confiantes, com estados rápidos e legíveis.
- Personalização concentrada no conteúdo de artistas, cartas e coleções.

## Colors

A paleta combina uma base editorial quente e estável com três acentos francos que tornam ação, atividade social e conquista imediatamente distinguíveis.

### Primary

- **Ultramarino de Progresso** (`colors.ultramarine`): identifica ações primárias, avanço, superfícies de destaque e a camada ativa do sistema.

### Secondary

- **Coral Social** (`colors.coral`): sinaliza atividade entre pessoas, marcos compartilháveis e a segunda camada de uma composição.

### Tertiary

- **Chartreuse de Conquista** (`colors.chartreuse`): marca novidade, conquista, selos e o recorte diagonal do símbolo. Seu alto contraste deve permanecer raro e intencional.
- **Azul Descoberta** (`colors.sky`): apoia estados iniciais, descoberta e informação complementar sem competir com o ultramarino.

### Neutral

- **Tinta Estrutural** (`colors.ink`): texto principal, contornos, fundos invertidos e fundação de alto contraste.
- **Marfim de Base** (`colors.bone`): superfície dominante e plano editorial quente.
- **Papel Claro** (`colors.paper`): cartões e pranchas que precisam se separar sutilmente do marfim.
- **Tinta Atenuada** (`colors.ink-muted`): textos secundários e explicações, nunca conteúdo essencial em tamanho pequeno sem verificação de contraste.
- **Linha de Impressão** (`colors.line`): divisórias e grades discretas.
- **Acetato Translúcido** (`colors.acetate`): camada superior que permite enxergar a matéria abaixo.
- **Branco Direto** (`colors.white`): texto de máximo contraste sobre ultramarino e superfícies cromáticas escuras.
- **Verde de Sucesso, Âmbar de Atenção e Vermelho de Erro** (`colors.success`, `colors.warning`, `colors.danger`): estados semânticos; sempre acompanhados por texto, ícone ou forma, nunca apenas por cor.

### Named Rules

**The Color Has a Job Rule.** Ultramarino é ação e progresso; coral é social; chartreuse é conquista ou novidade. Não troque essas funções por variedade decorativa.

**The Stable Core Rule.** Marfim e tinta sustentam a marca; cores de artistas entram nas imagens e camadas secundárias sem substituir o núcleo Radar.

## Typography

**Display Font:** Radar Display, distribuída com Anton e fallback Arial Narrow
**Body Font:** Radar UI, distribuída com Atkinson Hyperlegible Next e fallback system-ui
**Label Font:** Radar UI, em peso forte e caixa alta quando funciona como metadado

**Character:** A voz visual combina impacto condensado com leitura aberta. Radar Display produz nomes, números e chamadas curtas que parecem impressos; Radar UI mantém navegação, métricas e explicações acessíveis para públicos diversos.

### Hierarchy

- **Display** (peso 400, escala fluida `typography.display`, entrelinha 0,92): identidade Radar e chamadas heroicas; sempre em caixa alta e poucas palavras.
- **Headline** (peso 400, escala fluida `typography.headline`, entrelinha 0,92): títulos de seção editoriais, normalmente limitados a cerca de 10 caracteres tipográficos de largura visual.
- **Title** (peso 400, 2rem, entrelinha 1): nomes de níveis e títulos compactos de cartas, em Radar Display e caixa alta.
- **Body** (peso 400, 1,06rem, entrelinha 1,45): descrições, instruções e explicações, normalmente limitadas a 54–60ch.
- **Label** (peso 700, 0,78rem, tracking 0,08em): metadados, versões e legendas compactas; caixa alta é apropriada quando o texto permanece curto.
- **Action** (peso 700, 1rem, entrelinha 1): botões, abas e controles que precisam manter leitura imediata.

### Named Rules

**The Short Display Rule.** Radar Display serve a nomes, níveis, números e frases curtas; nunca a parágrafos ou instruções longas.

**The Open Reading Rule.** Toda leitura funcional usa Radar UI e preserva diferenciação clara entre caracteres, pesos e estados.

## Layout

O sistema usa um contêiner central de até 1180px com margem lateral mínima de 20px, reduzida a 12px em telas estreitas. As páginas alternam seções de uma ou duas colunas, com assimetria editorial recorrente de aproximadamente 0,78/1,22 ou 0,86/1,14; a primeira viewport reserva escala dominante para a identidade Radar e espaço equivalente para a carta de artista em camadas.

O ritmo parte da escala de 4px e concentra espaçamento em 12, 16, 24, 32, 48 e 64px. Seções de apresentação respiram com cerca de 100–110px no eixo vertical; em celulares, comprimem para 72px sem reduzir a clareza interna. Grades densas usam intervalos de 12–18px, enquanto relações narrativas usam 40–96px.

Acima de 900px, identidade, princípio, conta e entrega podem usar duas colunas. Abaixo de 900px, essas relações empilham, a navegação reduz os links de seção e grades de cartas passam a duas colunas. Abaixo de 560px, ações ocupam a largura, grades se tornam uma coluna e a barra superior reduz para 62px. A composição deve continuar funcional sem depender de uma largura fixa.

**The One Dominant Layer Rule.** Cada viewport ou módulo escolhe uma camada dominante; as demais dão contexto e profundidade, sem competir por escala.

## Elevation & Depth

Radar usa um híbrido de sobreposição tonal e sombra macia. A sombra não é ornamento nem brilho: ela confirma que cartões, folhas e acetatos ocupam planos físicos diferentes. Superfícies de leitura comuns permanecem próximas do papel; cartas evoluídas e composições sobrepostas ganham profundidade proporcional ao significado do progresso.

### Shadow Vocabulary

- **Cartão Estrutural** (`0 14px 36px rgba(24, 26, 32, 0.18), 0 3px 8px rgba(24, 26, 32, 0.1)`): cartões principais, folhas de conta e pranchas claras sobre marfim.
- **Carta Elevada** (`0 18px 32px rgba(0, 0, 0, 0.24)`): cartas de artista apresentadas sobre fundo de tinta.
- **Camada Profunda** (`0 18px 45px rgba(0, 0, 0, 0.3)`): acetatos e folhas que se separam durante uma demonstração de evolução.
- **Arte em Primeiro Plano** (`drop-shadow(0 26px 32px rgba(24, 26, 32, 0.24))`): recorte aprovado da carta no primeiro viewport.

### Named Rules

**The Structural Shadow Rule.** Use sombra apenas para explicar separação física entre planos; não use glow, halo ou névoa tecnológica.

**The Progress Adds Matter Rule.** A evolução acrescenta camada, aba, selo ou conteúdo antes de acrescentar intensidade visual abstrata.

## Shapes

Controles são retângulos macios e táteis com 12px de raio; cartas usam 16px. Folhas de demonstração e grandes superfícies podem avançar para 18–20px quando a escala exige. Pílulas de raio total ficam reservadas a filtros, selos, estados compactos, barras de progresso e marcadores de versão.

Abas usam cantos superiores arredondados e base reta, como divisórias perfuradas de arquivo. Camadas aceitam pequenas rotações e deslocamentos, mas o conteúdo funcional permanece alinhado a uma grade estável. O símbolo combina arcos interrompidos, núcleo circular e aba diagonal; preserve sua área de proteção de pelo menos a largura do núcleo central.

**The Shape Signals Function Rule.** Retângulo macio é controle, cartão é conteúdo, pílula é estado compacto e aba é uma categoria ou camada de progresso.

## Components

Os componentes são táteis e confiantes: áreas claras, contraste direto, bordas precisas e respostas rápidas substituem brilho ou transparência sem função.

### Buttons

- **Shape:** retângulo macio com altura mínima de 48px e raio de controle (12px).
- **Primary:** tinta estrutural sobre marfim, texto forte e padding horizontal de 18px; no hover, passa a ultramarino e sobe 2px.
- **Hover / Focus:** transição rápida de 120ms com easing de saída; foco visível usa contorno ultramarino de 3px com offset de 4px. Em movimento reduzido, remova transição e deslocamento.
- **Secondary:** fundo transparente, borda de 1px na cor do contexto e mesma geometria do primário. Em superfície de tinta, texto e borda mudam para marfim.

### Chips

- **Style:** selos de estado usam pílula com padding de 9px por 12px, peso 700 e preenchimento chartreuse, coral ou azul descoberta conforme a função.
- **State:** abas de categoria não são pílulas; usam topo arredondado (10px 10px 0 0) e base reta para comunicar encaixe entre camadas.

### Cards / Containers

- **Corner Style:** cartas usam 16px; folhas de conta e camadas maiores usam 18px; pranchas de identidade podem usar 20px.
- **Background:** marfim sustenta cartas, papel separa folhas de leitura e tinta cria seções invertidas.
- **Shadow Strategy:** use Cartão Estrutural em superfícies claras e Carta Elevada quando o cartão aparece sobre tinta.
- **Border:** bordas finas e translúcidas apenas quando ajudam a separar materiais próximos; nunca como grade ornamental em todos os contêineres.
- **Internal Padding:** 18px em cartas compactas, 28–36px em módulos de conta e componentes, até 64px em pranchas amplas.

### Navigation

- **Style:** barra superior de 72px, sticky, em marfim translúcido com blur discreto e divisor inferior; marca e links usam tinta, peso 600 e sublinhado ausente no repouso.
- **Hover / Focus:** links mantêm o tratamento tipográfico e recebem foco global claramente visível. Abaixo de 900px, mantenha marca e versão e esconda links de seção não essenciais.

### Artist Progress Card

A carta de artista é a assinatura material do sistema. Cada nível mantém imagem e nome como protagonistas e acrescenta uma faixa cromática, altura, informação, aba, selo ou acetato; raridade é conquistada por escuta e ações legítimas, nunca comprada. Valores de XP em artefatos conceituais são ilustrativos até validação de produto.

### Account Progress

O nível de conta usa número condensado dominante, barra de progresso legível, texto numérico explícito e selos de especialização. A barra nunca comunica estado apenas pela cor: exponha rótulo, valor e atributos acessíveis de progresso.

### Jornada Radar

A jornada organiza marcos verificáveis como um capítulo material: cabeçalho em papel, próxima camada dominante em ultramarino e trilha cronológica adjacente. Chartreuse confirma conquista; contorno e texto distinguem marco atual e futuro sem depender da cor. Mostre sempre valor atual, meta e ação seguinte. Marcos registram progresso existente e não devem sugerir prêmio aleatório ou XP adicional.

Após uma sincronização, use um recibo compacto em camadas para informar XP confirmado, artistas que avançaram e eventos analisados. A entrada mecânica de 180ms é reservada a esse momento de mudança real; sincronizações sem progresso usam linguagem neutra, sem celebração artificial.

O compartilhamento transforma a jornada em uma prancha pública de camadas, com totais e marcos, nunca histórico detalhado. A comparação usa colunas simétricas “Esta jornada” e “Sua jornada”, sem pódio, vencedor, ranking ou cor que declare superioridade; diferenças existem para iniciar conversa, não para hierarquizar gostos.

### Motion

Estados simples respondem em 120ms; entrada de uma nova camada acontece em 180ms com dois passos mecânicos (`steps(2, end)`). Movimento revela mudança de estado e oferece compartilhamento, sem celebrar cada faixa. `prefers-reduced-motion` recebe troca instantânea e nenhuma translação.

## Do's and Don'ts

### Do:

- **Do** faça marfim e tinta sustentarem a leitura antes de adicionar os acentos cromáticos.
- **Do** represente progresso com matéria visível: camadas, abas, selos, conteúdo e profundidade.
- **Do** mantenha a marca Radar estável enquanto artistas e coleções trazem diversidade visual.
- **Do** use Radar UI em toda leitura funcional e Radar Display apenas em mensagens curtas e dominantes.
- **Do** acompanhe cor e movimento com texto, forma, estado acessível e alternativa para movimento reduzido.
- **Do** trate cartas e marcos como histórias pessoais compartilháveis, não como objetos de especulação.

### Don't:

- **Don't** transforme Radar em uma interface de player escuro com neon.
- **Don't** use glassmorphism como material genérico; transparência existe apenas quando funciona como acetato e revela uma camada real.
- **Don't** use códigos visuais de cassino, gacha, loot box ou recompensa comprada.
- **Don't** enquadre cartas como NFT, investimento ou ativo financeiro.
- **Don't** deixe sombras, rotações ou cores de artistas comprometerem legibilidade, contraste ou hierarquia.
- **Don't** infantilize a interface nem presuma familiaridade prévia com jogos.
