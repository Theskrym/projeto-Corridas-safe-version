# Atualização de alertas de dependências

## Resultado

| Auditoria | Antes | Depois |
|---|---:|---:|
| Total | 20 (10 moderados, 10 altos) | 0 |
| Dependências de produção (`npm audit --omit=dev`) | Não medido no baseline | 0 |

O `npm audit fix` sem `--force` removeu os alertas altos e reduziu o total para 9 moderados. Os restantes exigiam uma versão major do roteador e uma versão incompatível do `minimatch`; após aprovação, ambos foram atualizados.

## Alterações

- Atualizado `react-router-dom` para `7.18.5`, corrigindo os alertas de produção transitivos de `react-router`.
- Fixado o override de `minimatch` em `^11.0.8`, removendo os alertas da árvore `typescript-eslint`.
- Declarada a faixa de Node.js `^20.0.0 || >=22.0.0`, compatível com React Router 7 e `minimatch` 11.
- Atualizado `frontend/package-lock.json` com a árvore resolvida; versões diretas vulneráveis como Axios, PostCSS e Vite também foram atualizadas para resoluções corrigidas.

## Validação

Executado com Node.js 24:

- `npm ci` — concluído; 0 vulnerabilidades.
- `npm audit` — 0 vulnerabilidades.
- `npm audit --omit=dev` — 0 vulnerabilidades.
- `npm run build` — concluído.
- ESLint direcionado aos componentes alterados — concluído.
- Smoke test no navegador: página 404 abriu e o botão retornou ao login após a migração do React Router.

Reexecutar `npm audit` periodicamente; esta contagem representa a árvore travada validada nesta atualização.
