# Instruções gerais 

Atue como um experto desenvolvedor senior node.js v24.
Desenvolva o projeto de um assistente automatizado de análise de autorizações médicas e odontológicas.
O assistente deve:
- Buscar todos os dados de uma autorização 
- Aplicar um prompt de análise
- Responder e persistir o resultado da analise

# Restrições técnicas

Utilize so dependencias conhecidas no mercado e seguras.
- mssql para acesso a banco de dados
- fetch para APIs
- express como server
- dotenv configuração e dados sensiveis
- dotenvx configuração e dados sensiveis cryptografados
- winston para logs
- pode recomendar outras e eu vou te confirmando ou negando

Desenvolva um projeto simples, pequeno, seguindo as melhores práticas de desenvolvimento, estrutura de pastas e arquitetura, mas sempre mantenha a simpleza.

# Logs

Preciso que todos os passos gerem um log detalhado em um arquivo diário usando winston.
O log deve ter essa estrutura: YYYY-MM-DD HH:MM:SS [Rotina] [Detalhe] [Dados importantes para o log, pode ser um JSON ou os dados RAW mesmo trimados, só 30 ou 40 carateres como referencia]
Preciso que o projeto inclua uma página /logs que apresente de forma clara incluindo os dados JSON ou RAW para analisar com um "+" quando o Administrador precisar
Preciso que a pasta \logs mantenha só os logs dos últimos 5 dias

# Baseline

Estou incluindo aqui alguns arquivos de um projeto que já existe e que gosto muito como baseline.
Avalie como experto senior e continue desenvolvendo nesse mesmo modelo.
Se tem alguma sugestão faça e vamos aprovando.

\docs pasta para documentos em geral para o desenvolvimento do projeto
    dd.md diccionário de dados
    dev.md requisito e especificação para desenvolvimento

\logs pasta para logs

\prompts pasta para prompts, a ideia é poder ter mais de um, por exemplo: um prompt para analisar auditría média de uma autorização, outro para analisar pendencias, outro específico para odontologia. Por isso o endpoint recebe o id de autorização para analisar e o prompt que deve aplicar

\public front end web

\src código fonte. Inicialmente deixei aí alguns arquivos que gosto, me parecem bem desenvolvidos. Avalie como experto o que da para reutilizar.

.env enviroment, deixei um .env completo. Mantenha oa que precisar, limpe o que não vai usar.

.env.sample enviroment (para publciar no git), deixei um .env completo. Mantenha oa que precisar, limpe o que não vai usar.

.env.keys keys para enviroment cryptografado com dotenvx, deixei um .env completo. Mantenha oa que precisar, limpe o que não vai usar.

.env.keys.sample keys para enviroment cryptografado com dotenvx (para publciar no git), deixei um .env completo. Mantenha oa que precisar, limpe o que não vai usar.

server.js o server do web aplication. Avalie como experto o que da para reutilizar.

# Camada de acesso ao banco de dados

Construa uma camada API para acesso a banco de dados mapeando todas as tabelas que inclui no diccionário de dados dd.md
Monte querys sempre filtrando por id autorização.

# Tools 

Deve mapear cada API como uam tool do modelo de IA.
Me pergunte se tem alguma dúvida para detalhar bem cada tool.

# Detalhe do funcionamento

O projeto deve expor uma API chamada "analisar" que receba um id de autorização e um prompt para aplicar.
Deve carregar o prompt da pasta \prompts no system.
Com as Tools que tem mapeadas deve ir buscando a informação que precisar para analisar seguindo o procedimento descrito no prompt.
Fazer toda a análise persistindo em cada passo um log como foi mencionado acima.
Ao finalzar deve persistir um arquivo .md detalhando toda a analise quefoi feita indicando id da autorização, datas, prestadores, associado, resumo do analise solicitado, todos os dados que buscou para analisar e a conlusão do análise incluindo o resultado que o prompt solicite.
Veja que não é só o que o prompt solicite, é toda a informação e lógica que usou para a análise.
Esses arquivos de resultado deven ficar disponiveis para consultar via web. Vou precisar um endpoint que receba um id autorização e apresente em uma UI moderna (seguindo a guide do projeto baseline) o .md resultado em formato web (processando o md).

Antes de começar faça todas as perguntas que precisar, seja crítico. Faça todas as sugestões que considere importante.



===

# Camada de acesso ao banco de dados

Atualize a camada API para acesso a banco de dados mapeando todas as tabelas que inclui no diccionário de dados dd.md
Revise as que já estão e agregue as novas que inclui.
Monte querys sempre filtrando por id autorização.

# Tools 

Atualize as Tools mapeando as novas APIs como uam tool do modelo de IA.
Me pergunte se tem alguma dúvida para detalhar bem cada tool.


Antes de começar faça todas as perguntas que precisar, seja crítico. Faça todas as sugestões que considere importante.