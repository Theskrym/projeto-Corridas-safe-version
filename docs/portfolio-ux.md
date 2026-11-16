# Portfólio de UX — Sistema de Gerenciamento de Corridas

> **Estado do material:** este documento é o espaço de trabalho do portfólio. Os testes com pessoas, gravações, respostas da equipe, auditorias automáticas e validações no Figma ainda precisam ser realizados e anexados. Não há resultados de pesquisa ou relatórios antes/depois disponíveis neste repositório; os campos abaixo são registros para preencher, não resultados.

## 1. História do projeto

### Contexto e problema

O sistema web organiza corridas institucionais, motoristas, veículos, agendamentos e notificações. Administradores gerenciam cadastros e relatórios; motoristas acessam o fluxo de agendamento. O problema de UX a validar é se cada perfil consegue concluir sua tarefa principal com clareza, sem erros evitáveis e usando diferentes dispositivos e tecnologias assistivas.

- **Problema observado / evidência de origem:** preencher após entrevista ou observação; não presumir necessidades sem dados.
- **Público e contexto de uso:** confirmar com usuários reais e responsáveis pelo processo.
- **Objetivo de produto:** permitir organizar e acompanhar corridas com menos dúvidas e retrabalho.
- **Indicador de sucesso:** definir com a equipe antes do teste (por exemplo: conclusão da tarefa, erros e ajuda solicitada).

### Solução atual

Aplicação React/TypeScript com autenticação, painel administrativo, agendamento de corridas, cadastros, notificações e relatórios. A interface tem navegação distinta por perfil. Os ajustes desta entrega cobrem rótulos e erros dos campos compartilhados, estados de carregamento/erro do painel, foco visível, preferência por movimento reduzido e uma página 404 responsiva.

### Personas e jornada — revisar com participantes

Não há pesquisa de usuários anexada. Estas são **hipóteses de trabalho**, não personas validadas:

| Perfil hipotético | Objetivo | Necessidade a validar | Jornada atual a observar |
|---|---|---|---|
| Pessoa administradora | Organizar corridas e recursos | Consultar disponibilidade e resolver conflitos | Entrar → painel → corridas/veículos/motoristas → cadastrar ou editar → confirmar |
| Pessoa motorista | Consultar e solicitar uma corrida | Entender o que é obrigatório e acompanhar o pedido | Entrar → agendamento → informar dados → enviar → verificar confirmação |

Após cada rodada, registrar evidência (código anônimo, data, tarefa), atualizar necessidades e jornada, e manter explícito o que mudou e qual observação sustentou a mudança.

## 2. Avaliação e validação

### Avaliação heurística cruzada — 10 heurísticas de Nielsen

O grupo avaliador deve ser outro grupo/aluno. Avalie telas e fluxos reais, registre evidência por ocorrência e use severidade de 0 a 4:

| Nota | Severidade |
|---:|---|
| 0 | Não é um problema de usabilidade |
| 1 | Cosmético; baixa prioridade |
| 2 | Problema menor; corrigir quando possível |
| 3 | Problema importante; alta prioridade |
| 4 | Catástrofe de usabilidade; corrigir antes da entrega |

| # | Heurística | Tela/etapa | Evidência (passos, captura) | Problema e impacto | Severidade (0–4) | Resposta do grupo: corrigiu ou justificou? | Evidência da resposta |
|---:|---|---|---|---|---:|---|---|
| 1 | Visibilidade do status do sistema | | | | | | |
| 2 | Correspondência entre sistema e mundo real | | | | | | |
| 3 | Controle e liberdade do usuário | | | | | | |
| 4 | Consistência e padrões | | | | | | |
| 5 | Prevenção de erros | | | | | | |
| 6 | Reconhecimento em vez de memorização | | | | | | |
| 7 | Flexibilidade e eficiência de uso | | | | | | |
| 8 | Estética e design minimalista | | | | | | |
| 9 | Reconhecer, diagnosticar e recuperar-se de erros | | | | | | |
| 10 | Ajuda e documentação | | | | | | |

Faça uma linha para cada problema encontrado. “Corrigiu” deve apontar para a tela/código atualizado; “justificou” deve explicar a decisão e quem a aprovou. Não inventar notas sem avaliação.

### Teste A/B simples

**Tarefa proposta:** iniciar o agendamento de uma corrida. Prepare duas versões do mesmo cabeçalho/ação no protótipo, mantendo todo o resto idêntico:

- **A:** ação primária “Agendar corrida”.
- **B:** ação primária “Nova corrida”.

Confirme antes de publicar que ambos os rótulos levam ao mesmo fluxo e são adequados ao vocabulário dos participantes. Distribua A/B aleatoriamente, dê a mesma tarefa sem explicar o botão e registre conclusão, tempo, erros, hesitações e preferência. Use participantes comparáveis; com amostra pequena, descreva o resultado como exploratório, não como prova estatística.

| Participante anônimo | Versão (A/B) | Concluiu? | Tempo | Erros/hesitações observados | Preferência e motivo |
|---|---|---|---|---|---|
| | | | | | |

**Conclusão justificada:** preencher após os testes, comparar os indicadores definidos antes da sessão e citar observações que apoiem a decisão.

**Decisão:** ☐ A ☐ B ☐ inconclusivo. **Limitações:** ____________________.

### Teste de cinco segundos

Mostre a home por exatamente cinco segundos, oculte-a e pergunte sem sugerir a resposta: **“O que é esse sistema?”** Perguntas complementares: “Para quem parece ser?” e “O que você faria primeiro?”. Registre resposta literal, entendimento da finalidade, público percebido e confiança. Não explique a tela antes de coletar a resposta.

| Participante anônimo | Primeira resposta literal | Finalidade entendida? | Público percebido | O que faria primeiro? |
|---|---|---|---|---|
| | | | | |

### Registro de sessões

**Não gravar nem usar capturas identificáveis sem consentimento explícito.** Preferir conta e dados fictícios; informar objetivo, duração, uso e acesso ao registro, oferecer alternativa sem gravação e remover dados pessoais. Guardar os arquivos em local autorizado pela instituição, com acesso restrito, e registrar aqui apenas referências autorizadas.

| Sessão | Data | Consentimento confirmado | Artefato autorizado (arquivo/link) | Tarefa | Observações anonimizadas |
|---|---|---|---|---|---|
| | | | | | |

## 3. Acessibilidade — WCAG

Meta de avaliação: WCAG 2.2 nível AA. Uma ferramenta automática ajuda a encontrar problemas, mas não certifica conformidade nem substitui testes manuais.

### Auditoria automática antes/depois

Execute Lighthouse (Accessibility), axe ou WAVE na mesma rota, viewport, estado de autenticação e conjunto de dados antes e depois das correções. Salve o relatório original, anote versão/configuração da ferramenta e compare violações por critério, não apenas a nota geral. O estado **antes** só pode ser registrado se houver relatório real da versão anterior.

| Fase | Data/hora | Ferramenta e versão | Rota/viewport | Violações por impacto | Relatório/captura |
|---|---|---|---|---|---|
| Antes | Pendente | | | | |
| Depois | Pendente | | | | |

### Testes manuais

- **NVDA (Windows) ou VoiceOver (Apple):** concluir uma tarefa completa sem olhar a tela; conferir ordem de foco, nome/função/estado dos controles, títulos, regiões, mensagens e recuperação de erro. Registrar leitor/versão, navegador, tarefa e bloqueios.
- **Zoom 200%:** testar login, home, listagens, formulário e agendamento. Não deve haver conteúdo cortado nem rolagem horizontal para leitura normal; verificar reflow em viewport estreita equivalente.
- **Formulários:** verificar rótulo programático, instrução, obrigatório, erro textual associado e anunciado, foco no primeiro campo inválido e correção sem depender só de cor. A mensagem deve dizer como resolver.
- **Daltonismo:** simular protanopia, deuteranopia e tritanopia no navegador/Figma. Confirmar que status, seleção e erros também têm texto/ícone/padrão e que o contraste permanece utilizável.
- **Teclado:** percorrer todas as ações com Tab/Shift+Tab/Enter/Espaço; foco visível, ordem coerente, sem armadilha.
- **Alvos de toque:** medir controles interativos no celular; buscar pelo menos 44 × 44 CSS px.

| Critério/tarefa | Configuração | Resultado observado | Evidência | Correção/pendência |
|---|---|---|---|---|
| Leitor de tela — fluxo completo | | Pendente | | |
| Zoom 200% e reflow | | Pendente | | |
| Teclado | | Pendente | | |
| Daltonismo e informação além da cor | | Pendente | | |
| Alvos de toque ≥ 44 px | | Pendente | | |

## 4. Design system

### Tokens atualmente definidos no código

Os valores abaixo são tokens-base em `frontend/src/index.css`; ainda é necessário revisar todas as telas antigas para consistência visual e contraste.

| Token | Valor | Uso | Contraste medido em fundo branco |
|---|---|---|---|
| `--color-primary` | `#045CA4` | Ação/texto azul | 6,84:1 |
| `--color-primary-action` | `#0072C6` | Azul de ação legado | 4,97:1 |
| `--color-text` | `#1F2937` | Texto principal | 14,68:1 |
| `--color-text-muted` | `#4B5563` | Texto secundário | 7,56:1 |
| `--color-border` | `#6B7280` | Borda; não usar como único indicador | 4,83:1 |
| `--color-error` | `#B42318` | Erro | 6,57:1 |
| `--color-success` | `#166534` | Sucesso | 7,13:1 |

Contrastes calculados pela fórmula de luminância relativa WCAG em sRGB, com fundo branco. Reconfirmar com ferramenta de contraste e em todos os pares efetivamente usados; não aplicar texto branco sobre azul claro `#4DA6FF` (2,56:1). A medição de tokens não é um relatório de auditoria do produto.

### Tipografia, espaçamento e componentes

- **Fontes existentes:** Nunito Sans como base; DM Sans e Inter aparecem em estilos legados. Consolidar após revisar as telas; não depender de fonte externa para a legibilidade básica.
- **Escala tipográfica proposta:** 12, 14, 16, 20, 24, 32 e 48 px; texto corrido padrão a partir de 16 px onde o layout permitir.
- **Escala de espaçamento proposta:** 4, 8, 12, 16, 24, 32 e 48 px.
- **Componentes já compartilhados:** campo de formulário (`FormField`), erro/conflito (`FormError`), botões de navegação e cartões de indicadores.
- **Estados a especificar e validar para botão, input, card e alerta:** padrão, hover, foco por teclado, pressionado, desabilitado, erro e sucesso. Não comunicar apenas por cor. Documentar token, contraste, tamanho e comportamento responsivo de cada estado.

| Componente/estado | Figma (link/componente) | Implementação (arquivo/tela) | Diferença encontrada | Ação |
|---|---|---|---|---|
| Botão primário | Link do arquivo Figma pendente | `frontend/src/pages/NotFoundPage.css` (exemplo de ação) | | |
| Campo e erro | Link do arquivo Figma pendente | `frontend/src/components/form/FormField.tsx` | | |
| Card de indicador | Link do arquivo Figma pendente | `frontend/src/pages/HomePage.tsx` | | |
| Alertas | Link do arquivo Figma pendente | `frontend/src/components/form/FormError.tsx` | | |

O repositório não contém arquivo/link do Figma. Vincular aqui as bibliotecas/componentes usados nas telas e conferir a implementação lado a lado; não declarar paridade sem essa comparação.

## 5. Arquitetura da informação

### Mapa de telas observado no código

```text
Login
├── Recuperar senha
├── Área administrativa
│   ├── Início → Relatórios
│   ├── Corridas → Nova / Editar
│   ├── Motoristas → Novo / Editar
│   ├── Veículos → Novo / Editar
│   ├── Notificações → Detalhe
│   └── Dados pessoais → Alterar senha
└── Área de motorista
    └── Agendamento
```

Confirmar a arquitetura com pessoas usuárias e permissões reais; o mapa acima descreve rotas encontradas, não resultado de card sorting.

### Fluxo da tarefa principal — hipótese para validar

```text
Entrar → abrir Agendamento → informar origem, destino e data
→ revisar dados e disponibilidade → enviar → receber confirmação/status
```

Anexar um fluxograma atualizado após observar erros, decisões, retornos e estados alternativos. Incluir os fluxos de indisponibilidade, conflito e falha de rede.

### Card sorting e tree testing — executar com usuários

**Card sorting:** definir cartões com nomes reais de telas/ações; escolher aberto ou fechado antes da sessão; registrar participantes, agrupamentos, rótulos sugeridos, divergências e método de síntese. Só alterar o menu após explicar quais agrupamentos e evidências motivaram cada mudança.

**Tree testing:** usar uma árvore de texto sem layout visual. Exemplos de tarefas: “Onde você encontraria as corridas que já foram agendadas?”; “Onde alteraria um veículo?”; “Onde consultaria uma notificação?”. Registrar primeiro clique, sucesso, caminho e rótulo que causou dúvida.

| Método | Data e participantes (anônimos) | Artefato/dados | Aprendizado | Mudança de menu/árvore e justificativa |
|---|---|---|---|---|
| Card sorting | Pendente | | | |
| Tree testing | Pendente | | | |

## 6. Produto e experiência

- **Carregamento:** painel informa “Carregando indicadores…”, mantém a área ocupada identificável e anuncia o estado.
- **Erro:** painel informa falha e orienta atualizar a página; formulários apontam campo e explicam a correção.
- **Confirmação e estados vazios:** validar e completar em cada fluxo (cadastro, listagens, agendamento e notificações). Não há evidência suficiente neste portfólio para afirmar que todas as telas já têm estado vazio ou confirmação.
- **404:** mensagem clara e ação “Ir para o início”, com layout responsivo.
- **Responsividade:** conferir login, home, formulários, listas e agendamento em larguras de 320, 375, 768 e 1280 CSS px, com zoom e conteúdo realista.
- **Linguagem:** preferir instruções diretas em português, sem jargão; cada erro deve indicar o que aconteceu e como resolver. Revisão completa das mensagens ainda pendente.

| Tela/fluxo | Carregamento | Vazio | Sucesso/confirmação | Erro recuperável | Celular / toque |
|---|---|---|---|---|---|
| Painel | Parcialmente implementado | N/A | Pendente | Implementado com orientação | Pendente |
| Corridas | Pendente | Pendente | Pendente | Pendente | Pendente |
| Motoristas/veículos | Pendente | Pendente | Pendente | Pendente | Pendente |
| Agendamento | Pendente | Pendente | Pendente | Pendente | Pendente |
| Notificações | Pendente | Pendente | Pendente | Pendente | Pendente |

## 7. Changelog desde a segunda versão

O repositório não contém descrição verificável da segunda versão nem suas evidências; portanto, não é possível afirmar diferenças históricas. Este é o registro **das alterações feitas nesta rodada**:

| Alteração desta rodada | Motivo | Evidência/validação |
|---|---|---|
| Rótulos associados, indicação de obrigatório, estados inválidos e erros ligados ao campo compartilhado | Melhorar identificação e anúncio de campos e correções | Build/lint pendentes; teste com leitor de tela pendente |
| Foco visível, preferência por movimento reduzido, tokens-base e tipografia herdada nos controles | Melhorar navegação por teclado e estabelecer base consistente | Auditoria automática e teste manual pendentes |
| Estados de carregamento/erro anunciáveis no painel; ação de relatório é botão | Tornar estados perceptíveis e controle utilizável por teclado | Validar com NVDA/VoiceOver |
| 404 em português, sem imagem remota, com ação adaptável | Orientar recuperação sem depender de serviço externo | Validar em celular e zoom |
| HTML declara idioma `pt-BR` | Leitura correta por tecnologia assistiva | Verificação manual pendente |

Ao comparar com a segunda versão, incluir commit/data, capturas e justificativa apoiada por avaliação ou teste. Não substituir lacunas por suposições.

## 8. Apresentação

Cada aluno deve responder uma pergunta, usando uma linha por participante (adicione linhas conforme o tamanho do grupo):

| Aluno(a) | Pergunta individual | Resposta/evidência usada na apresentação |
|---|---|---|
| 1 | Qual evidência de usuário mudou sua decisão de projeto e o que você faria diferente sem ela? | |
| 2 | Que problema de acessibilidade você encontrou, como validou a correção e o que ainda falta? | |
| 3 | Que resultado dos testes sustenta a organização do menu? | |
| 4 | Qual decisão de design você manteria mesmo após um resultado inesperado, e por quê? | |

## 9. Checklist de entrega

- [ ] Avaliação cruzada preenchida para problemas encontrados; respostas “corrigiu/justificou” documentadas.
- [ ] Sessões A/B e de cinco segundos realizadas; conclusões justificadas e limitações declaradas.
- [ ] Consentimentos e artefatos de teste autorizados registrados.
- [ ] Relatórios automáticos reais antes/depois anexados.
- [ ] Fluxo completo com leitor de tela, zoom 200%, teclado, simulação de daltonismo e celular verificados.
- [ ] Personas/jornada revisadas com evidências.
- [ ] Card sorting, tree test, mapa e fluxograma atualizados com resultados reais.
- [ ] Componentes Figma vinculados às implementações e diferenças resolvidas.
- [ ] Estados vazios, confirmações, mensagens e alvos de toque verificados em todas as telas.
- [ ] Changelog histórico comparado com a segunda versão.
- [ ] Uma resposta/evidência por aluno na apresentação.
