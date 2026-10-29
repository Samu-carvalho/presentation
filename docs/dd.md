Informações de contexto:
Para identificar uma pessoa se uma um número de credencial que está composto por 3 partes:
Identificador do grupo familiar de 10 digitos normalmente chamado de cd_Titulo
Identificador da pessoa dentro do grupo de 2 digitos normalmente chamado de sq_Beneficiario
Identificador da credencial de 3 digitos

Diccionário de dados Autorizacao..vw_Autorizacao:
id_Autorizacao: Identificador único de uma autorização.
id_AutorizacaoDetalhe: Identificador do detalhe da autorização.
data_solicitacao: Data da solicitação.
data_prevista: Data prevista.
data_liberacao: Data de liberação, dia que a autorização foi liberada.
data_alta: Data de alta do paciente.
data_realizacao: Data de realização.
cd_Plano: Código do plano.
id_TipoServico: Identificador do tipo de serviço.
ds_TipoServico: Descrição do tipo de serviço.
id_AutorizacaoTipo: Identificador do tipo de autorização.
ds_AutorizacaoTipo: Descrição do tipo de autorização.
cd_titulo: Identificador do grupo familiar do associado.
sq_beneficiario: Identificador da pessoa dentro do grupo familiar.
id_Beneficiario: Identificador único do beneficiário.
ds_beneficiario: Nome do beneficiário.
dt_nascimento: Data de nascimento do beneficiário.
cd_sexo: Código do sexo do beneficiário.
dh_inicio_fluxo: Data e hora de início do fluxo.
dh_fim_fluxo: Data e hora de fim do fluxo.
id_Status: Identificador do status.
ds_Status: Descrição do status.
tp_pendencia: Tipo de pendência.
tp_Auditoria: Tipo de auditoria.

Diccionário de dados Autorizacao..vw_AutorizacaoDetalheFluxo:
id_Autorizacao: Identificador único de uma autorização.
id_AutorizacaoDetalhe: Identificador do detalhe da autorização.
data_solicitacao: Data da solicitação.
data_prevista: Data prevista.
data_liberacao: Data de liberação, dia que a autorização foi liberada.
data_alta: Data de alta do paciente.
data_realizacao: Data de realização.
cd_Plano: Código do plano.
id_TipoServico: Identificador do tipo de serviço.
ds_TipoServico: Descrição do tipo de serviço (odontologia ou medicina).
id_AutorizacaoTipo: Identificador do tipo de autorização.
ds_AutorizacaoTipo: Descrição do tipo de autorização.
dh_inicio_fluxo: Data e hora de início do fluxo.
dh_fim_fluxo: Data e hora de fim do fluxo.
id_Status: Identificador do status.
ds_Status: Descrição do status.
tp_pendencia: Tipo de pendência.
tp_Auditoria: Tipo de auditoria.

Diccionário de dados Autorizacao..vw_ProcedimentosAutorizados:
id_Autorizacao: Identificador único de uma autorização.
id_AutorizacaoDetalhe: Identificador do detalhe da autorização.
id_AutorizacaoDetalheProcedimento: Identificador do detalhe do procedimento da autorização.
tp_TipoServico: Tipo de serviço (M Medicina, O Odontologia).
ds_Credencial: Número da Credencial do associado.
cd_Titulo: Identificador do grupo familiar.
sq_Titular: Identificador da pessoa dentro do grupo familiar.
sq_Beneficiario: Identificador da pessoa dentro do grupo familiar.
ds_Beneficiario: Nome do beneficiário.
ds_Sexo: Sexo do beneficiário (Femenino, Masculino).
dt_nascimento: Data de nascimento do beneficiário.
nr_Idade: Idade do beneficiário.
dt_Solicitacao: Data da solicitação.
dt_Prevista: Data prevista.
cd_CID: Código CID Classificação Internacional de Doenças.
cd_CID1: Código CID 1 Classificação Internacional de Doenças.
cd_CID2: Código CID 2 Classificação Internacional de Doenças.
cd_CID3: Código CID 3 Classificação Internacional de Doenças.
cd_Plano: Código do plano.
cd_honorario: Código do honorário.
ds_honorario: Descrição do honorário.
cd_Servico: Código do serviço.
ds_Servico: Descrição do serviço.
id_Carencia: Identificador da carência.
cd_Carencia: Código da carência.
qt_Solicitado: Quantidade solicitada.
qt_Autorizado: Quantidade autorizada.
cd_CPFCNPJPrestadorSolicitante: CPF ou CNPJ do prestador solicitante.
cd_PrestadorSolicitante: Código do prestador solicitante.
ds_PrestadorSolicitante: Descrição do prestador solicitante.
nr_CrmSolicitante: Número do CRM do prestador solicitante.
uf_CrmSolicitante: Unidade federativa do CRM do prestador solicitante.
cd_CPFCNPJPrestadorExecutante: CPF ou CNPJ do prestador executante.
cd_PrestadorExecutante: Código do prestador executante.
ds_PrestadorExecutante: Descrição do prestador executante.
nr_CrmExecutante: Número do CRM do prestador executante.
ufCrmExecutante: Unidade federativa do CRM do prestador executante.
cd_CPFCNPJPrestadorLocal: CPF ou CNPJ do prestador local.
cd_PrestadorLocal: Código do prestador local.
ds_PrestadorLocal: Descrição do prestador local.
cd_Rede: Código da rede.
in_Diarias: Indicador de diárias.
vl_Autorizacao: Valor da autorização.
vl_Copagamento: Valor do copagamento.
vl_Franquia: Valor da franquia.
nr_Guia: Número da guia.
tp_atendimento: Tipo de atendimento.

Diccionário de dados Autorizacao..vw_AutorizacaoChamadoProtocoloDocumento:
id_chamado: Identificador único do chamado.  
cd_titulo: Identificador do grupo familiar.             
id_atendimento: Identificador do atendimento.  
id_Protocolo: Identificador do protocolo.  
nr_ProtocoloANS: Número do protocolo ANS.       
dh_AlteracaoData: Data de alteração.         
id_Autorizacao: Identificador da autorização.
id_Documento: Identificador do documento.
id_Status: Identificador do status.

Diccionário de dados Autorizacao..vw_Autorizacao_Chamado_Convocacao:
id_Autorizacao: Identificador único da autorização.
id_Atendimento: Identificador do atendimento.
id_chamado_origem: Identificador do chamado de origem.
id_chamado: Identificador do chamado.
id_classifica: Identificador da classificação.
ds_assunto: Descrição do assunto.
dh_atende_inicio: Data e hora de início do atendimento.
dh_encerramento: Data e hora de encerramento.
cd_usuario_encerra: Código do usuário que encerrou.
cd_usuario_atende: Código do usuário que atendeu.

Diccionario de dados Autorizacao..vw_Autorizacao_Pendencia:
id_Autorizacao: Identificador único da autorização.
cd_titulo: Identificador do grupo familiar.
id_Beneficiario: Identificador do beneficiário.
dh_Entrada: Data e hora de entrada.
id_Status: Identificador do status.
ds_Status: Descrição do status.
dh_InicioFluxo: Data e hora de início do fluxo.
tp_auditoria: Tipo de auditoria.
tp_pendencia: Tipo de pendência.
nm_AlteracaoLogin: Nome do usuário que realizou a alteração.

Diccionário de dados Autorizacao..vw_AutorizacaoDetalhe_Pendencia:
id_Autorizacao: Identificador da autorização.
id_AutorizacaoDetalhe: Identificador do detalhe da autorização.
cd_Plano: Código do plano.
dt_Uso: Data de uso, é a data em que foi feito o procedimento.
id_Fluxo: Identificador do fluxo.
dh_InicioFluxoDetalhe: Data e hora de início do fluxo do detalhe.
id_AutorizacaoDetalheStatus: Identificador do status do detalhe da autorização.
ds_Status: Descrição do status.
st_Liberacao: Status de liberação.
tp_Auditoria: Tipo de auditoria.
tp_Status: Tipo de status.

Diccionário de dados Autorizacao..vw_Autorizacao_Prestador:
id_Autorizacao: Identificador da autorização.
cd_Titulo: Identificador do grupo familiar do associado.
id_Beneficiario: Identificador único do beneficiário.
id_AutorizacaoDetalhe: Identificador do detalhe da autorização.
cd_Plano: Código do plano.
dt_Uso: Data de uso, é a data em que foi feito o procedimento.
dh_Solicitacao: Data e hora da solicitação.
dt_Realizacao: Data de realização.
id_Prestador: Identificador único do prestador.
cd_Prestador: Código do prestador.
ds_Prestador: Descrição (nome ou razão social) do prestador.
ds_PrestadorAbrev: Abreviação do nome ou razão social do prestador.
id_StatusPrestador: Identificador do status do prestador, indica por exemplo se está ativo ou inativo.
ds_StatusPrestador: Descrição do status do prestador.
nr_Crm: Número do CRM.
tp_Pessoa: Tipo de pessoa, indica se é física ou jurídica.
tp_Rede: Tipo de rede, indica se é rede de medicina ou odontologia.
id_Unidade: Identificador da unidade, o prestador pode atender em diferentes unidades, este id identifica a unidade específica.
nr_Documento: Número do documento.
tp_Documento: Tipo de documento indica se é CNPJ, CPF, etc.
id_TipoPrestador: Identificador do tipo de prestador.
ds_TipoPrestador: Descrição do tipo de prestador, indica se é Executante (quem faz o procedimento), Local (se é o prestador que forneceu o local, uma clínica por exemplo) ou se é Solictante (quem solicitou o procedimento).

Dicionário de dados Autorizacao..vw_Autorizacao_Prestador:
id_Autorizacao: Identificador único de uma autorização.
cd_Titulo: Identificador do grupo familiar do associado. 
id_Beneficiario: Identificador único do beneficiário.
id_AutorizacaoDetalhe: Identificador do detalhe da autorização.
cd_Plano: Código do plano.
dt_Uso: Data de uso, é a data em que foi feito o procedimento.
dh_Solicitacao: Data e hora da solicitação.
dt_Realizacao: Data de realização.
id_Prestador: Identificador único do prestador.
cd_Prestador: Código do prestador.
ds_Prestador: Descrição (nome ou razão social)do prestador.
ds_PrestadorAbrev: Abreviação do nome ou razão social do prestador.
id_StatusPrestador: Identificador do status do prestador, indica por exemplo se está ativo ou inativo.
ds_StatusPrestador: Descrição do status do prestador.
nr_Crm: Número do CRM.
tp_Pessoa: Tipo de pessoa, indica se é física ou jurídica.
tp_Rede: Tipo de rede, indica se é rede de medicina ou odontologia.
id_Unidade: Identificador da unidade, o prestador pode atender em diferentes unidades, este id identifica a unidade específica.
nr_Documento: Número do documento.
tp_Documento: Tipo de documento indica se é CNPJ, CPF, etc.
id_TipoPrestador: Identificador do tipo de prestador.
ds_TipoPrestador: Descrição do tipo de prestador, indica se é Executante (quem faz o procedimento), Local (se é o prestador que forneceu o local, uma clínica por exemplo) ou se é Solictante (quem solicitou o procedimento).


Diccionário de dados Autorizacao..vw_AutorizacaoOcorrencia_Detalhe
id_Autorizacao: Identificador único de uma autorização.
id_AutorizacaoDetalhe: Identificador único de um detalhe de uma autorização.  
id_AutorizacaoOcorrencia: Identificador único de uma ocorrencia de uma autorização.
id_AutorizacaoDetalheOcorrencia: Identificador único de um detalhe de uma ocorrencia de uma autorização.
id_Ocorrencia: Identificador único de uma ocorrencia.
ds_Ocorrencia_AutorizacaoDetalhe: Descrição                                        
dh_Entrada: Data de entrada               
dh_Fechamento: Data de fechamento            
ds_Observacao: Observações
dh_AlteracaoData: Data de alteração
nm_AlteracaoLogin: Logion de usuário que alterou


Diccionário de dados ContratoCliente..vwBenePlanoRede
id_beneplano: Id único de um beneficáio (uma pessoa)  
cd_titulo: Identificador do grupo familiar.
sq_beneficiario: Identificador do beneficiário/associado.
ds_beneficiario: nome do beneficiário/associado.          
cd_linha: Código da linha de plano    
cd_plano: código do plano de saúde do associado    
id_plano: Identificador único do plano de saúde do associado.    
dt_inicio_beneplano: Data de inicio de cobertura do plano para o associado.      
dt_fim_beneplano: : Data de final de cobertura do plano para o associado.               
cd_rede: Códifo de rede de prestadores que pode utilizar.     
ds_rede: Nome da rede de prestadores que pode utilizar.                          
tp_rede: Tipo de rede de prestadores (médico ou odontológicos)     
ds_modalidade: Indica se é um associado de empresa (a empresa paga o plano para ele) ou individual (ele que contrata o plano)

Diccionário de dados DW_Omint..vw_F_Custo - Tabela de prestações médicas consumidas pelo associado
ID_Plano: Identificador único de plan de saúde do associado.    
ID_Tipo: Tipo de plano (indica se é M=Médico ou O=Odontológico).     
ID_Holding: Identificado de holding de empresas.  
GrupoEmpresa: descrição do grupo de empresas.          
ID_Agente_Vendas: Identificador único do agente de vendas.  
AgenteVendas: Descrição ou nome do agente de vendas.            
ID_Linha: Identificado único de linha de plano.    
ID_Cobertura: Identificado de cobertura.  
ID_Empresa: Identificado único de empresa.  
Empresa: Descrição ou nome da empresa.                       
Nr_Coletivo: Número coletivo. 
Empresa_Mae: Códifo da empresa mãe.  
Mes_Reajuste: Mês que a empresa teve reajuste.  
ID_Idade: Idade do associado no momento do consumo/prestação médica.    
ID_Titulo: identificador do grupo familiar.  
Dsc_Titulo: nome do titular do grupo familiar.             
ID_Tp_Contrato: Identificado do tipo de contrato.  
ID_Sexo: Sexo (Femenino ou Masculino) do associado que fez o consumo.    
ID_Beneficiario: Identificador do associado/benediciario que fez o consumo.   
NomeBeneficiario: Nome do associado/benediciario que fez o consumo.                
ID_Periodo: Periodo do consumo.               
ID_Prestador: Identificador do prestador médico.    
Dsc_prestador: Nome/Descrição do prestador
PrestadorTipo: Tipo de prestador (médico ou odontológico)            
Id_Prestador_Principal: Identificador do prestador médico principal.   
Dsc_Prestador_Principal:Nome/Descrição do prestador principal.
ID_Patologia: Identificado da patología.  
Dsc_Patologia: Descrição da patologia.                  
ID_Categoria: Identificado da categoria.
Categoria: Descição do que é a pessoa dentro do grupo familiar (titular, conyuge, filho, etc).             
ID_Filial: Identificado da filial.   
Filial: Descrição da filial.              
ID_Regiao: Identificador da região.   
Regiao: Descrição da região.              
ID_Especialidade: Idenificador da especialidade.  
Especialidade: Especialdiade médica do consumo.            
ID_TipoAtendimento: Identificador do tipo de atendimento.
TipoAtendimento: Indica por exempo se foi uma Internacao Cirugica
ID_CanalVenda: Identificador de canal de venda do associado   
CanalVenda: Descrição de canal de venda do associado                      
Sistema: Indica se o consumo foi pelo sisteme F=Fechado (um prestador médico de rede OMINT) ou outra letra é libre escolha (consumo pago por reembolso)       
Adaptacao: Adaptação              
Dt_Adaptacao: Data da adaptação             
Ordem: Ordem       
Quantidade: Quantidade  
Nr_Processo: Número de processo  
Nr_Nota: Número da nota fiscal              
Vlr_Glosa: Valor da glosssa feito   
Vlr_Co_Pag: Valor do copay  
Vlr_Franquia: Valor da franquia
Vlr_Gasto: Valor do gasto médico/odontológico           
Vlr_Pago: Valor que foi pago            
Vl_Liquido: Valor liquido          
Vl_Aporte: Valor do aporte   
Qtd_Consultas_PS: Quantidade Pronto Socorro  
Qtd_Consultas_PS_LE: Quantidade Libre escolha (reembolsos)   
Qtd_Consultas_PS_RC: Quantidade RC  
Qtd_Diarias: Diarias de internação  
Qtd_Diarias_UTI: Diarias de Terapia Intensiva 
Qtd_Terapias: Quantidade de consultas de terapias  
Qtd_Terapias_LE:  Quantidade de consultas de terapias pela libre escolha (reembolsos) 
Qtd_Terapias_RC:  Quantidade de consultas de terapias RC
Dt_Pagto: Data de pagamento                 
Mes_Uso: Mês do consumo                  
Data_Alta: Data de alta se foi internação.                
Data_Aviso: Data de avsio.               
ID_estt_servico: Identificador de serviço.  
Dsc_estt_servico: Descrição do serviço médico/odontológico, muito importante para entender o que foi feito o que está sendo cobrado.  
ID_estt_grp: Id Grupo  
ID_estt_super_grp: Id Super Grupo  
ID_Convergencia: Id Convergencia  
Dsc_Convergencia: Descrição do procedimento médico, muito importante para entender o que foi feito o que está sendo cobrado.
Contar      
ID_converg_itm: Identificado de item de convergencia.  
ID_converg_grp:  Identificado de grupo de convergencia.  
ID_converg_cap:  Identificado de item de convergencia cap.    
FatorUso: Fator de uso.            
Dt_Ingresso_Benef: Data que o beneficiario/associado ingressou na OMINT.        
Dt_Baixa_Benef: Data que o beneficiario/associado saiu (deixou de ter cobertura) na OMINT.                 
Dt_Nascimento: Data de nascimento do beneficiario.            
Dt_Ingresso_Plano: Data de ingresso no plano de saúde.        
Dt_Baixa_Plano: Data de baixa no plano de saúde.           
ID_Historico_AM: Identificado de Hitoórico AM.  
DataCarga: Data de carga deste registro.             

