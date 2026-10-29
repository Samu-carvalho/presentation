# OMT Analise Autorizacoes

Assistente automatizado para analise de autorizacoes medicas e odontologicas.

O sistema recebe um identificador de autorizacao e um prompt de analise, consulta as fontes de dados necessarias, executa raciocinio com Azure OpenAI e persiste o resultado em Markdown para consulta web.

## Objetivo de negocio

- Buscar todos os dados relevantes de uma autorizacao.
- Aplicar um prompt de analise especializado.
- Gerar um resultado final legivel para analista de autorizacoes (linguagem de negocio).
- Persistir o resultado para rastreabilidade.
- Registrar logs detalhados de ponta a ponta para operacao e auditoria.

## Requisitos atendidos

- Node.js 24.
- Backend com Express.
- Acesso ao SQL Server com mssql.
- Chamada ao Azure OpenAI com fetch nativo.
- Configuracao por variaveis de ambiente.
- Suporte a variaveis criptografadas no .env via dotenvx (prefixo encrypted:).
- Logs diarios com winston no formato:
  - YYYY-MM-DD HH:MM:SS [Rotina] [Detalhe] [Dados importantes]
- Retencao automatica de logs (ultimos 5 dias por padrao).
- Tela web de logs com detalhamento expansivel (+).
- Resultado final em .md e visualizacao web em HTML.

## Escopo funcional

Entrada principal:
- idAutorizacao
- prompt (nome do arquivo em prompts, sem necessidade de extensao)

Saida principal:
- arquivo results/<idAutorizacao>.md
- visualizacao em /resultado/:idAutorizacao

Fluxo de alto nivel:
1. API recebe requisicao de analise.
2. Prompt e carregado da pasta prompts.
3. Modelo chama ferramentas de dados conforme necessario.
4. Sistema busca dados nas views SQL mapeadas.
5. Resultado textual e normalizado para linguagem de negocio (sem nomes tecnicos de campo).
6. Markdown final e salvo em disco.
7. Resultado e disponibilizado na interface web.

## Arquitetura

```mermaid
flowchart TD
  A[Cliente Web / API] --> B[/api/analisar]
  B --> C[analysisService]
  C --> D[Azure OpenAI chat/completions]
  C --> E[analysisTools]
  E --> F[authorizationRepository]
  F --> G[(SQL Server)]
  C --> H[businessLabels]
  C --> I[resultStore]
  I --> J[results/<idAutorizacao>.md]
  A --> K[/resultado/:idAutorizacao]
  K --> L[resultado.html + result.js]
  A --> M[/logs]
  M --> N[logs.html + logs.js]
```

## Estrutura de pastas

- server.js: ponto de entrada do servidor HTTP.
- src/analysisService.js: orquestracao da analise e do ciclo de tools do modelo.
- src/analysisTools.js: definicao e execucao das tools usadas pelo modelo.
- src/authorizationRepository.js: consultas por view/tabela de autorizacao e contact center.
- src/db.js: conexao SQL Server, pool, retry e resiliencia de conexao.
- src/openaiClient.js: cliente Azure OpenAI.
- src/businessLabels.js: tradutor de nomes tecnicos para labels de negocio.
- src/resultStore.js: persistencia dos arquivos .md de resultado.
- src/logger.js: infraestrutura de logs.
- prompts/: prompts de analise.
- public/: interfaces web (home, processamento automatico, logs, resultado).
- logs/: arquivos de log diarios.
- results/: arquivos markdown gerados.
- docs/dd.md: dicionario de dados de referencia.
- docs/dev.md: requisitos e orientacoes de desenvolvimento.

## Ferramentas de dados (tools do modelo)

Todas as consultas sao filtradas por idAutorizacao, exceto as de ContactCenter por idChamado.

Tools implementadas:
- BuscarAutorizacao
- BuscarAutorizacaoDetalheFluxo
- BuscarProcedimentosAutorizados
- BuscarAutorizacaoChamadoProtocoloDocumento
- BuscarAutorizacaoChamadoConvocacao
- BuscarAutorizacaoPendencia
- BuscarAutorizacaoDetalhePendencia
- BuscarAutorizacaoPrestador
- BuscarAutorizacaoOcorrenciaDetalhe
- BuscarContactCenterReport
- BuscarContactCenterReportObs

Views mapeadas:
- Autorizacao..vw_Autorizacao
- Autorizacao..vw_AutorizacaoDetalheFluxo
- Autorizacao..vw_ProcedimentosAutorizados
- Autorizacao..vw_AutorizacaoChamadoProtocoloDocumento
- Autorizacao..vw_Autorizacao_Chamado_Convocacao
- Autorizacao..vw_Autorizacao_Pendencia
- Autorizacao..vw_AutorizacaoDetalhe_Pendencia
- Autorizacao..vw_Autorizacao_Prestador
- Autorizacao..vw_AutorizacaoOcorrencia_Detalhe
- ContactCenter..vw_cc_report
- ContactCenter..vw_cc_report_obs

## API e interfaces

### Health
- GET /health

Resposta esperada:
```json
{ "ok": true }
```

### Executar analise
- POST /api/analisar

Body:
```json
{
  "idAutorizacao": 502632,
  "prompt": "analise-geral"
}
```

Resposta (sucesso):
```json
{
  "ok": true,
  "idAutorizacao": 502632,
  "prompt": "analise-geral.md",
  "steps": 4,
  "resultPath": "502632.md",
  "viewUrl": "/resultado/502632"
}
```

### Resultado em JSON + HTML renderizado
- GET /api/resultado/:idAutorizacao

### Resultado em tela
- GET /resultado/:idAutorizacao

### Processamento automatico por URL
- GET /analisar?idAutorizacao=502632&prompt=analise-geral

Comportamento:
- pagina inicia o processamento automaticamente,
- acompanha progresso visual,
- redireciona para /resultado/:idAutorizacao ao concluir.

### Logs
- GET /logs
- GET /api/logs
- GET /api/logs/:file

## Linguagem de negocio no resultado

O sistema aplica duas camadas para manter o arquivo final legivel para analista:

1) Instrucao forte no prompt do sistema
- proibicao de termos tecnicos (tools, API, query, etc.)
- proibicao de nomes tecnicos de campo

2) Normalizacao automatica no backend
- tradutor tecnico -> negocio em businessLabels
- exemplo:
  - ds_Ocorrencia_AutorizacaoDetalhe -> Detalhe da ocorrencia
  - dh_AlteracaoData -> Data de alteracao do registro
  - ds_Observacao -> Observacoes da ocorrencia

## Logs e observabilidade

Formato da linha de log:
- YYYY-MM-DD HH:MM:SS [Rotina] [Detalhe] [Dados importantes]

Caracteristicas:
- logs em arquivo diario em logs/YYYY-MM-DD.log
- retencao configuravel (padrao 5 dias)
- mascaramento basico de dados sensiveis (cpf, cnpj, token, etc.)
- exposicao web para consulta operacional

## Variaveis de ambiente

Base de referencia:
- .env.sample

### SQL Server
- MSSQL_SERVER
- MSSQL_USER
- MSSQL_PASSWORD
- MSSQL_DATABASE
- MSSQL_ENCRYPT
- MSSQL_TRUST_SERVER_CERTIFICATE
- MSSQL_CONNECTION_TIMEOUT_MS
- MSSQL_QUERY_TIMEOUT_MS
- MSSQL_POOL_MAX
- MSSQL_POOL_MIN
- MSSQL_POOL_IDLE_MS
- MSSQL_POOL_ACQUIRE_MS
- MSSQL_RETRY_ATTEMPTS
- MSSQL_TOP_LIMIT

### Azure OpenAI
- AZURE_OPENAI_ENDPOINT
- AZURE_OPENAI_API_KEY
- AZURE_OPENAI_DEPLOYMENT
- AZURE_OPENAI_API_VERSION

### Analise/Tools
- TOOL_MAX_ROWS_TO_MODEL
- TOOL_MAX_TEXT_CHARS

### Logs
- LOG_LEVEL
- LOG_KEEP_DAYS
- LOG_MAX_CHARS

## Dotenvx e segredos criptografados

O projeto inicia com:
- node --import @dotenvx/dotenvx/config server.js

Isso permite:
- ler variaveis em texto puro no .env
- descriptografar variaveis com prefixo encrypted: usando .env.keys

Exemplo de uso misto no .env:
- MSSQL_USER=encrypted:...
- MSSQL_PASSWORD=encrypted:...
- AZURE_OPENAI_API_KEY=valor_em_texto_puro

Observacao:
- apenas variaveis com prefixo encrypted: sao descriptografadas.
- variaveis sem prefixo sao lidas como texto normal.

## Como executar localmente

Pre-requisitos:
- Node.js >= 24
- Acesso ao SQL Server alvo
- Recurso Azure OpenAI com deployment ativo

Passos:
1. Instalar dependencias
   - npm install
2. Configurar .env com base no .env.sample
3. Garantir que .env.keys esteja presente quando usar encrypted
4. Iniciar
   - npm start
5. Abrir
   - http://localhost:3000

## Qualidade e resiliencia

- Validacao de entrada na API.
- Sanitizacao de nome de tabela no repositorio SQL.
- Retry de query em erros transientes de conexao.
- Reset de pool em erro de conexao do mssql.
- Compactacao dos dados enviados ao modelo para evitar payload excessivo.

## Troubleshooting

### Erro: Azure OpenAI env vars ausentes
Possiveis causas:
- variaveis nao definidas no .env
- inicializacao sem --import @dotenvx/dotenvx/config

Checklist:
- conferir scripts npm start/npm dev
- validar AZURE_OPENAI_* no ambiente

### Erro: fetch failed no Azure OpenAI
Possiveis causas:
- falha de rede/TLS/DNS
- payload grande demais

Mitigacoes implementadas:
- log do tamanho do payload em KB
- limite de linhas por tool
- truncamento de campos textuais longos

### Erro: Connection lost - socket hang up no SQL
Possiveis causas:
- conexao interrompida no pool
- credencial incorreta
- rede/firewall/porta

Mitigacoes implementadas:
- retry em erros transientes
- reset do pool quando conexao quebra

Checklist:
- validar MSSQL_SERVER e MSSQL_DATABASE
- validar usuario/senha descriptografados pelo dotenvx
- validar acesso de rede ao SQL Server

## Evolucao recomendada

- Adicionar testes de integracao para /api/analisar com mocks de SQL e OpenAI.
- Adicionar autenticacao para /logs e /resultado em ambientes produtivos.
- Persistir versoes de resultado por timestamp (historico) opcional.
- Adicionar metrica de latencia por etapa de coleta e por chamada ao modelo.


