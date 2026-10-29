// src/mockDados.js

export const MOCK_DADOS = {
  // Dados da empresa (cabeçalho) - corresponde ao RelatorioCabecalho
  relatorio: {
    Dt_Ingresso: '2018-05-01T00:00:00',
    ReajusteMed: 'Maio',
    ReajusteOdo: 'Maio',
    Agente: 'GALUPER CORRETORA DE SEGUROS LTDA - ME',
    DtFinal: '2026-08-07T00:00:00',
    DtInicial: '2026-02-07T00:00:00',
    EmpresaMae: 'CBRE CONSULTORIA DO BRASIL LTDA.'
  },

  // Empresas (lista)
  empresas: [
    {
      Id_Pessoa_Omint: 0,
      Cod_Empresa: '56020',
      Nr_Coletivo: 56020,
      Razao: 'CBRE CONSULTORIA DO BRASIL LTDA.',
      QTD_Vidas: 1439,
      Mes_Reajuste: 'Setembro',
      QTD_Odonto: 0,
      Atualizacao: '0001-01-01T00:00:00',
      EmpresaMae: 'CBRE CONSULTORIA DO BRASIL LTDA.',
      FlagOdonto: false
    },
    {
      Id_Pessoa_Omint: 85682499,
      Cod_Empresa: '56020-INAT',
      Nr_Coletivo: 56020,
      Razao: 'CBRE CONSULTORIA DO BRASIL LTDA - INATIVOS',
      QTD_Vidas: 49,
      Mes_Reajuste: 'Setembro',
      QTD_Odonto: 0,
      Atualizacao: '2026-08-01T00:00:00',
      EmpresaMae: 'CBRE CONSULTORIA DO BRASIL LTDA.',
      FlagOdonto: false
    },
    {
      Id_Pessoa_Omint: 0,
      Cod_Empresa: '00082120',
      Nr_Coletivo: 56020,
      Razao: 'CBRE CONSULTORIA DO BRASIL LTDA.',
      QTD_Vidas: 1439,
      Mes_Reajuste: 'Setembro',
      QTD_Odonto: 0,
      Atualizacao: '0001-01-01T00:00:00',
      EmpresaMae: 'CBRE CONSULTORIA DO BRASIL LTDA.',
      FlagOdonto: false
    }
  ],

  // Matriz de acesso (22 relatórios)
  matriz: Array.from({ length: 22 }, (_, i) => ({
    cd_MatrizAcesso: i + 1,
    ds_Relatorio: `Relatório ${i + 1}`,
    cd_Ordem: i + 1,
    cd_MinimoVidas: 0,
    cd_MaximoVidas: 99999,
    bt_ExclusivoOdonto: false,
    bt_AgenteVendas: true
  })),

  // Configurações
  configs: [
    {
      cd_Configuracao: 5,
      ds_Chave: 'CodigoUsuarioDashboard',
      ds_Valor: '00171255',
      ds_Descricao: 'Simulação da empresa que será utilizada na tela do dashboard',
      bt_Ativo: true
    }
  ],

  // Visualizações
  visu: { cd_VisualizacaoUsuario: 3815, ds_Usuario: '00171255', ds_Selecionados: '2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,1' },

  // ============================================================
  // RELATÓRIOS MOCKADOS (cada um com a estrutura que o front-end espera)
  // A estrutura é: { Dados: [ { Grupo, Coluna, Linha, Valor } ] }
  // ============================================================
  relatorios: [
    // Relatório 1 - Demonstrativo Consolidado por Produto
    {
      id: 1,
      ok: true,
      data: {
        Dados: [
          // Medic​ina
          { Grupo: 'Medicina', Coluna: 'PREMIUM', Linha: 'TÍTULOS', Valor: '0' },
          { Grupo: 'Medicina', Coluna: 'CORPORATE', Linha: 'TÍTULOS', Valor: '126' },
          { Grupo: 'Medicina', Coluna: 'SKILL', Linha: 'TÍTULOS', Valor: '961' },
          { Grupo: 'Medicina', Coluna: 'TOTAL', Linha: 'TÍTULOS', Valor: '1087' },
          { Grupo: 'Medicina', Coluna: 'PREMIUM', Linha: 'VIDAS', Valor: '0' },
          { Grupo: 'Medicina', Coluna: 'CORPORATE', Linha: 'VIDAS', Valor: '217' },
          { Grupo: 'Medicina', Coluna: 'SKILL', Linha: 'VIDAS', Valor: '1222' },
          { Grupo: 'Medicina', Coluna: 'TOTAL', Linha: 'VIDAS', Valor: '1439' },
          { Grupo: 'Medicina', Coluna: 'PREMIUM', Linha: 'RECEITA', Valor: '0.00' },
          { Grupo: 'Medicina', Coluna: 'CORPORATE', Linha: 'RECEITA', Valor: '2873493.82' },
          { Grupo: 'Medicina', Coluna: 'SKILL', Linha: 'RECEITA', Valor: '12156427.84' },
          { Grupo: 'Medicina', Coluna: 'TOTAL', Linha: 'RECEITA', Valor: '15029921.66' },
          { Grupo: 'Medicina', Coluna: 'PREMIUM', Linha: 'DESPESA', Valor: '0.00' },
          { Grupo: 'Medicina', Coluna: 'CORPORATE', Linha: 'DESPESA', Valor: '922426.92' },
          { Grupo: 'Medicina', Coluna: 'SKILL', Linha: 'DESPESA', Valor: '8578890.05' },
          { Grupo: 'Medicina', Coluna: 'TOTAL', Linha: 'DESPESA', Valor: '9501316.97' },
          { Grupo: 'Medicina', Coluna: 'PREMIUM', Linha: 'SINISTRALIDADE', Valor: '0.00%' },
          { Grupo: 'Medicina', Coluna: 'CORPORATE', Linha: 'SINISTRALIDADE', Valor: '32.10%' },
          { Grupo: 'Medicina', Coluna: 'SKILL', Linha: 'SINISTRALIDADE', Valor: '70.57%' },
          { Grupo: 'Medicina', Coluna: 'TOTAL', Linha: 'SINISTRALIDADE', Valor: '63.22%' },
          // Odontologia
          { Grupo: 'Odontologia', Coluna: 'PREMIUM', Linha: 'TÍTULOS', Valor: '0' },
          { Grupo: 'Odontologia', Coluna: 'CORPORATE', Linha: 'TÍTULOS', Valor: '0' },
          { Grupo: 'Odontologia', Coluna: 'SKILL', Linha: 'TÍTULOS', Valor: '1060' },
          { Grupo: 'Odontologia', Coluna: 'TOTAL', Linha: 'TÍTULOS', Valor: '1060' },
          { Grupo: 'Odontologia', Coluna: 'PREMIUM', Linha: 'VIDAS', Valor: '0' },
          { Grupo: 'Odontologia', Coluna: 'CORPORATE', Linha: 'VIDAS', Valor: '0' },
          { Grupo: 'Odontologia', Coluna: 'SKILL', Linha: 'VIDAS', Valor: '1411' },
          { Grupo: 'Odontologia', Coluna: 'TOTAL', Linha: 'VIDAS', Valor: '1411' },
          { Grupo: 'Odontologia', Coluna: 'PREMIUM', Linha: 'RECEITA', Valor: '0.00' },
          { Grupo: 'Odontologia', Coluna: 'CORPORATE', Linha: 'RECEITA', Valor: '0.00' },
          { Grupo: 'Odontologia', Coluna: 'SKILL', Linha: 'RECEITA', Valor: '434908.16' },
          { Grupo: 'Odontologia', Coluna: 'TOTAL', Linha: 'RECEITA', Valor: '434908.16' },
          { Grupo: 'Odontologia', Coluna: 'PREMIUM', Linha: 'DESPESA', Valor: '0.00' },
          { Grupo: 'Odontologia', Coluna: 'CORPORATE', Linha: 'DESPESA', Valor: '0.00' },
          { Grupo: 'Odontologia', Coluna: 'SKILL', Linha: 'DESPESA', Valor: '278299.90' },
          { Grupo: 'Odontologia', Coluna: 'TOTAL', Linha: 'DESPESA', Valor: '278299.90' },
          { Grupo: 'Odontologia', Coluna: 'PREMIUM', Linha: 'SINISTRALIDADE', Valor: '0.00%' },
          { Grupo: 'Odontologia', Coluna: 'CORPORATE', Linha: 'SINISTRALIDADE', Valor: '0.00%' },
          { Grupo: 'Odontologia', Coluna: 'SKILL', Linha: 'SINISTRALIDADE', Valor: '63.99%' },
          { Grupo: 'Odontologia', Coluna: 'TOTAL', Linha: 'SINISTRALIDADE', Valor: '63.99%' }
        ]
      }
    },

    // Relatório 2 - Demonstrativo Consolidado por Plano
    {
      id: 2,
      ok: true,
      data: {
        Dados: [
          { Grupo: null, Coluna: 'OS1', Linha: 'TITULOS', Valor: '1060' },
          { Grupo: null, Coluna: 'C16', Linha: 'TITULOS', Valor: '126' },
          { Grupo: null, Coluna: 'SC2', Linha: 'TITULOS', Valor: '364' },
          { Grupo: null, Coluna: 'SMAX', Linha: 'TITULOS', Valor: '597' },
          { Grupo: null, Coluna: 'OS1', Linha: 'VIDAS', Valor: '1411' },
          { Grupo: null, Coluna: 'C16', Linha: 'VIDAS', Valor: '217' },
          { Grupo: null, Coluna: 'SC2', Linha: 'VIDAS', Valor: '524' },
          { Grupo: null, Coluna: 'SMAX', Linha: 'VIDAS', Valor: '698' },
          { Grupo: null, Coluna: 'OS1', Linha: 'RECEITA', Valor: '434908.16' },
          { Grupo: null, Coluna: 'C16', Linha: 'RECEITA', Valor: '2873493.82' },
          { Grupo: null, Coluna: 'SC2', Linha: 'RECEITA', Valor: '5133539.51' },
          { Grupo: null, Coluna: 'SMAX', Linha: 'RECEITA', Valor: '7022888.33' },
          { Grupo: null, Coluna: 'OS1', Linha: 'DESPESA', Valor: '278299.90' },
          { Grupo: null, Coluna: 'C16', Linha: 'DESPESA', Valor: '922426.92' },
          { Grupo: null, Coluna: 'SC2', Linha: 'DESPESA', Valor: '2237603.94' },
          { Grupo: null, Coluna: 'SMAX', Linha: 'DESPESA', Valor: '6341286.11' },
          { Grupo: null, Coluna: 'OS1', Linha: 'SINISTRALIDADE', Valor: '63.99%' },
          { Grupo: null, Coluna: 'C16', Linha: 'SINISTRALIDADE', Valor: '32.10%' },
          { Grupo: null, Coluna: 'SC2', Linha: 'SINISTRALIDADE', Valor: '43.59%' },
          { Grupo: null, Coluna: 'SMAX', Linha: 'SINISTRALIDADE', Valor: '90.29%' }
        ]
      }
    },

    // Relatório 3 - Consolidado Vidas por Faixa Etária, Sexo e Categoria
    {
      id: 3,
      ok: true,
      data: {
        Dados: [
          { Grupo: null, Coluna: '00 - 01', Linha: 'VidasFaixa', Valor: '68' },
          { Grupo: null, Coluna: '02 - 09', Linha: 'VidasFaixa', Valor: '186' },
          { Grupo: null, Coluna: '10 - 17', Linha: 'VidasFaixa', Valor: '97' },
          { Grupo: null, Coluna: '18 - 29', Linha: 'VidasFaixa', Valor: '583' },
          { Grupo: null, Coluna: '30 - 39', Linha: 'VidasFaixa', Valor: '1436' },
          { Grupo: null, Coluna: '40 - 49', Linha: 'VidasFaixa', Valor: '434' },
          { Grupo: null, Coluna: '50 - 59', Linha: 'VidasFaixa', Valor: '46' },
          { Grupo: null, Coluna: '60 - 69', Linha: 'VidasFaixa', Valor: '0' },
          { Grupo: null, Coluna: '70 +', Linha: 'VidasFaixa', Valor: '0' },
          { Grupo: null, Coluna: '00 - 01', Linha: 'Perc_Faixa', Valor: '2.39%' },
          { Grupo: null, Coluna: '02 - 09', Linha: 'Perc_Faixa', Valor: '6.53%' },
          { Grupo: null, Coluna: '10 - 17', Linha: 'Perc_Faixa', Valor: '3.40%' },
          { Grupo: null, Coluna: '18 - 29', Linha: 'Perc_Faixa', Valor: '20.46%' },
          { Grupo: null, Coluna: '30 - 39', Linha: 'Perc_Faixa', Valor: '50.39%' },
          { Grupo: null, Coluna: '40 - 49', Linha: 'Perc_Faixa', Valor: '15.23%' },
          { Grupo: null, Coluna: '50 - 59', Linha: 'Perc_Faixa', Valor: '1.61%' },
          { Grupo: null, Coluna: '60 - 69', Linha: 'Perc_Faixa', Valor: '0.00%' },
          { Grupo: null, Coluna: '70 +', Linha: 'Perc_Faixa', Valor: '0.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'Masculino', Valor: '1642' },
          { Grupo: null, Coluna: 'Total', Linha: 'Feminino', Valor: '1208' },
          { Grupo: null, Coluna: 'Total', Linha: 'Titular', Valor: '2147' },
          { Grupo: null, Coluna: 'Total', Linha: 'Dependente', Valor: '703' },
          { Grupo: 'Sexo', Coluna: 'MASCULINO', Linha: 'Vidas', Valor: '1642' },
          { Grupo: 'Sexo', Coluna: 'FEMININO', Linha: 'Vidas', Valor: '1208' },
          { Grupo: 'Categoria', Coluna: 'TITULAR', Linha: 'Vidas', Valor: '2147' },
          { Grupo: 'Categoria', Coluna: 'DEPENDENTE', Linha: 'Vidas', Valor: '703' }
        ]
      }
    },

    // Relatório 4 - Consolidado Despesa por Tipo de Evento e Acesso
    {
      id: 4,
      ok: true,
      data: {
        Dados: [
          { Grupo: null, Coluna: 'PercLE', Linha: 'Consultas', Valor: '23.86%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Consultas', Valor: '76.14%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Consultas', Valor: '4.04%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Consultas', Valor: '4.30%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Exames', Valor: '0.89%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Exames', Valor: '99.11%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Exames', Valor: '16.34%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Exames', Valor: '1.80%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Terapias Seriadas', Valor: '35.18%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Terapias Seriadas', Valor: '64.82%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Terapias Seriadas', Valor: '3.53%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Terapias Seriadas', Valor: '5.20%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Outros Atend. Amb', Valor: '0.89%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Outros Atend. Amb', Valor: '99.11%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Outros Atend. Amb', Valor: '20.52%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Outros Atend. Amb', Valor: '0.50%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Total Ambulatorial', Valor: '5.70%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Total Ambulatorial', Valor: '94.30%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Total Ambulatorial', Valor: '44.43%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Total Ambulatorial', Valor: '2.40%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Int. Cirúrgica', Valor: '2.31%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Int. Cirúrgica', Valor: '97.69%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Int. Cirúrgica', Valor: '27.83%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Int. Cirúrgica', Valor: '1.20%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Int. Clínica', Valor: '0.29%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Int. Clínica', Valor: '99.71%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Int. Clínica', Valor: '22.49%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Int. Clínica', Valor: '0.30%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Maternidade', Valor: '2.35%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Maternidade', Valor: '97.65%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Maternidade', Valor: '2.40%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Maternidade', Valor: '2.10%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Total Hospitalar', Valor: '1.45%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Total Hospitalar', Valor: '98.55%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Total Hospitalar', Valor: '52.73%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Total Hospitalar', Valor: '1.00%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Odontologia', Valor: '1.44%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Odontologia', Valor: '98.56%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Odontologia', Valor: '2.85%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Odontologia', Valor: '0.80%' },
          { Grupo: null, Coluna: 'PercLE', Linha: 'Total Geral', Valor: '3.34%' },
          { Grupo: null, Coluna: 'PercRC', Linha: 'Total Geral', Valor: '96.66%' },
          { Grupo: null, Coluna: 'PercTotal', Linha: 'Total Geral', Valor: '100.00%' },
          { Grupo: null, Coluna: 'VarRC', Linha: 'Total Geral', Valor: '1.90%' }
        ]
      }
    },

    // Relatório 5 - Consolidado de Indicadores de Utilização
    {
      id: 5,
      ok: true,
      data: {
        Dados: [
          { Grupo: null, Coluna: 'Quantidade', Linha: 'Consultas PMPM', Valor: '3097' },
          { Grupo: null, Coluna: 'Indicador', Linha: 'Consultas PMPM', Valor: '0.23' },
          { Grupo: null, Coluna: 'Benchmark', Linha: 'Consultas PMPM', Valor: '0.44' },
          { Grupo: null, Coluna: 'Dif', Linha: 'Consultas PMPM', Valor: '-47.73%' },
          { Grupo: null, Coluna: 'Quantidade', Linha: 'Exames PMPM', Valor: '27204' },
          { Grupo: null, Coluna: 'Indicador', Linha: 'Exames PMPM', Valor: '2.02' },
          { Grupo: null, Coluna: 'Benchmark', Linha: 'Exames PMPM', Valor: '3.23' },
          { Grupo: null, Coluna: 'Dif', Linha: 'Exames PMPM', Valor: '-37.46%' },
          { Grupo: null, Coluna: 'Quantidade', Linha: 'Exames/Consultas', Valor: '8.78' },
          { Grupo: null, Coluna: 'Indicador', Linha: 'Exames/Consultas', Valor: '8.78' },
          { Grupo: null, Coluna: 'Benchmark', Linha: 'Exames/Consultas', Valor: '7.34' },
          { Grupo: null, Coluna: 'Dif', Linha: 'Exames/Consultas', Valor: '19.66%' },
          { Grupo: null, Coluna: 'Quantidade', Linha: 'Int 1000 Vidas/Mes', Valor: '138' },
          { Grupo: null, Coluna: 'Indicador', Linha: 'Int 1000 Vidas/Mes', Valor: '10.23' },
          { Grupo: null, Coluna: 'Benchmark', Linha: 'Int 1000 Vidas/Mes', Valor: '15.94' },
          { Grupo: null, Coluna: 'Dif', Linha: 'Int 1000 Vidas/Mes', Valor: '-35.82%' },
          { Grupo: null, Coluna: 'Quantidade', Linha: 'Diárias 1000 Vidas/Mes', Valor: '376' },
          { Grupo: null, Coluna: 'Indicador', Linha: 'Diárias 1000 Vidas/Mes', Valor: '27.88' },
          { Grupo: null, Coluna: 'Benchmark', Linha: 'Diárias 1000 Vidas/Mes', Valor: '33.80' },
          { Grupo: null, Coluna: 'Dif', Linha: 'Diárias 1000 Vidas/Mes', Valor: '-17.51%' },
          { Grupo: null, Coluna: 'Quantidade', Linha: 'Índice de UTI', Valor: '109' },
          { Grupo: null, Coluna: 'Indicador', Linha: 'Índice de UTI', Valor: '29.03%' },
          { Grupo: null, Coluna: 'Benchmark', Linha: 'Índice de UTI', Valor: '23.04%' },
          { Grupo: null, Coluna: 'Dif', Linha: 'Índice de UTI', Valor: '5.99%' },
          { Grupo: null, Coluna: 'Quantidade', Linha: 'Atendimento de urgência por associado', Valor: '245' },
          { Grupo: null, Coluna: 'Indicador', Linha: 'Atendimento de urgência por associado', Valor: '0.18' },
          { Grupo: null, Coluna: 'Benchmark', Linha: 'Atendimento de urgência por associado', Valor: '0.28' },
          { Grupo: null, Coluna: 'Dif', Linha: 'Atendimento de urgência por associado', Valor: '-35.71%' },
          { Grupo: null, Coluna: 'Quantidade', Linha: 'Terapias', Valor: '312' },
          { Grupo: null, Coluna: 'Indicador', Linha: 'Terapias', Valor: '0.22' },
          { Grupo: null, Coluna: 'Benchmark', Linha: 'Terapias', Valor: '0.35' },
          { Grupo: null, Coluna: 'Dif', Linha: 'Terapias', Valor: '-37.14%' }
        ]
      }
    },

    // Relatório 6 - Relação de Associados de Alto Custo (mock)
    {
      id: 6,
      ok: true,
      data: { Dados: [] }
    },

    // Relatório 7 - Evolução Mensal Sinistralidade por Linha
    {
      id: 7,
      ok: true,
      data: {
        Dados: [
          { Grupo: 'PREMIUM', Coluna: 'TOTAL', Linha: 'Sinistralidade', Valor: '0.00%' },
          { Grupo: 'CORPORATE', Coluna: 'TOTAL', Linha: 'Sinistralidade', Valor: '32.10%' },
          { Grupo: 'SKILL', Coluna: 'TOTAL', Linha: 'Sinistralidade', Valor: '70.34%' },
          { Grupo: 'TOTAL', Coluna: 'TOTAL', Linha: 'Sinistralidade', Valor: '63.24%' }
        ]
      }
    },

        // Relatório 8 - Evolução Mensal Vidas Produto/Linha
    {
      id: 8,
      ok: true,
      data: [
        {
          "Ordem": 1,
          "Tipo": 1,
          "Dados": [
            {
              "Grupo": "MEDICINA",
              "Coluna": "JAN/2026",
              "Linha": "Total",
              "Valor": "1002"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JAN/2026",
              "Linha": "Premium",
              "Valor": "640"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JAN/2026",
              "Linha": "Corporate",
              "Valor": "2"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JAN/2026",
              "Linha": "Skill",
              "Valor": "360"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "FEV/2026",
              "Linha": "Total",
              "Valor": "1004"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "FEV/2026",
              "Linha": "Premium",
              "Valor": "641"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "FEV/2026",
              "Linha": "Corporate",
              "Valor": "2"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "FEV/2026",
              "Linha": "Skill",
              "Valor": "361"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAR/2026",
              "Linha": "Total",
              "Valor": "1005"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAR/2026",
              "Linha": "Premium",
              "Valor": "642"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAR/2026",
              "Linha": "Corporate",
              "Valor": "2"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAR/2026",
              "Linha": "Skill",
              "Valor": "361"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "ABR/2026",
              "Linha": "Total",
              "Valor": "1006"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "ABR/2026",
              "Linha": "Premium",
              "Valor": "652"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "ABR/2026",
              "Linha": "Corporate",
              "Valor": "2"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "ABR/2026",
              "Linha": "Skill",
              "Valor": "352"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAI/2026",
              "Linha": "Total",
              "Valor": "1026"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAI/2026",
              "Linha": "Premium",
              "Valor": "660"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAI/2026",
              "Linha": "Corporate",
              "Valor": "2"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAI/2026",
              "Linha": "Skill",
              "Valor": "364"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUN/2026",
              "Linha": "Total",
              "Valor": "1021"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUN/2026",
              "Linha": "Premium",
              "Valor": "668"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUN/2026",
              "Linha": "Corporate",
              "Valor": "5"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUN/2026",
              "Linha": "Skill",
              "Valor": "348"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUL/2026",
              "Linha": "Total",
              "Valor": "1032"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUL/2026",
              "Linha": "Premium",
              "Valor": "664"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUL/2026",
              "Linha": "Corporate",
              "Valor": "5"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUL/2026",
              "Linha": "Skill",
              "Valor": "363"
            }
          ]
        },
        {
          "Ordem": 2,
          "Tipo": 2,
          "Dados": [
            {
              "Grupo": "MEDICINA",
              "Coluna": "JAN/2025",
              "Linha": "Total",
              "Valor": "1015"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "FEV/2025",
              "Linha": "Total",
              "Valor": "1018"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAR/2025",
              "Linha": "Total",
              "Valor": "1022"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "ABR/2025",
              "Linha": "Total",
              "Valor": "1008"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAI/2025",
              "Linha": "Total",
              "Valor": "1013"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUN/2025",
              "Linha": "Total",
              "Valor": "999"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUL/2025",
              "Linha": "Total",
              "Valor": "1005"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JAN/2026",
              "Linha": "Total",
              "Valor": "1002"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "FEV/2026",
              "Linha": "Total",
              "Valor": "1004"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAR/2026",
              "Linha": "Total",
              "Valor": "1005"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "ABR/2026",
              "Linha": "Total",
              "Valor": "1006"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "MAI/2026",
              "Linha": "Total",
              "Valor": "1026"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUN/2026",
              "Linha": "Total",
              "Valor": "1021"
            },
            {
              "Grupo": "MEDICINA",
              "Coluna": "JUL/2026",
              "Linha": "Total",
              "Valor": "1032"
            }
          ]
        }
      ]
    },

    // Relatório 9 - Evolução Mensal Vidas Produto/Categoria (Tit/Dep)
    {
      id: 9,
      ok: true,
      data: {
        Dados: [
          {
            "Grupo": "MEDICINA",
            "Coluna": "JAN/2026",
            "Linha": "Titular",
            "Valor": "432"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "JAN/2026",
            "Linha": "Dependente",
            "Valor": "570"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "FEV/2026",
            "Linha": "Titular",
            "Valor": "433"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "FEV/2026",
            "Linha": "Dependente",
            "Valor": "571"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "MAR/2026",
            "Linha": "Titular",
            "Valor": "434"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "MAR/2026",
            "Linha": "Dependente",
            "Valor": "571"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "ABR/2026",
            "Linha": "Titular",
            "Valor": "434"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "ABR/2026",
            "Linha": "Dependente",
            "Valor": "572"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "MAI/2026",
            "Linha": "Titular",
            "Valor": "440"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "MAI/2026",
            "Linha": "Dependente",
            "Valor": "586"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "JUN/2026",
            "Linha": "Titular",
            "Valor": "439"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "JUN/2026",
            "Linha": "Dependente",
            "Valor": "582"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "JUL/2026",
            "Linha": "Titular",
            "Valor": "441"
          },
          {
            "Grupo": "MEDICINA",
            "Coluna": "JUL/2026",
            "Linha": "Dependente",
            "Valor": "591"
          }
        ]
      }
    },

    // Relatório 10 - Evolução Mensal Receita/Despesa/Sinistralidade Geral
    {
      id: 10,
      ok: true,
      data: [
        {
          Ordem: 1,
          Tipo: 1,
          Dados: [
            { Grupo: null, Coluna: 'JAN/2026', Linha: 'Receita', Valor: '2200000.00' },
            { Grupo: null, Coluna: 'JAN/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1400000.00' },
            { Grupo: null, Coluna: 'JAN/2026', Linha: 'Coparticipacao', Valor: '75000.00' },
            { Grupo: null, Coluna: 'JAN/2026', Linha: 'Sinistralidade', Valor: '63.6%' },
            { Grupo: null, Coluna: 'FEV/2026', Linha: 'Receita', Valor: '2250000.00' },
            { Grupo: null, Coluna: 'FEV/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1420000.00' },
            { Grupo: null, Coluna: 'FEV/2026', Linha: 'Coparticipacao', Valor: '76000.00' },
            { Grupo: null, Coluna: 'FEV/2026', Linha: 'Sinistralidade', Valor: '63.1%' },
            { Grupo: null, Coluna: 'MAR/2026', Linha: 'Receita', Valor: '2190000.00' },
            { Grupo: null, Coluna: 'MAR/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1380000.00' },
            { Grupo: null, Coluna: 'MAR/2026', Linha: 'Coparticipacao', Valor: '74000.00' },
            { Grupo: null, Coluna: 'MAR/2026', Linha: 'Sinistralidade', Valor: '63.0%' },
            { Grupo: null, Coluna: 'ABR/2026', Linha: 'Receita', Valor: '2230000.00' },
            { Grupo: null, Coluna: 'ABR/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1410000.00' },
            { Grupo: null, Coluna: 'ABR/2026', Linha: 'Coparticipacao', Valor: '77000.00' },
            { Grupo: null, Coluna: 'ABR/2026', Linha: 'Sinistralidade', Valor: '63.2%' },
            { Grupo: null, Coluna: 'MAI/2026', Linha: 'Receita', Valor: '2210000.00' },
            { Grupo: null, Coluna: 'MAI/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1390000.00' },
            { Grupo: null, Coluna: 'MAI/2026', Linha: 'Coparticipacao', Valor: '75000.00' },
            { Grupo: null, Coluna: 'MAI/2026', Linha: 'Sinistralidade', Valor: '62.9%' },
            { Grupo: null, Coluna: 'JUN/2026', Linha: 'Receita', Valor: '2280000.00' },
            { Grupo: null, Coluna: 'JUN/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1450000.00' },
            { Grupo: null, Coluna: 'JUN/2026', Linha: 'Coparticipacao', Valor: '80000.00' },
            { Grupo: null, Coluna: 'JUN/2026', Linha: 'Sinistralidade', Valor: '63.6%' },
            { Grupo: null, Coluna: 'JUL/2026', Linha: 'Receita', Valor: '2104829.82' },
            { Grupo: null, Coluna: 'JUL/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1329616.87' },
            { Grupo: null, Coluna: 'JUL/2026', Linha: 'Coparticipacao', Valor: '81538.74' },
            { Grupo: null, Coluna: 'JUL/2026', Linha: 'Sinistralidade', Valor: '63.2%' },
            { Grupo: null, Coluna: 'TOTAL', Linha: 'Coparticipacao', Valor: '538538.74' },
            { Grupo: null, Coluna: 'TOTAL', Linha: 'Despesa (liquida de Copay)', Valor: '9779616.87' },
            { Grupo: null, Coluna: 'TOTAL', Linha: 'Receita', Valor: '15464829.82' },
            { Grupo: null, Coluna: 'TOTAL', Linha: 'Sinistralidade', Valor: '63.24%' }
          ]
        },
        {
          Ordem: 2,
          Tipo: 2,
          Dados: [
            // Ano 1 (2025)
            { Grupo: null, Coluna: 'JAN/2025', Linha: 'Receita', Valor: '1950000.00' },
            { Grupo: null, Coluna: 'JAN/2025', Linha: 'Despesa (liquida de Copay)', Valor: '1280000.00' },
            { Grupo: null, Coluna: 'JAN/2025', Linha: 'Sinistralidade', Valor: '65.6%' },
            { Grupo: null, Coluna: 'FEV/2025', Linha: 'Receita', Valor: '1980000.00' },
            { Grupo: null, Coluna: 'FEV/2025', Linha: 'Despesa (liquida de Copay)', Valor: '1310000.00' },
            { Grupo: null, Coluna: 'FEV/2025', Linha: 'Sinistralidade', Valor: '66.2%' },
            { Grupo: null, Coluna: 'MAR/2025', Linha: 'Receita', Valor: '2010000.00' },
            { Grupo: null, Coluna: 'MAR/2025', Linha: 'Despesa (liquida de Copay)', Valor: '1330000.00' },
            { Grupo: null, Coluna: 'MAR/2025', Linha: 'Sinistralidade', Valor: '66.2%' },
            { Grupo: null, Coluna: 'ABR/2025', Linha: 'Receita', Valor: '1990000.00' },
            { Grupo: null, Coluna: 'ABR/2025', Linha: 'Despesa (liquida de Copay)', Valor: '1300000.00' },
            { Grupo: null, Coluna: 'ABR/2025', Linha: 'Sinistralidade', Valor: '65.3%' },
            { Grupo: null, Coluna: 'MAI/2025', Linha: 'Receita', Valor: '2020000.00' },
            { Grupo: null, Coluna: 'MAI/2025', Linha: 'Despesa (liquida de Copay)', Valor: '1340000.00' },
            { Grupo: null, Coluna: 'MAI/2025', Linha: 'Sinistralidade', Valor: '66.3%' },
            { Grupo: null, Coluna: 'JUN/2025', Linha: 'Receita', Valor: '2040000.00' },
            { Grupo: null, Coluna: 'JUN/2025', Linha: 'Despesa (liquida de Copay)', Valor: '1360000.00' },
            { Grupo: null, Coluna: 'JUN/2025', Linha: 'Sinistralidade', Valor: '66.7%' },
            { Grupo: null, Coluna: 'JUL/2025', Linha: 'Receita', Valor: '2060000.00' },
            { Grupo: null, Coluna: 'JUL/2025', Linha: 'Despesa (liquida de Copay)', Valor: '1370000.00' },
            { Grupo: null, Coluna: 'JUL/2025', Linha: 'Sinistralidade', Valor: '66.5%' },
            // Ano 2 (2026)
            { Grupo: null, Coluna: 'JAN/2026', Linha: 'Receita', Valor: '2200000.00' },
            { Grupo: null, Coluna: 'JAN/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1400000.00' },
            { Grupo: null, Coluna: 'JAN/2026', Linha: 'Sinistralidade', Valor: '63.6%' },
            { Grupo: null, Coluna: 'FEV/2026', Linha: 'Receita', Valor: '2250000.00' },
            { Grupo: null, Coluna: 'FEV/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1420000.00' },
            { Grupo: null, Coluna: 'FEV/2026', Linha: 'Sinistralidade', Valor: '63.1%' },
            { Grupo: null, Coluna: 'MAR/2026', Linha: 'Receita', Valor: '2190000.00' },
            { Grupo: null, Coluna: 'MAR/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1380000.00' },
            { Grupo: null, Coluna: 'MAR/2026', Linha: 'Sinistralidade', Valor: '63.0%' },
            { Grupo: null, Coluna: 'ABR/2026', Linha: 'Receita', Valor: '2230000.00' },
            { Grupo: null, Coluna: 'ABR/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1410000.00' },
            { Grupo: null, Coluna: 'ABR/2026', Linha: 'Sinistralidade', Valor: '63.2%' },
            { Grupo: null, Coluna: 'MAI/2026', Linha: 'Receita', Valor: '2210000.00' },
            { Grupo: null, Coluna: 'MAI/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1390000.00' },
            { Grupo: null, Coluna: 'MAI/2026', Linha: 'Sinistralidade', Valor: '62.9%' },
            { Grupo: null, Coluna: 'JUN/2026', Linha: 'Receita', Valor: '2280000.00' },
            { Grupo: null, Coluna: 'JUN/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1450000.00' },
            { Grupo: null, Coluna: 'JUN/2026', Linha: 'Sinistralidade', Valor: '63.6%' },
            { Grupo: null, Coluna: 'JUL/2026', Linha: 'Receita', Valor: '2104829.82' },
            { Grupo: null, Coluna: 'JUL/2026', Linha: 'Despesa (liquida de Copay)', Valor: '1329616.87' },
            { Grupo: null, Coluna: 'JUL/2026', Linha: 'Sinistralidade', Valor: '63.2%' }
          ]
        }
      ]
    },

    // Relatório 11 - Evolução Mensal Receita/Despesa/Sinistralidade por Linha
    {
      id: 11,
      ok: true,
      data: [
        {
          Ordem: 1,
          Tipo: 1,
          Dados: [
                    {
                              "Grupo": "Premium",
                              "Coluna": "JAN/2026",
                              "Linha": "Receita",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "JAN/2026",
                              "Linha": "Despesa",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "JAN/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "0.0%"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "JAN/2026",
                              "Linha": "Receita",
                              "Valor": "420640.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "JAN/2026",
                              "Linha": "Despesa",
                              "Valor": "135940.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "JAN/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "32.32%"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "JAN/2026",
                              "Linha": "Receita",
                              "Valor": "1779360.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "JAN/2026",
                              "Linha": "Despesa",
                              "Valor": "1264060.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "JAN/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "71.04%"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "FEV/2026",
                              "Linha": "Receita",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "FEV/2026",
                              "Linha": "Despesa",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "FEV/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "0.0%"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "FEV/2026",
                              "Linha": "Receita",
                              "Valor": "430200.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "FEV/2026",
                              "Linha": "Despesa",
                              "Valor": "137882.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "FEV/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "32.05%"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "FEV/2026",
                              "Linha": "Receita",
                              "Valor": "1819800.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "FEV/2026",
                              "Linha": "Despesa",
                              "Valor": "1282118.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "FEV/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "70.45%"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "MAR/2026",
                              "Linha": "Receita",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "MAR/2026",
                              "Linha": "Despesa",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "MAR/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "0.0%"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "MAR/2026",
                              "Linha": "Receita",
                              "Valor": "418728.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "MAR/2026",
                              "Linha": "Despesa",
                              "Valor": "133998.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "MAR/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "32.00%"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "MAR/2026",
                              "Linha": "Receita",
                              "Valor": "1771272.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "MAR/2026",
                              "Linha": "Despesa",
                              "Valor": "1246002.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "MAR/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "70.35%"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "ABR/2026",
                              "Linha": "Receita",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "ABR/2026",
                              "Linha": "Despesa",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "ABR/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "0.0%"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "ABR/2026",
                              "Linha": "Receita",
                              "Valor": "426376.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "ABR/2026",
                              "Linha": "Despesa",
                              "Valor": "136911.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "ABR/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "32.11%"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "ABR/2026",
                              "Linha": "Receita",
                              "Valor": "1803624.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "ABR/2026",
                              "Linha": "Despesa",
                              "Valor": "1273089.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "ABR/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "70.59%"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "MAI/2026",
                              "Linha": "Receita",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "MAI/2026",
                              "Linha": "Despesa",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "MAI/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "0.0%"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "MAI/2026",
                              "Linha": "Receita",
                              "Valor": "422552.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "MAI/2026",
                              "Linha": "Despesa",
                              "Valor": "134969.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "MAI/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "31.94%"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "MAI/2026",
                              "Linha": "Receita",
                              "Valor": "1787448.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "MAI/2026",
                              "Linha": "Despesa",
                              "Valor": "1255031.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "MAI/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "70.21%"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "JUN/2026",
                              "Linha": "Receita",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "JUN/2026",
                              "Linha": "Despesa",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "JUN/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "0.0%"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "JUN/2026",
                              "Linha": "Receita",
                              "Valor": "435936.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "JUN/2026",
                              "Linha": "Despesa",
                              "Valor": "140795.00"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "JUN/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "32.30%"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "JUN/2026",
                              "Linha": "Receita",
                              "Valor": "1844064.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "JUN/2026",
                              "Linha": "Despesa",
                              "Valor": "1309205.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "JUN/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "71.00%"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "JUL/2026",
                              "Linha": "Receita",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "JUL/2026",
                              "Linha": "Despesa",
                              "Valor": "0.00"
                    },
                    {
                              "Grupo": "Premium",
                              "Coluna": "JUL/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "0.0%"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "JUL/2026",
                              "Linha": "Receita",
                              "Valor": "398693.82"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "JUL/2026",
                              "Linha": "Despesa",
                              "Valor": "128426.92"
                    },
                    {
                              "Grupo": "Corporate",
                              "Coluna": "JUL/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "32.21%"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "JUL/2026",
                              "Linha": "Receita",
                              "Valor": "1706136.00"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "JUL/2026",
                              "Linha": "Despesa",
                              "Valor": "1201044.68"
                    },
                    {
                              "Grupo": "Skill",
                              "Coluna": "JUL/2026",
                              "Linha": "Sinistralidade",
                              "Valor": "70.40%"
                    }
          ]
        }
      ]
    },

        // Relatório 12 - Consolidado Receita/Despesa/Sinistralidade/Custo por Usuário
    {
      id: 12,
      ok: true,
      data: [
        {
          "Ordem": 1,
          "Tipo": 1,
          "Dados": [
            {
              "Grupo": null,
              "Coluna": "Total",
              "Linha": "Receita",
              "Valor": "15029921.66"
            },
            {
              "Grupo": null,
              "Coluna": "Total",
              "Linha": "Despesa",
              "Valor": "9501316.97"
            },
            {
              "Grupo": null,
              "Coluna": "Total",
              "Linha": "Custo PMPM",
              "Valor": "6602.72"
            },
            {
              "Grupo": null,
              "Coluna": "Total",
              "Linha": "Sinistralidade",
              "Valor": "63.22"
            },
            {
              "Grupo": null,
              "Coluna": "Titular",
              "Linha": "Receita",
              "Valor": "6649756.01"
            },
            {
              "Grupo": null,
              "Coluna": "Titular",
              "Linha": "Despesa",
              "Valor": "1853086.39"
            },
            {
              "Grupo": null,
              "Coluna": "Titular",
              "Linha": "Custo PMPM",
              "Valor": "3496.39"
            },
            {
              "Grupo": null,
              "Coluna": "Titular",
              "Linha": "Sinistralidade",
              "Valor": "27.87"
            },
            {
              "Grupo": null,
              "Coluna": "Dependente",
              "Linha": "Receita",
              "Valor": "8380165.65"
            },
            {
              "Grupo": null,
              "Coluna": "Dependente",
              "Linha": "Despesa",
              "Valor": "7648230.58"
            },
            {
              "Grupo": null,
              "Coluna": "Dependente",
              "Linha": "Custo PMPM",
              "Valor": "8413.90"
            },
            {
              "Grupo": null,
              "Coluna": "Dependente",
              "Linha": "Sinistralidade",
              "Valor": "91.27"
            },
            {
              "Grupo": null,
              "Coluna": "MASC",
              "Linha": "Receita",
              "Valor": "7037779.22"
            },
            {
              "Grupo": null,
              "Coluna": "MASC",
              "Linha": "Despesa",
              "Valor": "4589967.80"
            },
            {
              "Grupo": null,
              "Coluna": "MASC",
              "Linha": "Custo PMPM",
              "Valor": "7574.20"
            },
            {
              "Grupo": null,
              "Coluna": "MASC",
              "Linha": "Sinistralidade",
              "Valor": "65.22"
            },
            {
              "Grupo": null,
              "Coluna": "FEM",
              "Linha": "Receita",
              "Valor": "7992142.44"
            },
            {
              "Grupo": null,
              "Coluna": "FEM",
              "Linha": "Despesa",
              "Valor": "4911349.17"
            },
            {
              "Grupo": null,
              "Coluna": "FEM",
              "Linha": "Custo PMPM",
              "Valor": "5895.98"
            },
            {
              "Grupo": null,
              "Coluna": "FEM",
              "Linha": "Sinistralidade",
              "Valor": "61.45"
            },
            {
              "Grupo": null,
              "Coluna": "00 - 21",
              "Linha": "Receita",
              "Valor": "1962059.37"
            },
            {
              "Grupo": null,
              "Coluna": "00 - 21",
              "Linha": "Despesa",
              "Valor": "1010108.94"
            },
            {
              "Grupo": null,
              "Coluna": "00 - 21",
              "Linha": "Custo PMPM",
              "Valor": "2665.20"
            },
            {
              "Grupo": null,
              "Coluna": "00 - 21",
              "Linha": "Sinistralidade",
              "Valor": "51.48"
            },
            {
              "Grupo": null,
              "Coluna": "22 - 40",
              "Linha": "Receita",
              "Valor": "1489168.27"
            },
            {
              "Grupo": null,
              "Coluna": "22 - 40",
              "Linha": "Despesa",
              "Valor": "2213781.51"
            },
            {
              "Grupo": null,
              "Coluna": "22 - 40",
              "Linha": "Custo PMPM",
              "Valor": "13022.24"
            },
            {
              "Grupo": null,
              "Coluna": "22 - 40",
              "Linha": "Sinistralidade",
              "Valor": "148.66"
            },
            {
              "Grupo": null,
              "Coluna": "41 - 59",
              "Linha": "Receita",
              "Valor": "11578694.02"
            },
            {
              "Grupo": null,
              "Coluna": "41 - 59",
              "Linha": "Despesa",
              "Valor": "6277426.52"
            },
            {
              "Grupo": null,
              "Coluna": "41 - 59",
              "Linha": "Custo PMPM",
              "Valor": "7053.29"
            },
            {
              "Grupo": null,
              "Coluna": "41 - 59",
              "Linha": "Sinistralidade",
              "Valor": "54.22"
            },
            {
              "Grupo": null,
              "Coluna": "60 +",
              "Linha": "Receita",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "60 +",
              "Linha": "Despesa",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "60 +",
              "Linha": "Custo PMPM",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "60 +",
              "Linha": "Sinistralidade",
              "Valor": "0.00"
            }
          ]
        },
        {
          "Ordem": 2,
          "Tipo": 2,
          "Dados": [
            {
              "Grupo": "Receita",
              "Coluna": "Faixa",
              "Linha": "00 - 21",
              "Valor": "13.05"
            },
            {
              "Grupo": "Receita",
              "Coluna": "Faixa",
              "Linha": "22 - 40",
              "Valor": "9.91"
            },
            {
              "Grupo": "Receita",
              "Coluna": "Faixa",
              "Linha": "41 - 59",
              "Valor": "77.04"
            },
            {
              "Grupo": "Receita",
              "Coluna": "Sexo",
              "Linha": "Feminino",
              "Valor": "53.17"
            },
            {
              "Grupo": "Receita",
              "Coluna": "Sexo",
              "Linha": "Masculino",
              "Valor": "46.83"
            },
            {
              "Grupo": "Receita",
              "Coluna": "Titularidade",
              "Linha": "Dependente",
              "Valor": "55.76"
            },
            {
              "Grupo": "Receita",
              "Coluna": "Titularidade",
              "Linha": "Titular",
              "Valor": "44.24"
            },
            {
              "Grupo": "Despesa",
              "Coluna": "Faixa",
              "Linha": "00 - 21",
              "Valor": "10.63"
            },
            {
              "Grupo": "Despesa",
              "Coluna": "Faixa",
              "Linha": "22 - 40",
              "Valor": "23.30"
            },
            {
              "Grupo": "Despesa",
              "Coluna": "Faixa",
              "Linha": "41 - 59",
              "Valor": "66.07"
            },
            {
              "Grupo": "Despesa",
              "Coluna": "Sexo",
              "Linha": "Feminino",
              "Valor": "51.69"
            },
            {
              "Grupo": "Despesa",
              "Coluna": "Sexo",
              "Linha": "Masculino",
              "Valor": "48.31"
            },
            {
              "Grupo": "Despesa",
              "Coluna": "Titularidade",
              "Linha": "Dependente",
              "Valor": "80.50"
            },
            {
              "Grupo": "Despesa",
              "Coluna": "Titularidade",
              "Linha": "Titular",
              "Valor": "19.50"
            }
          ]
        }
      ]
    },

    // Relatório 13 - Evolução Mensal Despesa por Acesso
    {
      id: 13,
      ok: true,
      data: [
        {
          "Ordem": 1,
          "Tipo": 1,
          "Dados": [
            {
              "Grupo": null,
              "Coluna": "JAN/26",
              "Linha": "Rede Credenciada",
              "Valor": "1353240.00"
            },
            {
              "Grupo": null,
              "Coluna": "JAN/26",
              "Linha": "Livre Escolha",
              "Valor": "46760.00"
            },
            {
              "Grupo": null,
              "Coluna": "JAN/26",
              "Linha": "Livre Escolha - Premium",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "JAN/26",
              "Linha": "Livre Escolha - Corporate",
              "Valor": "9352.00"
            },
            {
              "Grupo": null,
              "Coluna": "JAN/26",
              "Linha": "Livre Escolha - Skill",
              "Valor": "37408.00"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/26",
              "Linha": "Rede Credenciada",
              "Valor": "1372572.00"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/26",
              "Linha": "Livre Escolha",
              "Valor": "47428.00"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/26",
              "Linha": "Livre Escolha - Premium",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/26",
              "Linha": "Livre Escolha - Corporate",
              "Valor": "9485.60"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/26",
              "Linha": "Livre Escolha - Skill",
              "Valor": "37942.40"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/26",
              "Linha": "Rede Credenciada",
              "Valor": "1333908.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/26",
              "Linha": "Livre Escolha",
              "Valor": "46092.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/26",
              "Linha": "Livre Escolha - Premium",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/26",
              "Linha": "Livre Escolha - Corporate",
              "Valor": "9218.40"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/26",
              "Linha": "Livre Escolha - Skill",
              "Valor": "36873.60"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/26",
              "Linha": "Rede Credenciada",
              "Valor": "1362906.00"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/26",
              "Linha": "Livre Escolha",
              "Valor": "47094.00"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/26",
              "Linha": "Livre Escolha - Premium",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/26",
              "Linha": "Livre Escolha - Corporate",
              "Valor": "9418.80"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/26",
              "Linha": "Livre Escolha - Skill",
              "Valor": "37675.20"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/26",
              "Linha": "Rede Credenciada",
              "Valor": "1343574.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/26",
              "Linha": "Livre Escolha",
              "Valor": "46426.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/26",
              "Linha": "Livre Escolha - Premium",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/26",
              "Linha": "Livre Escolha - Corporate",
              "Valor": "9285.20"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/26",
              "Linha": "Livre Escolha - Skill",
              "Valor": "37140.80"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/26",
              "Linha": "Rede Credenciada",
              "Valor": "1401570.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/26",
              "Linha": "Livre Escolha",
              "Valor": "48430.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/26",
              "Linha": "Livre Escolha - Premium",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/26",
              "Linha": "Livre Escolha - Corporate",
              "Valor": "9686.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/26",
              "Linha": "Livre Escolha - Skill",
              "Valor": "38744.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/26",
              "Linha": "Rede Credenciada",
              "Valor": "1285067.25"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/26",
              "Linha": "Livre Escolha",
              "Valor": "44404.35"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/26",
              "Linha": "Livre Escolha - Premium",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/26",
              "Linha": "Livre Escolha - Corporate",
              "Valor": "8880.87"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/26",
              "Linha": "Livre Escolha - Skill",
              "Valor": "35523.48"
            },
            {
              "Grupo": null,
              "Coluna": "Total",
              "Linha": "Rede Credenciada",
              "Valor": "9452837.25"
            },
            {
              "Grupo": null,
              "Coluna": "Total",
              "Linha": "Livre Escolha",
              "Valor": "326634.35"
            },
            {
              "Grupo": null,
              "Coluna": "Total",
              "Linha": "Livre Escolha - Premium",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": "Total",
              "Linha": "Livre Escolha - Corporate",
              "Valor": "65326.87"
            },
            {
              "Grupo": null,
              "Coluna": "Total",
              "Linha": "Livre Escolha - Skill",
              "Valor": "261307.48"
            },
            {
              "Grupo": null,
              "Coluna": "Perc",
              "Linha": "Rede Credenciada",
              "Valor": "0.97"
            },
            {
              "Grupo": null,
              "Coluna": "Perc",
              "Linha": "Livre Escolha",
              "Valor": "0.03"
            },
            {
              "Grupo": null,
              "Coluna": "Perc",
              "Linha": "Livre Escolha - Premium",
              "Valor": "0.00"
            }
          ]
        },
        {
          "Ordem": 2,
          "Tipo": 2,
          "Dados": [
            {
              "Grupo": null,
              "Coluna": "JAN/26",
              "Linha": "Despesa LE",
              "Valor": "46760.00"
            },
            {
              "Grupo": null,
              "Coluna": "JAN/26",
              "Linha": "Despesa RC",
              "Valor": "1353240.00"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/26",
              "Linha": "Despesa LE",
              "Valor": "47428.00"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/26",
              "Linha": "Despesa RC",
              "Valor": "1372572.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/26",
              "Linha": "Despesa LE",
              "Valor": "46092.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/26",
              "Linha": "Despesa RC",
              "Valor": "1333908.00"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/26",
              "Linha": "Despesa LE",
              "Valor": "47094.00"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/26",
              "Linha": "Despesa RC",
              "Valor": "1362906.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/26",
              "Linha": "Despesa LE",
              "Valor": "46426.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/26",
              "Linha": "Despesa RC",
              "Valor": "1343574.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/26",
              "Linha": "Despesa LE",
              "Valor": "48430.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/26",
              "Linha": "Despesa RC",
              "Valor": "1401570.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/26",
              "Linha": "Despesa LE",
              "Valor": "44404.35"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/26",
              "Linha": "Despesa RC",
              "Valor": "1285067.25"
            },
            {
              "Grupo": null,
              "Coluna": "JAN/25",
              "Linha": "Despesa LE",
              "Valor": "44088.00"
            },
            {
              "Grupo": null,
              "Coluna": "JAN/25",
              "Linha": "Despesa RC",
              "Valor": "1275912.00"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/25",
              "Linha": "Despesa LE",
              "Valor": "45090.00"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/25",
              "Linha": "Despesa RC",
              "Valor": "1304910.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/25",
              "Linha": "Despesa LE",
              "Valor": "43754.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/25",
              "Linha": "Despesa RC",
              "Valor": "1266246.00"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/25",
              "Linha": "Despesa LE",
              "Valor": "44422.00"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/25",
              "Linha": "Despesa RC",
              "Valor": "1285578.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/25",
              "Linha": "Despesa LE",
              "Valor": "43420.00"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/25",
              "Linha": "Despesa RC",
              "Valor": "1256580.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/25",
              "Linha": "Despesa LE",
              "Valor": "45424.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/25",
              "Linha": "Despesa RC",
              "Valor": "1314576.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/25",
              "Linha": "Despesa LE",
              "Valor": "43754.00"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/25",
              "Linha": "Despesa RC",
              "Valor": "1266246.00"
            }
          ]
        },
        {
          "Ordem": 3,
          "Tipo": 2,
          "Dados": [
            {
              "Grupo": null,
              "Coluna": "JAN/26",
              "Linha": "RedeCredenciada",
              "Valor": "96.66"
            },
            {
              "Grupo": null,
              "Coluna": "JAN/26",
              "Linha": "Livre Escolha",
              "Valor": "3.34"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/26",
              "Linha": "RedeCredenciada",
              "Valor": "96.66"
            },
            {
              "Grupo": null,
              "Coluna": "FEV/26",
              "Linha": "Livre Escolha",
              "Valor": "3.34"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/26",
              "Linha": "RedeCredenciada",
              "Valor": "96.66"
            },
            {
              "Grupo": null,
              "Coluna": "MAR/26",
              "Linha": "Livre Escolha",
              "Valor": "3.34"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/26",
              "Linha": "RedeCredenciada",
              "Valor": "96.66"
            },
            {
              "Grupo": null,
              "Coluna": "ABR/26",
              "Linha": "Livre Escolha",
              "Valor": "3.34"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/26",
              "Linha": "RedeCredenciada",
              "Valor": "96.66"
            },
            {
              "Grupo": null,
              "Coluna": "MAI/26",
              "Linha": "Livre Escolha",
              "Valor": "3.34"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/26",
              "Linha": "RedeCredenciada",
              "Valor": "96.66"
            },
            {
              "Grupo": null,
              "Coluna": "JUN/26",
              "Linha": "Livre Escolha",
              "Valor": "3.34"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/26",
              "Linha": "RedeCredenciada",
              "Valor": "96.66"
            },
            {
              "Grupo": null,
              "Coluna": "JUL/26",
              "Linha": "Livre Escolha",
              "Valor": "3.34"
            }
          ]
        },
        {
          "Ordem": 4,
          "Tipo": 2,
          "Dados": [
            {
              "Grupo": null,
              "Coluna": null,
              "Linha": "Livre Escolha - CORPORATE",
              "Valor": "65326.87"
            },
            {
              "Grupo": null,
              "Coluna": null,
              "Linha": "Livre Escolha - PREMIUM",
              "Valor": "0.00"
            },
            {
              "Grupo": null,
              "Coluna": null,
              "Linha": "Livre Escolha - SKILL",
              "Valor": "261307.48"
            }
          ]
        }
      ]
    },

    // Relatório 14 - Evolução Mensal Despesa por Evento
    {
      id: 14,
      ok: true,
      data: [
        {
          Ordem: 1,
          Tipo: 1,
          Dados: [
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Consultas",
                              "Valor": "56541.08"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Consultas",
                              "Valor": "57346.78"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Consultas",
                              "Valor": "55731.43"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Consultas",
                              "Valor": "56943.93"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Consultas",
                              "Valor": "56134.28"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Consultas",
                              "Valor": "58559.28"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Consultas",
                              "Valor": "53693.49"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Consultas",
                              "Valor": "56421.47"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Consultas",
                              "Valor": "50948.58"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Exames",
                              "Valor": "228733.70"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Exames",
                              "Valor": "231993.11"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Exames",
                              "Valor": "225458.31"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Exames",
                              "Valor": "230363.40"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Exames",
                              "Valor": "227088.02"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Exames",
                              "Valor": "236898.19"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Exames",
                              "Valor": "217213.93"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Exames",
                              "Valor": "228249.81"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Exames",
                              "Valor": "206109.58"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Terapias Seriadas",
                              "Valor": "49385.10"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Terapias Seriadas",
                              "Valor": "50088.83"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Terapias Seriadas",
                              "Valor": "48677.93"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Terapias Seriadas",
                              "Valor": "49736.97"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Terapias Seriadas",
                              "Valor": "49029.79"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Terapias Seriadas",
                              "Valor": "51147.87"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Terapias Seriadas",
                              "Valor": "46897.90"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Terapias Seriadas",
                              "Valor": "49280.63"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Terapias Seriadas",
                              "Valor": "44500.41"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Outros Atend. Amb",
                              "Valor": "287320.82"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Outros Atend. Amb",
                              "Valor": "291415.08"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Outros Atend. Amb",
                              "Valor": "283206.49"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Outros Atend. Amb",
                              "Valor": "289367.95"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Outros Atend. Amb",
                              "Valor": "285253.62"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Outros Atend. Amb",
                              "Valor": "297576.54"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Outros Atend. Amb",
                              "Valor": "272850.41"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Outros Atend. Amb",
                              "Valor": "286712.99"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Outros Atend. Amb",
                              "Valor": "258901.83"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Total Ambulatorial",
                              "Valor": "621980.70"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Total Ambulatorial",
                              "Valor": "630843.79"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Total Ambulatorial",
                              "Valor": "613074.16"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Total Ambulatorial",
                              "Valor": "626412.25"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Total Ambulatorial",
                              "Valor": "617505.71"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Total Ambulatorial",
                              "Valor": "644181.88"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Total Ambulatorial",
                              "Valor": "590655.74"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Total Ambulatorial",
                              "Valor": "620664.89"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Total Ambulatorial",
                              "Valor": "560460.40"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Int.Cirurgica",
                              "Valor": "389641.87"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Int.Cirurgica",
                              "Valor": "395194.18"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Int.Cirurgica",
                              "Valor": "384062.33"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Int.Cirurgica",
                              "Valor": "392418.02"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Int.Cirurgica",
                              "Valor": "386838.49"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Int.Cirurgica",
                              "Valor": "403549.87"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Int.Cirurgica",
                              "Valor": "370018.25"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Int.Cirurgica",
                              "Valor": "388817.57"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Int.Cirurgica",
                              "Valor": "351102.27"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Int.Clínica",
                              "Valor": "314903.33"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Int.Clínica",
                              "Valor": "319390.64"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Int.Clínica",
                              "Valor": "310394.03"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Int.Clínica",
                              "Valor": "317146.99"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Int.Clínica",
                              "Valor": "312637.68"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Int.Clínica",
                              "Valor": "326143.60"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Int.Clínica",
                              "Valor": "299043.79"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Int.Clínica",
                              "Valor": "314237.15"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Int.Clínica",
                              "Valor": "283756.15"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Maternidade",
                              "Valor": "33661.84"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Maternidade",
                              "Valor": "34141.51"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Maternidade",
                              "Valor": "33179.82"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Maternidade",
                              "Valor": "33901.68"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Maternidade",
                              "Valor": "33419.65"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Maternidade",
                              "Valor": "34863.38"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Maternidade",
                              "Valor": "31966.52"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Maternidade",
                              "Valor": "33590.63"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Maternidade",
                              "Valor": "30332.34"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Total Hospitalar",
                              "Valor": "738207.04"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Total Hospitalar",
                              "Valor": "748726.34"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Total Hospitalar",
                              "Valor": "727636.18"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Total Hospitalar",
                              "Valor": "743466.69"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Total Hospitalar",
                              "Valor": "732895.83"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Total Hospitalar",
                              "Valor": "764556.85"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Total Hospitalar",
                              "Valor": "701028.54"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Total Hospitalar",
                              "Valor": "736645.35"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Total Hospitalar",
                              "Valor": "665190.75"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Odontologia",
                              "Valor": "39841.41"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Odontologia",
                              "Valor": "40409.15"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Odontologia",
                              "Valor": "39270.90"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Odontologia",
                              "Valor": "40125.28"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Odontologia",
                              "Valor": "39554.76"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Odontologia",
                              "Valor": "41263.53"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Odontologia",
                              "Valor": "37834.87"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Odontologia",
                              "Valor": "39757.13"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Odontologia",
                              "Valor": "35900.69"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JAN/26",
                              "Linha": "Total Geral",
                              "Valor": "1400029.15"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "FEV/26",
                              "Linha": "Total Geral",
                              "Valor": "1419979.28"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAR/26",
                              "Linha": "Total Geral",
                              "Valor": "1379981.24"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "ABR/26",
                              "Linha": "Total Geral",
                              "Valor": "1410004.22"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "MAI/26",
                              "Linha": "Total Geral",
                              "Valor": "1389956.30"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUN/26",
                              "Linha": "Total Geral",
                              "Valor": "1450002.25"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "JUL/26",
                              "Linha": "Total Geral",
                              "Valor": "1329519.16"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media",
                              "Linha": "Total Geral",
                              "Valor": "1397067.37"
                    },
                    {
                              "Grupo": null,
                              "Coluna": "Media Anterior",
                              "Linha": "Total Geral",
                              "Valor": "1261551.84"
                    }
          ]
        }
      ]
    },

    // Relatório 15 - Consolidado Despesa por Evento - Empresa x Benchmark
    {
      id: 15,
      ok: true,
      data: {
        Dados: [
          { Grupo: null, Coluna: 'Total', Linha: 'Consultas', Valor: '394950.27' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'Consultas', Valor: '4.04%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'Consultas', Valor: '8.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'Exames', Valor: '1597748.66' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'Exames', Valor: '16.34%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'Exames', Valor: '24.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'Terapias Seriadas', Valor: '344964.39' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'Terapias Seriadas', Valor: '3.53%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'Terapias Seriadas', Valor: '11.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'Outros Atend. Amb', Valor: '2006990.91' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'Outros Atend. Amb', Valor: '20.52%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'Outros Atend. Amb', Valor: '13.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'TOTAL AMBULATORIAL', Valor: '4344654.23' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'TOTAL AMBULATORIAL', Valor: '44.43%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'TOTAL AMBULATORIAL', Valor: '56.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'INT.CIRURGICA', Valor: '2721723.01' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'INT.CIRURGICA', Valor: '27.83%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'INT.CIRURGICA', Valor: '25.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'INT.CLÍNICA', Valor: '2199660.06' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'INT.CLÍNICA', Valor: '22.49%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'INT.CLÍNICA', Valor: '10.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'MATERNIDADE', Valor: '235134.40' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'MATERNIDADE', Valor: '2.40%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'MATERNIDADE', Valor: '2.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'TOTAL HOSPITALAR', Valor: '5156517.47' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'TOTAL HOSPITALAR', Valor: '52.73%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'TOTAL HOSPITALAR', Valor: '41.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'ODONTOLOGIA', Valor: '278299.90' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'ODONTOLOGIA', Valor: '2.85%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'ODONTOLOGIA', Valor: '2.00%' },
          { Grupo: null, Coluna: 'Total', Linha: 'TOTAL GERAL', Valor: '9779471.60' },
          { Grupo: null, Coluna: '% Despesa', Linha: 'TOTAL GERAL', Valor: '100.00%' },
          { Grupo: null, Coluna: '% Despesa Bench', Linha: 'TOTAL GERAL', Valor: '100.00%' }
        ]
      }
    },

        // Relatório 16 - Check-ups Emitidos x Realizados
    {
      id: 16,
      ok: true,
      data: {
        Dados: [
          {
            "Grupo": null,
            "Coluna": "ACUMULADO",
            "Linha": "Emitidos",
            "Valor": "24"
          },
          {
            "Grupo": null,
            "Coluna": "ACUMULADO",
            "Linha": "Utilizados",
            "Valor": "18"
          },
          {
            "Grupo": null,
            "Coluna": "ACUMULADO",
            "Linha": "Custo do CheckUp",
            "Valor": "38700.00"
          },
          {
            "Grupo": null,
            "Coluna": "ACUMULADO",
            "Linha": "Custo Médio do CheckUp",
            "Valor": "2150.00"
          },
          {
            "Grupo": null,
            "Coluna": "ACUMULADO",
            "Linha": "Impacto em Exames",
            "Valor": "2.42%"
          },
          {
            "Grupo": null,
            "Coluna": "JAN/26",
            "Linha": "Emitidos",
            "Valor": "3"
          },
          {
            "Grupo": null,
            "Coluna": "JAN/26",
            "Linha": "Utilizados",
            "Valor": "2"
          },
          {
            "Grupo": null,
            "Coluna": "JAN/26",
            "Linha": "Custo do CheckUp",
            "Valor": "4300.00"
          },
          {
            "Grupo": null,
            "Coluna": "JAN/26",
            "Linha": "Custo Médio do CheckUp",
            "Valor": "2150.00"
          },
          {
            "Grupo": null,
            "Coluna": "FEV/26",
            "Linha": "Emitidos",
            "Valor": "4"
          },
          {
            "Grupo": null,
            "Coluna": "FEV/26",
            "Linha": "Utilizados",
            "Valor": "3"
          },
          {
            "Grupo": null,
            "Coluna": "FEV/26",
            "Linha": "Custo do CheckUp",
            "Valor": "6450.00"
          },
          {
            "Grupo": null,
            "Coluna": "FEV/26",
            "Linha": "Custo Médio do CheckUp",
            "Valor": "2150.00"
          },
          {
            "Grupo": null,
            "Coluna": "MAR/26",
            "Linha": "Emitidos",
            "Valor": "3"
          },
          {
            "Grupo": null,
            "Coluna": "MAR/26",
            "Linha": "Utilizados",
            "Valor": "3"
          },
          {
            "Grupo": null,
            "Coluna": "MAR/26",
            "Linha": "Custo do CheckUp",
            "Valor": "6450.00"
          },
          {
            "Grupo": null,
            "Coluna": "MAR/26",
            "Linha": "Custo Médio do CheckUp",
            "Valor": "2150.00"
          },
          {
            "Grupo": null,
            "Coluna": "ABR/26",
            "Linha": "Emitidos",
            "Valor": "4"
          },
          {
            "Grupo": null,
            "Coluna": "ABR/26",
            "Linha": "Utilizados",
            "Valor": "3"
          },
          {
            "Grupo": null,
            "Coluna": "ABR/26",
            "Linha": "Custo do CheckUp",
            "Valor": "6450.00"
          },
          {
            "Grupo": null,
            "Coluna": "ABR/26",
            "Linha": "Custo Médio do CheckUp",
            "Valor": "2150.00"
          },
          {
            "Grupo": null,
            "Coluna": "MAI/26",
            "Linha": "Emitidos",
            "Valor": "3"
          },
          {
            "Grupo": null,
            "Coluna": "MAI/26",
            "Linha": "Utilizados",
            "Valor": "2"
          },
          {
            "Grupo": null,
            "Coluna": "MAI/26",
            "Linha": "Custo do CheckUp",
            "Valor": "4300.00"
          },
          {
            "Grupo": null,
            "Coluna": "MAI/26",
            "Linha": "Custo Médio do CheckUp",
            "Valor": "2150.00"
          },
          {
            "Grupo": null,
            "Coluna": "JUN/26",
            "Linha": "Emitidos",
            "Valor": "4"
          },
          {
            "Grupo": null,
            "Coluna": "JUN/26",
            "Linha": "Utilizados",
            "Valor": "3"
          },
          {
            "Grupo": null,
            "Coluna": "JUN/26",
            "Linha": "Custo do CheckUp",
            "Valor": "6450.00"
          },
          {
            "Grupo": null,
            "Coluna": "JUN/26",
            "Linha": "Custo Médio do CheckUp",
            "Valor": "2150.00"
          },
          {
            "Grupo": null,
            "Coluna": "JUL/26",
            "Linha": "Emitidos",
            "Valor": "3"
          },
          {
            "Grupo": null,
            "Coluna": "JUL/26",
            "Linha": "Utilizados",
            "Valor": "2"
          },
          {
            "Grupo": null,
            "Coluna": "JUL/26",
            "Linha": "Custo do CheckUp",
            "Valor": "4300.00"
          },
          {
            "Grupo": null,
            "Coluna": "JUL/26",
            "Linha": "Custo Médio do CheckUp",
            "Valor": "2150.00"
          }
        ]
      }
    },

    // Relatório 17 - Ranking Hospitais e Laboratórios
    {
      id: 17,
      ok: true,
      data: [
            {
                    "Ordem": 1,
                    "Tipo": 1,
                    "Dados": [
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "REDE D'OR - BRASIL",
                                    "Valor": "3861070.24"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "REDE D'OR - BRASIL",
                                    "Valor": "39.48%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "REDE D'OR - BRASIL",
                                    "Valor": "39.48%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "SOCIEDADE BENEFICENTE SÃO CAMILO",
                                    "Valor": "492621.62"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "SOCIEDADE BENEFICENTE SÃO CAMILO",
                                    "Valor": "5.04%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "SOCIEDADE BENEFICENTE SÃO CAMILO",
                                    "Valor": "44.52%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "HOSPITAL ISRAELITA ALBERT EINSTEIN",
                                    "Valor": "341800.50"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "HOSPITAL ISRAELITA ALBERT EINSTEIN",
                                    "Valor": "3.50%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "HOSPITAL ISRAELITA ALBERT EINSTEIN",
                                    "Valor": "48.01%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "HOSPITAL SÍRIO-LIBANÊS",
                                    "Valor": "281106.30"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "HOSPITAL SÍRIO-LIBANÊS",
                                    "Valor": "2.87%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "HOSPITAL SÍRIO-LIBANÊS",
                                    "Valor": "50.89%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "HOSPITAL ALEMÃO OSWALDO CRUZ",
                                    "Valor": "272856.37"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "HOSPITAL ALEMÃO OSWALDO CRUZ",
                                    "Valor": "2.79%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "HOSPITAL ALEMÃO OSWALDO CRUZ",
                                    "Valor": "53.68%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "HOSPITAL BLANC",
                                    "Valor": "94341.76"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "HOSPITAL BLANC",
                                    "Valor": "0.96%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "HOSPITAL BLANC",
                                    "Valor": "54.64%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "HOSPITAL INFANTIL SABARÁ",
                                    "Valor": "85210.40"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "HOSPITAL INFANTIL SABARÁ",
                                    "Valor": "0.87%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "HOSPITAL INFANTIL SABARÁ",
                                    "Valor": "55.51%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "HOSPITAL SANTA JOANA",
                                    "Valor": "78420.00"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "HOSPITAL SANTA JOANA",
                                    "Valor": "0.80%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "HOSPITAL SANTA JOANA",
                                    "Valor": "56.32%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "HOSPITAL NOVE DE JULHO",
                                    "Valor": "65110.15"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "HOSPITAL NOVE DE JULHO",
                                    "Valor": "0.67%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "HOSPITAL NOVE DE JULHO",
                                    "Valor": "56.98%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "Total",
                                    "Linha": "HOSPITAL SAMARITANO",
                                    "Valor": "54980.20"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "%",
                                    "Linha": "HOSPITAL SAMARITANO",
                                    "Valor": "0.56%"
                            },
                            {
                                    "Grupo": "HOSPITAIS",
                                    "Coluna": "% ac",
                                    "Linha": "HOSPITAL SAMARITANO",
                                    "Valor": "57.54%"
                            }
                    ]
            },
            {
                    "Ordem": 2,
                    "Tipo": 1,
                    "Dados": [
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS REDE D'OR - SÃO LUIZ",
                                    "Valor": "420150.00"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS REDE D'OR - SÃO LUIZ",
                                    "Valor": "4.30%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS REDE D'OR - SÃO LUIZ",
                                    "Valor": "4.30%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS HOSPITAL ALBERT EINSTEIN",
                                    "Valor": "310400.25"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS HOSPITAL ALBERT EINSTEIN",
                                    "Valor": "3.17%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS HOSPITAL ALBERT EINSTEIN",
                                    "Valor": "7.47%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS HOSPITAL SÍRIO-LIBANÊS",
                                    "Valor": "245320.10"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS HOSPITAL SÍRIO-LIBANÊS",
                                    "Valor": "2.51%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS HOSPITAL SÍRIO-LIBANÊS",
                                    "Valor": "9.98%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS HOSPITAL SAMARITANO",
                                    "Valor": "185600.00"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS HOSPITAL SAMARITANO",
                                    "Valor": "1.90%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS HOSPITAL SAMARITANO",
                                    "Valor": "11.88%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS HOSPITAL NOVE DE JULHO",
                                    "Valor": "142100.50"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS HOSPITAL NOVE DE JULHO",
                                    "Valor": "1.45%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS HOSPITAL NOVE DE JULHO",
                                    "Valor": "13.33%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS INFANTIL SABARÁ",
                                    "Valor": "115200.00"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS INFANTIL SABARÁ",
                                    "Valor": "1.18%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS INFANTIL SABARÁ",
                                    "Valor": "14.51%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS HOSPITAL SÃO CAMILO",
                                    "Valor": "98450.20"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS HOSPITAL SÃO CAMILO",
                                    "Valor": "1.01%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS HOSPITAL SÃO CAMILO",
                                    "Valor": "15.51%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS HOSPITAL SANTA CATARINA",
                                    "Valor": "82100.00"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS HOSPITAL SANTA CATARINA",
                                    "Valor": "0.84%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS HOSPITAL SANTA CATARINA",
                                    "Valor": "16.35%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS HOSPITAL LEFORTE",
                                    "Valor": "65400.30"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS HOSPITAL LEFORTE",
                                    "Valor": "0.67%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS HOSPITAL LEFORTE",
                                    "Valor": "17.02%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "Total",
                                    "Linha": "PS HOSPITAL PAULISTANO",
                                    "Valor": "51200.00"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "%",
                                    "Linha": "PS HOSPITAL PAULISTANO",
                                    "Valor": "0.52%"
                            },
                            {
                                    "Grupo": "PRONTO ATENDIMENTO",
                                    "Coluna": "% ac",
                                    "Linha": "PS HOSPITAL PAULISTANO",
                                    "Valor": "17.55%"
                            }
                    ]
            },
            {
                    "Ordem": 3,
                    "Tipo": 1,
                    "Dados": [
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "FLEURY MEDICINA E SAÚDE",
                                    "Valor": "580420.30"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "FLEURY MEDICINA E SAÚDE",
                                    "Valor": "5.94%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "FLEURY MEDICINA E SAÚDE",
                                    "Valor": "5.94%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "ALTA EXCELÊNCIA DIAGNÓSTICA",
                                    "Valor": "395110.20"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "ALTA EXCELÊNCIA DIAGNÓSTICA",
                                    "Valor": "4.04%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "ALTA EXCELÊNCIA DIAGNÓSTICA",
                                    "Valor": "9.98%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "DELBONI AURIEMO (DASA)",
                                    "Valor": "285400.00"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "DELBONI AURIEMO (DASA)",
                                    "Valor": "2.92%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "DELBONI AURIEMO (DASA)",
                                    "Valor": "12.89%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "LABORATÓRIO SÍRIO-LIBANÊS",
                                    "Valor": "198300.50"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "LABORATÓRIO SÍRIO-LIBANÊS",
                                    "Valor": "2.03%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "LABORATÓRIO SÍRIO-LIBANÊS",
                                    "Valor": "14.92%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "LABORATÓRIO ALBERT EINSTEIN",
                                    "Valor": "175200.00"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "LABORATÓRIO ALBERT EINSTEIN",
                                    "Valor": "1.79%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "LABORATÓRIO ALBERT EINSTEIN",
                                    "Valor": "16.71%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "CDB INTELIGÊNCIA DIAGNÓSTICA",
                                    "Valor": "132400.80"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "CDB INTELIGÊNCIA DIAGNÓSTICA",
                                    "Valor": "1.35%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "CDB INTELIGÊNCIA DIAGNÓSTICA",
                                    "Valor": "18.07%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "HERMES PARDINI",
                                    "Valor": "95400.20"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "HERMES PARDINI",
                                    "Valor": "0.98%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "HERMES PARDINI",
                                    "Valor": "19.04%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "A+ MEDICINA DIAGNÓSTICA",
                                    "Valor": "82100.00"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "A+ MEDICINA DIAGNÓSTICA",
                                    "Valor": "0.84%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "A+ MEDICINA DIAGNÓSTICA",
                                    "Valor": "19.88%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "SALOMÃO ZOPPI DIAGNÓSTICOS",
                                    "Valor": "64200.50"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "SALOMÃO ZOPPI DIAGNÓSTICOS",
                                    "Valor": "0.66%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "SALOMÃO ZOPPI DIAGNÓSTICOS",
                                    "Valor": "20.54%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "Total",
                                    "Linha": "CURA CENTRO DE ULTRASSOM",
                                    "Valor": "42100.00"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "%",
                                    "Linha": "CURA CENTRO DE ULTRASSOM",
                                    "Valor": "0.43%"
                            },
                            {
                                    "Grupo": "LABORATORIOS",
                                    "Coluna": "% ac",
                                    "Linha": "CURA CENTRO DE ULTRASSOM",
                                    "Valor": "20.97%"
                            }
                    ]
            }
    ]
    },

    // Relatório 18 - Ranking Associados de Alto Custo (20+)
    {
      id: 18,
      ok: true,
      data: {
        Dados: [
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "1",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "1",
                            "Valor": "412500.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "1",
                            "Valor": "4.22%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "1",
                            "Valor": "4.22%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "1",
                            "Valor": "405000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "1",
                            "Valor": "7500.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "1",
                            "Valor": "1.82%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "2",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "2",
                            "Valor": "345200.50"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "2",
                            "Valor": "3.53%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "2",
                            "Valor": "7.75%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "2",
                            "Valor": "345200.50"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "2",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "2",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "3",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "3",
                            "Valor": "298400.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "3",
                            "Valor": "3.05%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "3",
                            "Valor": "10.80%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "3",
                            "Valor": "290000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "3",
                            "Valor": "8400.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "3",
                            "Valor": "2.82%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "4",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "4",
                            "Valor": "254100.20"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "4",
                            "Valor": "2.60%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "4",
                            "Valor": "13.40%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "4",
                            "Valor": "254100.20"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "4",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "4",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "5",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "5",
                            "Valor": "221000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "5",
                            "Valor": "2.26%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "5",
                            "Valor": "15.66%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "5",
                            "Valor": "215000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "5",
                            "Valor": "6000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "5",
                            "Valor": "2.71%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "6",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "6",
                            "Valor": "198500.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "6",
                            "Valor": "2.03%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "6",
                            "Valor": "17.69%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "6",
                            "Valor": "198500.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "6",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "6",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "7",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "7",
                            "Valor": "182300.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "7",
                            "Valor": "1.86%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "7",
                            "Valor": "19.55%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "7",
                            "Valor": "175000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "7",
                            "Valor": "7300.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "7",
                            "Valor": "4.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "8",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "8",
                            "Valor": "165400.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "8",
                            "Valor": "1.69%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "8",
                            "Valor": "21.24%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "8",
                            "Valor": "165400.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "8",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "8",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "9",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "9",
                            "Valor": "154200.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "9",
                            "Valor": "1.58%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "9",
                            "Valor": "22.82%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "9",
                            "Valor": "150000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "9",
                            "Valor": "4200.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "9",
                            "Valor": "2.72%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "10",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "10",
                            "Valor": "142100.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "10",
                            "Valor": "1.45%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "10",
                            "Valor": "24.27%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "10",
                            "Valor": "142100.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "10",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "10",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "11",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "11",
                            "Valor": "135800.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "11",
                            "Valor": "1.39%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "11",
                            "Valor": "25.66%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "11",
                            "Valor": "135800.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "11",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "11",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "12",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "12",
                            "Valor": "128400.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "12",
                            "Valor": "1.31%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "12",
                            "Valor": "26.97%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "12",
                            "Valor": "120000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "12",
                            "Valor": "8400.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "12",
                            "Valor": "6.54%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "13",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "13",
                            "Valor": "121000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "13",
                            "Valor": "1.24%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "13",
                            "Valor": "28.21%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "13",
                            "Valor": "121000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "13",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "13",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "14",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "14",
                            "Valor": "115200.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "14",
                            "Valor": "1.18%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "14",
                            "Valor": "29.39%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "14",
                            "Valor": "110000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "14",
                            "Valor": "5200.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "14",
                            "Valor": "4.51%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "15",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "15",
                            "Valor": "108900.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "15",
                            "Valor": "1.11%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "15",
                            "Valor": "30.50%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "15",
                            "Valor": "108900.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "15",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "15",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "16",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "16",
                            "Valor": "102400.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "16",
                            "Valor": "1.05%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "16",
                            "Valor": "31.55%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "16",
                            "Valor": "102400.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "16",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "16",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "17",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "17",
                            "Valor": "98500.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "17",
                            "Valor": "1.01%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "17",
                            "Valor": "32.56%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "17",
                            "Valor": "95000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "17",
                            "Valor": "3500.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "17",
                            "Valor": "3.55%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "18",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "18",
                            "Valor": "94200.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "18",
                            "Valor": "0.96%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "18",
                            "Valor": "33.52%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "18",
                            "Valor": "94200.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "18",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "18",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "19",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "19",
                            "Valor": "89600.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "19",
                            "Valor": "0.92%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "19",
                            "Valor": "34.44%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "19",
                            "Valor": "89600.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "19",
                            "Valor": "0.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "19",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "20",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Despesa",
                            "Linha": "20",
                            "Valor": "85200.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesa",
                            "Linha": "20",
                            "Valor": "0.87%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaAC",
                            "Linha": "20",
                            "Valor": "35.31%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaRc",
                            "Linha": "20",
                            "Valor": "82000.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "DespesaLe",
                            "Linha": "20",
                            "Valor": "3200.00"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercDespesaLE",
                            "Linha": "20",
                            "Valor": "3.76%"
                  }
        ]
      }
    },

    // Relatório 19 - Ranking Maiores Utilizadores de Consultas
    {
      id: 19,
      ok: true,
      data: {
        Dados: [
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "1",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "1",
                            "Valor": "36"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "1",
                            "Valor": "34"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "1",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "1",
                            "Valor": "5.56%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "2",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "2",
                            "Valor": "35"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "2",
                            "Valor": "33"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "2",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "2",
                            "Valor": "5.71%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "3",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "3",
                            "Valor": "33"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "3",
                            "Valor": "31"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "3",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "3",
                            "Valor": "6.06%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "4",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "4",
                            "Valor": "32"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "4",
                            "Valor": "24"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "4",
                            "Valor": "8"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "4",
                            "Valor": "25.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "5",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "5",
                            "Valor": "30"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "5",
                            "Valor": "28"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "5",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "5",
                            "Valor": "6.67%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "6",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "6",
                            "Valor": "29"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "6",
                            "Valor": "28"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "6",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "6",
                            "Valor": "3.45%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "7",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "7",
                            "Valor": "27"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "7",
                            "Valor": "26"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "7",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "7",
                            "Valor": "3.70%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "8",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "8",
                            "Valor": "26"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "8",
                            "Valor": "19"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "8",
                            "Valor": "7"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "8",
                            "Valor": "26.92%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "9",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "9",
                            "Valor": "24"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "9",
                            "Valor": "23"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "9",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "9",
                            "Valor": "4.17%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "10",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "10",
                            "Valor": "23"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "10",
                            "Valor": "22"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "10",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "10",
                            "Valor": "4.35%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "11",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "11",
                            "Valor": "21"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "11",
                            "Valor": "20"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "11",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "11",
                            "Valor": "4.76%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "12",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "12",
                            "Valor": "20"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "12",
                            "Valor": "15"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "12",
                            "Valor": "5"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "12",
                            "Valor": "25.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "13",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "13",
                            "Valor": "18"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "13",
                            "Valor": "17"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "13",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "13",
                            "Valor": "5.56%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "14",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "14",
                            "Valor": "17"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "14",
                            "Valor": "16"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "14",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "14",
                            "Valor": "5.88%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "15",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "15",
                            "Valor": "15"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "15",
                            "Valor": "14"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "15",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "15",
                            "Valor": "6.67%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "16",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "16",
                            "Valor": "14"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "16",
                            "Valor": "10"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "16",
                            "Valor": "4"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "16",
                            "Valor": "28.57%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "17",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "17",
                            "Valor": "12"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "17",
                            "Valor": "11"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "17",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "17",
                            "Valor": "8.33%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "18",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "18",
                            "Valor": "11"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "18",
                            "Valor": "10"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "18",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "18",
                            "Valor": "9.09%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "19",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "19",
                            "Valor": "9"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "19",
                            "Valor": "9"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "19",
                            "Valor": "0"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "19",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "20",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "20",
                            "Valor": "8"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "20",
                            "Valor": "6"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "20",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "20",
                            "Valor": "25.00%"
                  }
        ]
      }
    },

    // Relatório 20 - Ranking Maiores Utilizadores de Consulta Pronto Socorro
    {
      id: 20,
      ok: true,
      data: {
        Dados: [
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "1",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "1",
                            "Valor": "21"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "1",
                            "Valor": "20"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "1",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "1",
                            "Valor": "4.76%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "2",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "2",
                            "Valor": "20"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "2",
                            "Valor": "19"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "2",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "2",
                            "Valor": "5.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "3",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "3",
                            "Valor": "19"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "3",
                            "Valor": "18"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "3",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "3",
                            "Valor": "5.26%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "4",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "4",
                            "Valor": "18"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "4",
                            "Valor": "13"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "4",
                            "Valor": "5"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "4",
                            "Valor": "27.78%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "5",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "5",
                            "Valor": "18"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "5",
                            "Valor": "17"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "5",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "5",
                            "Valor": "5.56%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "6",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "6",
                            "Valor": "17"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "6",
                            "Valor": "16"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "6",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "6",
                            "Valor": "5.88%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "7",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "7",
                            "Valor": "16"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "7",
                            "Valor": "15"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "7",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "7",
                            "Valor": "6.25%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "8",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "8",
                            "Valor": "15"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "8",
                            "Valor": "11"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "8",
                            "Valor": "4"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "8",
                            "Valor": "26.67%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "9",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "9",
                            "Valor": "14"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "9",
                            "Valor": "13"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "9",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "9",
                            "Valor": "7.14%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "10",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "10",
                            "Valor": "13"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "10",
                            "Valor": "12"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "10",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "10",
                            "Valor": "7.69%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "11",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "11",
                            "Valor": "12"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "11",
                            "Valor": "11"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "11",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "11",
                            "Valor": "8.33%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "12",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "12",
                            "Valor": "11"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "12",
                            "Valor": "8"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "12",
                            "Valor": "3"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "12",
                            "Valor": "27.27%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "13",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "13",
                            "Valor": "11"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "13",
                            "Valor": "10"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "13",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "13",
                            "Valor": "9.09%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "14",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "14",
                            "Valor": "10"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "14",
                            "Valor": "9"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "14",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "14",
                            "Valor": "10.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "15",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "15",
                            "Valor": "9"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "15",
                            "Valor": "9"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "15",
                            "Valor": "0"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "15",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "16",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "16",
                            "Valor": "8"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "16",
                            "Valor": "6"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "16",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "16",
                            "Valor": "25.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "17",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "17",
                            "Valor": "7"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "17",
                            "Valor": "7"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "17",
                            "Valor": "0"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "17",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "18",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "18",
                            "Valor": "6"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "18",
                            "Valor": "6"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "18",
                            "Valor": "0"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "18",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "19",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "19",
                            "Valor": "5"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "19",
                            "Valor": "5"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "19",
                            "Valor": "0"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "19",
                            "Valor": "0.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "20",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "20",
                            "Valor": "5"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "20",
                            "Valor": "4"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "20",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "20",
                            "Valor": "20.00%"
                  }
        ]
      }
    },

    // Relatório 21 - Ranking Maiores Utilizadores de Terapias Seriadas
    {
      id: 21,
      ok: true,
      data: {
        Dados: [
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "1",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "1",
                            "Valor": "62"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "1",
                            "Valor": "59"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "1",
                            "Valor": "3"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "1",
                            "Valor": "4.84%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "2",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "2",
                            "Valor": "60"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "2",
                            "Valor": "57"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "2",
                            "Valor": "3"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "2",
                            "Valor": "5.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "3",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "3",
                            "Valor": "57"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "3",
                            "Valor": "54"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "3",
                            "Valor": "3"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "3",
                            "Valor": "5.26%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "4",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "4",
                            "Valor": "55"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "4",
                            "Valor": "41"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "4",
                            "Valor": "14"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "4",
                            "Valor": "25.45%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "5",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "5",
                            "Valor": "52"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "5",
                            "Valor": "49"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "5",
                            "Valor": "3"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "5",
                            "Valor": "5.77%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "6",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "6",
                            "Valor": "49"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "6",
                            "Valor": "47"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "6",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "6",
                            "Valor": "4.08%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "7",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "7",
                            "Valor": "47"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "7",
                            "Valor": "45"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "7",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "7",
                            "Valor": "4.26%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "8",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "8",
                            "Valor": "44"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "8",
                            "Valor": "33"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "8",
                            "Valor": "11"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "8",
                            "Valor": "25.00%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "9",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "9",
                            "Valor": "42"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "9",
                            "Valor": "40"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "9",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "9",
                            "Valor": "4.76%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "10",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "10",
                            "Valor": "39"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "10",
                            "Valor": "37"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "10",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "10",
                            "Valor": "5.13%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "11",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "11",
                            "Valor": "36"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "11",
                            "Valor": "34"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "11",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "11",
                            "Valor": "5.56%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "12",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "12",
                            "Valor": "34"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "12",
                            "Valor": "25"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "12",
                            "Valor": "9"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "12",
                            "Valor": "26.47%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "13",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "13",
                            "Valor": "31"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "13",
                            "Valor": "29"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "13",
                            "Valor": "2"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "13",
                            "Valor": "6.45%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "14",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "14",
                            "Valor": "29"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "14",
                            "Valor": "28"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "14",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "14",
                            "Valor": "3.45%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "15",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "15",
                            "Valor": "26"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "15",
                            "Valor": "25"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "15",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "15",
                            "Valor": "3.85%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "16",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "16",
                            "Valor": "23"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "16",
                            "Valor": "17"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "16",
                            "Valor": "6"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "16",
                            "Valor": "26.09%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "17",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "17",
                            "Valor": "21"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "17",
                            "Valor": "20"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "17",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "17",
                            "Valor": "4.76%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "18",
                            "Valor": "DEPENDENTE"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "18",
                            "Valor": "18"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "18",
                            "Valor": "17"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "18",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "18",
                            "Valor": "5.56%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "19",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "19",
                            "Valor": "16"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "19",
                            "Valor": "15"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "19",
                            "Valor": "1"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "19",
                            "Valor": "6.25%"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Categoria",
                            "Linha": "20",
                            "Valor": "TITULAR"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "Frequencia",
                            "Linha": "20",
                            "Valor": "13"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqRC",
                            "Linha": "20",
                            "Valor": "10"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "FreqLE",
                            "Linha": "20",
                            "Valor": "3"
                  },
                  {
                            "Grupo": null,
                            "Coluna": "PercLE",
                            "Linha": "20",
                            "Valor": "23.08%"
                  }
        ]
      }
    },

    // Relatório 22 - Relação de Associados com Voucher Check-up
    {
      id: 22,
      ok: true,
      data: {
                Dados: [
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82910",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82910",
            "Valor": "42"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82910",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82910",
            "Valor": "15/01/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82910",
            "Valor": "15/07/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82910",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82911",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82911",
            "Valor": "38"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82911",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82911",
            "Valor": "22/01/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82911",
            "Valor": "22/07/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82911",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82912",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82912",
            "Valor": "51"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82912",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82912",
            "Valor": "05/02/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82912",
            "Valor": "05/08/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82912",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82913",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82913",
            "Valor": "29"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82913",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82913",
            "Valor": "12/02/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82913",
            "Valor": "12/08/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82913",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82914",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82914",
            "Valor": "47"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82914",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82914",
            "Valor": "18/02/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82914",
            "Valor": "18/08/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82914",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82915",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82915",
            "Valor": "33"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82915",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82915",
            "Valor": "02/03/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82915",
            "Valor": "02/09/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82915",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82916",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82916",
            "Valor": "45"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82916",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82916",
            "Valor": "15/03/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82916",
            "Valor": "15/09/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82916",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82917",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82917",
            "Valor": "31"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82917",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82917",
            "Valor": "10/04/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82917",
            "Valor": "10/10/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82917",
            "Valor": "Não"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82918",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82918",
            "Valor": "54"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82918",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82918",
            "Valor": "25/04/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82918",
            "Valor": "25/10/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82918",
            "Valor": "Não"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82919",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82919",
            "Valor": "36"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82919",
            "Valor": "SKILL"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82919",
            "Valor": "12/05/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82919",
            "Valor": "12/11/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82919",
            "Valor": "Não"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82920",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82920",
            "Valor": "49"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82920",
            "Valor": "CORPORATE"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82920",
            "Valor": "20/01/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82920",
            "Valor": "20/07/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82920",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82921",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82921",
            "Valor": "44"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82921",
            "Valor": "CORPORATE"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82921",
            "Valor": "08/02/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82921",
            "Valor": "08/08/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82921",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82922",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82922",
            "Valor": "53"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82922",
            "Valor": "CORPORATE"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82922",
            "Valor": "24/02/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82922",
            "Valor": "24/08/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82922",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82923",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82923",
            "Valor": "39"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82923",
            "Valor": "CORPORATE"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82923",
            "Valor": "10/03/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82923",
            "Valor": "10/09/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82923",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82924",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82924",
            "Valor": "48"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82924",
            "Valor": "CORPORATE"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82924",
            "Valor": "28/03/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82924",
            "Valor": "28/09/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82924",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82925",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82925",
            "Valor": "35"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82925",
            "Valor": "CORPORATE"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82925",
            "Valor": "14/04/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82925",
            "Valor": "14/10/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82925",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82926",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82926",
            "Valor": "56"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82926",
            "Valor": "CORPORATE"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82926",
            "Valor": "05/05/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82926",
            "Valor": "05/11/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82926",
            "Valor": "Não"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82927",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82927",
            "Valor": "40"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82927",
            "Valor": "CORPORATE"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82927",
            "Valor": "20/05/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82927",
            "Valor": "20/11/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82927",
            "Valor": "Não"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82928",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82928",
            "Valor": "52"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82928",
            "Valor": "PREMIUM"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82928",
            "Valor": "18/01/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82928",
            "Valor": "18/07/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82928",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82929",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82929",
            "Valor": "46"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82929",
            "Valor": "PREMIUM"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82929",
            "Valor": "15/02/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82929",
            "Valor": "15/08/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82929",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82930",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82930",
            "Valor": "58"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82930",
            "Valor": "PREMIUM"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82930",
            "Valor": "04/03/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82930",
            "Valor": "04/09/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82930",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82931",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82931",
            "Valor": "43"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82931",
            "Valor": "PREMIUM"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82931",
            "Valor": "22/03/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82931",
            "Valor": "22/09/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82931",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82932",
            "Valor": "M"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82932",
            "Valor": "50"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82932",
            "Valor": "PREMIUM"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82932",
            "Valor": "19/04/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82932",
            "Valor": "19/10/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82932",
            "Valor": "Sim"
          },
          {
            "Grupo": null,
            "Coluna": "Sexo",
            "Linha": "VCH-82933",
            "Valor": "F"
          },
          {
            "Grupo": null,
            "Coluna": "Idade",
            "Linha": "VCH-82933",
            "Valor": "41"
          },
          {
            "Grupo": null,
            "Coluna": "Plano",
            "Linha": "VCH-82933",
            "Valor": "PREMIUM"
          },
          {
            "Grupo": null,
            "Coluna": "DtEmissao",
            "Linha": "VCH-82933",
            "Valor": "02/06/2026"
          },
          {
            "Grupo": null,
            "Coluna": "DtVencimento",
            "Linha": "VCH-82933",
            "Valor": "02/12/2026"
          },
          {
            "Grupo": null,
            "Coluna": "Realizou",
            "Linha": "VCH-82933",
            "Valor": "Não"
          }
        ]
      }
    }
    ],
  inativos: {
    empresas: [
      {
        Cod_Empresa: '56020-INAT',
        Razao: 'CBRE CONSULTORIA DO BRASIL LTDA - INATIVOS',
        QTD_Vidas: 49
      }
    ],
    relatorios: [
      {
        empresa: {
          Cod_Empresa: '56020-INAT',
          Razao: 'CBRE CONSULTORIA DO BRASIL LTDA - INATIVOS',
          QTD_Vidas: 49
        },
        idRelatorio: 1,
        ok: true,
        data: {
          Ordem: 1,
          Dados: [
            { Grupo: 'Medicina', Coluna: 'TOTAL', Linha: 'VIDAS', Valor: '49' },
            { Grupo: 'Medicina', Coluna: 'TOTAL', Linha: 'RECEITA', Valor: '480000.00' },
            { Grupo: 'Medicina', Coluna: 'TOTAL', Linha: 'DESPESA', Valor: '1250000.00' },
            { Grupo: 'Medicina', Coluna: 'TOTAL', Linha: 'SINISTRALIDADE', Valor: '260.42%' },
            { Grupo: 'Odontologia', Coluna: 'TOTAL', Linha: 'VIDAS', Valor: '0' },
            { Grupo: 'Odontologia', Coluna: 'TOTAL', Linha: 'RECEITA', Valor: '0' },
            { Grupo: 'Odontologia', Coluna: 'TOTAL', Linha: 'DESPESA', Valor: '0' },
            { Grupo: 'Odontologia', Coluna: 'TOTAL', Linha: 'SINISTRALIDADE', Valor: '0.00%' }
          ]
        }
      }
    ]
  }
};