1) Objetivo principal 

Desenhar um modelo preditivo de padrão de desvio de utilização e/ou fraude, com capacidade de identificar, priorizar e sinalizar títulos e empresas que apresentem comportamento fora do padrão esperado, considerando variáveis assistenciais, cadastrais, transacionais e histórico investigativo. 

A hipótese é que desvios de utilização e potenciais fraudes não se manifestam em um único evento isolado, mas sim em combinações de padrões e sinais distribuídos ao longo da jornada do contrato e da utilização assistencial. 

Ou seja, o ganho não está apenas em apontar um evento suspeito, mas em reconhecer padrões multivariados. 

O modelo deve considerar, de forma integrada, os seguintes eixos de análise: 

a) Declaração de Saúde (DS) 

Pendências de retificação 
Inconsistências entre DS informada e padrão de uso posterior 
Indícios de omissão de condição prévia com reflexo em utilização precoce e relevante 

b) Utilização na rede credenciada 

Cobranças de atendimento sem papel via token 
Frequência, recorrência e concentração de uso 
Padrões atípicos por especialidade, CID, prestador, janela temporal e beneficiário 

c) Autorizações em rede credenciada 

Solicitações e autorizações de procedimentos/terapias 
Autorizações com status pendente aguardando retificação da DS – chamados. 
Relação entre autorização, tempo de contrato e padrão assistencial esperado 

d) Contas hospitalares pós-evento 

Acompanhamento de contas hospitalares 
Relação entre evento agudo, histórico anterior e comportamento pós-evento 
Evolução do custo após ocorrência assistencial relevante 

e) Utilização na livre escolha  

Frequência e intensidade de uso 
Persistência de índice elevado de utilização 
Cruzamento com regras antifraude já existentes no sistema de reembolso 
Casos gerenciados pelo NUSP com manutenção de comportamento de alta utilização 

f) Histórico investigativo 

vínculo com prestadores, CIDs, frequências ou comportamento já associados a casos de baixa por fraude. 

2) Pergunta analítica que o modelo deve responder 

Quais títulos, beneficiários apresentam comportamento de utilização estatisticamente e operacionalmente fora do padrão esperado, com maior probabilidade de representar desvio de uso, inconsistência assistencial relevante ou potencial fraude? 

3) Score preditivo 

Criar um score de risco com base em pesos e correlações históricas, capaz de responder: 

qual o risco relativo daquele caso? 
quais variáveis explicam o risco? 
qual a prioridade de análise? 

4) Saída esperada do modelo 

O modelo não deve entregar apenas um “alerta”, mas sim uma visão acionável para operação. 

Para cada título/contrato sinalizado: 

Score de risco 
Motivos do apontamento 
Tipo de desvio predominante  

Ações recomendadas 

monitorar 
priorizar análise 
acionar Autorização 
acionar Reembolso 
acionar Investigação/NPI 
acompanhamento conjunto com NUSP 