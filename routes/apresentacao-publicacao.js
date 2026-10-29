
// routes/apresentacao-publicacao.js
// ESM — projeto usa "type": "module"
//
// Publicação da apresentação comercial:
//
// POST /api/apresentacao/publicar
// GET  /api/apresentacao/publica/:token
// GET  /apresentacao/:token

import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const router = express.Router();

const DIR_PUBLICACOES = path.join(
  process.cwd(),
  'data',
  'publicacoes'
);

const ARQUIVO_EXTERNO = path.join(
  process.cwd(),
  'public',
  'apresentacao-externa.html'
);

const corpoGrande = express.json({
  limit: '4mb'
});

/* ============================================================
   Token
   ============================================================ */

function gerarToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function validarToken(token) {
  return /^[A-Za-z0-9_-]{20,64}$/.test(String(token || ''));
}

function caminhoPublicacao(token) {
  if (!validarToken(token)) {
    throw new Error('Token inválido');
  }

  return path.join(
    DIR_PUBLICACOES,
    `${token}.json`
  );
}

/* ============================================================
   Persistência
   ============================================================ */

async function salvarPublicacao(token, dados) {
  await fs.mkdir(DIR_PUBLICACOES, {
    recursive: true
  });

  const registro = {
    token,
    criadoEm: new Date().toISOString(),
    dados
  };

  await fs.writeFile(
    caminhoPublicacao(token),
    JSON.stringify(registro, null, 2),
    'utf8'
  );

  return registro;
}

async function lerPublicacao(token) {
  try {
    const texto = await fs.readFile(
      caminhoPublicacao(token),
      'utf8'
    );

    return JSON.parse(texto);

  } catch (err) {

    if (err.code === 'ENOENT') {
      return null;
    }

    throw err;
  }
}

/* ============================================================
   POST /api/apresentacao/publicar
   ============================================================ */

router.post(
  '/api/apresentacao/publicar',
  corpoGrande,
  async (req, res) => {

    try {

      const dados = req.body || {};

      if (
        !dados ||
        typeof dados !== 'object' ||
        Array.isArray(dados)
      ) {
        return res.status(400).json({
          ok: false,
          error: 'Dados da apresentação não informados.'
        });
      }

      const token = gerarToken();

      const registro = await salvarPublicacao(
        token,
        dados
      );

      console.log(
        `[Apresentacao] publicação criada: ${token}`
      );

      return res.json({
        ok: true,
        token: registro.token,
        criadoEm: registro.criadoEm,
        cdEmpresa: registro.dados?.cdEmpresa || '',
        dataInicial: registro.dados?.dataInicial || '',
        dataFinal: registro.dados?.dataFinal || ''
      });

    } catch (err) {

      console.error(
        '[Apresentacao] erro ao publicar:',
        err
      );

      return res.status(500).json({
        ok: false,
        error:
          err?.message ||
          'Não foi possível publicar a apresentação.'
      });
    }
  }
);


/* ============================================================
   GET /api/apresentacao/publica/:token
   ============================================================ */

router.get(
  '/api/apresentacao/publica/:token',
  async (req, res) => {

    try {

      const { token } = req.params;

      if (!validarToken(token)) {
        return res.status(400).json({
          ok: false,
          error: 'Token inválido.'
        });
      }

      const registro = await lerPublicacao(token);

      if (!registro) {
        return res.status(404).json({
          ok: false,
          error:
            'Apresentação não encontrada ou link inválido.'
        });
      }

      return res.json({
        ok: true,
        token: registro.token,
        criadoEm: registro.criadoEm,

        // Parâmetros usados pelo engine da apresentação externa
        cdEmpresa: registro.dados?.cdEmpresa || '',
        dataInicial: registro.dados?.dataInicial || '',
        dataFinal: registro.dados?.dataFinal || ''
      });

    } catch (err) {

      console.error(
        '[Apresentacao] erro ao carregar publicação:',
        err
      );

      return res.status(500).json({
        ok: false,
        error:
          'Não foi possível carregar a apresentação.'
      });
    }
  }
);



/* ============================================================
   GET /apresentacao/:token
   ============================================================ */

router.get(
  '/apresentacao/:token',
  async (req, res) => {

    try {

      const { token } = req.params;

      if (!validarToken(token)) {
        return res.status(404).send('Link de apresentação inválido.');
      }

      /*
       * A página externa recebe o token pela query string.
       *
       * O HTML possui:
       *
       *   data-modo="leitura"
       *
       * e o engine pode então buscar:
       *
       *   /api/apresentacao/publica/:token
       */

      const html = await fs.readFile(
        ARQUIVO_EXTERNO,
        'utf8'
      );

      return res
        .status(200)
        .type('html')
        .send(html);

    } catch (err) {

      console.error(
        '[Apresentacao] erro ao abrir página externa:',
        err
      );

      return res.status(500).send(
        'Não foi possível carregar a apresentação.'
      );
    }
  }
);

export default router;
