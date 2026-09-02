# Controle de Contêineres — Armazém 2.1

## Melhorias
- Banco SQLite para não perder dados ao atualizar a página.
- Salvamento local quando a internet cai para cadastros/finalizações/edições.
- Sincronização automática ao voltar a conexão.
- Responsáveis editáveis, adicionáveis e removíveis.
- Data e horário de finalização editáveis.
- Pesquisa, contadores e interface responsiva.
- Responsáveis iniciais: Wendel, Romário e Leone.

## Rodar no computador
1. Instale Node.js 18+.
2. Abra o terminal na pasta do projeto.
3. Execute `npm install`.
4. Execute `npm start`.
5. Abra `http://localhost:3000`.

## Render
- Environment: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Para persistência no Render, configure um disco persistente e `DB_PATH` apontando para um arquivo dentro do disco.
