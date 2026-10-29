import sql from "mssql";
import { logRoutine } from "./logger.js";

function buildPoolConfig() {
  return {
    server: process.env.MSSQL_SERVER,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    connectionTimeout: Number(process.env.MSSQL_CONNECTION_TIMEOUT_MS ?? 30000),
    requestTimeout: Number(process.env.MSSQL_QUERY_TIMEOUT_MS ?? 60000),
    pool: {
      max: Number(process.env.MSSQL_POOL_MAX ?? 10),
      min: Number(process.env.MSSQL_POOL_MIN ?? 0),
      idleTimeoutMillis: Number(process.env.MSSQL_POOL_IDLE_MS ?? 30000),
      acquireTimeoutMillis: Number(process.env.MSSQL_POOL_ACQUIRE_MS ?? 30000)
    },
    options: {
      encrypt: String(process.env.MSSQL_ENCRYPT ?? "true") === "true",
      trustServerCertificate: String(process.env.MSSQL_TRUST_SERVER_CERTIFICATE ?? "true") === "true"
    }
  };
}

const RETRYABLE_ERRORS = [
  "connection lost",
  "socket hang up",
  "connection is closed",
  "etimedout",
  "econnreset",
  "econnrefused",
  "connection timeout"
];

function isRetryable(err) {
  const msg = String(err?.message ?? err).toLowerCase();
  return RETRYABLE_ERRORS.some((s) => msg.includes(s));
}

let poolPromise;

function resetPool() {
  poolPromise = undefined;
}

export async function getPool() {
  const cfg = buildPoolConfig();

  if (!cfg.server || !cfg.database) {
    throw new Error("MSSQL env vars ausentes: MSSQL_SERVER e MSSQL_DATABASE sao obrigatorios");
  }

  if (!poolPromise) {
    const pool = new sql.ConnectionPool(cfg);

    // Quando o pool perde conexao ele emite 'error'.
    // Sem handler esse evento derruba o processo Node.
    // Com o handler resetamos o singleton para que a proxima
    // chamada a getPool() crie um pool novo.
    pool.on("error", (err) => {
      logRoutine("DB", "Pool error — reconectando na proxima chamada", {
        error: err?.message ?? String(err)
      });
      resetPool();
    });

    poolPromise = pool
      .connect()
      .then((p) => {
        logRoutine("DB", "Conexao MSSQL estabelecida", {
          server: cfg.server,
          database: cfg.database
        });
        return p;
      })
      .catch((err) => {
        resetPool();
        throw err;
      });
  }

  return poolPromise;
}

export async function queryRows(queryText, params = {}) {
  const maxAttempts = Number(process.env.MSSQL_RETRY_ATTEMPTS ?? 2);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const pool = await getPool();
      const request = pool.request();

      for (const [name, value] of Object.entries(params)) {
        request.input(name, value);
      }

      const result = await request.query(queryText);
      return result.recordset ?? [];
    } catch (err) {
      const willRetry = attempt < maxAttempts && isRetryable(err);

      logRoutine("DB", willRetry ? "Query falhou — retentando" : "Query falhou", {
        attempt,
        error: err?.message ?? String(err),
        retryable: isRetryable(err)
      });

      if (isRetryable(err)) {
        // Garante que o pool quebrado seja descartado antes da retentativa
        resetPool();
      }

      if (!willRetry) throw err;

      // Pequena pausa antes de retomada
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

export async function closePool() {
  if (!poolPromise) return;
  const pool = await poolPromise;
  await pool.close();
  poolPromise = undefined;
}
