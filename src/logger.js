// src/logger.js
import fs from "node:fs";
import path from "node:path";
import winston from "winston";

const logDir = path.resolve("logs");
const keepDays = Number(process.env.LOG_KEEP_DAYS ?? 5);

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function nowParts(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return {
    yyyy: date.getFullYear(),
    mm: pad(date.getMonth() + 1),
    dd: pad(date.getDate()),
    hh: pad(date.getHours()),
    mi: pad(date.getMinutes()),
    ss: pad(date.getSeconds())
  };
}

function dayStamp(date = new Date()) {
  const p = nowParts(date);
  return `${p.yyyy}-${p.mm}-${p.dd}`;
}

function timeStamp(date = new Date()) {
  const p = nowParts(date);
  return `${p.yyyy}-${p.mm}-${p.dd} ${p.hh}:${p.mi}:${p.ss}`;
}

function dailyLogFile(date = new Date()) {
  return path.join(logDir, `${dayStamp(date)}.log`);
}

function trimPreview(raw) {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  if (!text) return "";
  return text.length <= 40 ? text : `${text.slice(0, 40)}...`;
}

function sanitizeSensitive(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeSensitive);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const key = String(k).toLowerCase();
      if (["cpf", "cnpj", "documento", "password", "token", "authorization", "api_key", "api-key"].includes(key)) {
        out[k] = "***";
      } else {
        out[k] = sanitizeSensitive(v);
      }
    }
    return out;
  }
  return value;
}

function retentionSweep() {
  ensureLogDir();
  const files = fs.readdirSync(logDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.log$/.test(f));
  const now = Date.now();
  const maxAgeMs = keepDays * 24 * 60 * 60 * 1000;

  for (const file of files) {
    const full = path.join(logDir, file);
    const stat = fs.statSync(full);
    if (now - stat.mtimeMs > maxAgeMs) {
      fs.rmSync(full, { force: true });
    }
  }
}

ensureLogDir();
retentionSweep();

const level = process.env.LOG_LEVEL || "info";

const lineFormatter = winston.format.printf(({ level: lvl, message, routine, detail, important }) => {
  const upper = String(lvl || "info").toUpperCase();
  const rt = routine || upper;
  const dt = detail || message || "sem detalhe";
  const imp = important === undefined || important === null
    ? ""
    : typeof important === "string"
      ? important
      : JSON.stringify(important);
  return `${timeStamp()} [${rt}] [${dt}] [${imp}]`;
});

export const logger = winston.createLogger({
  level,
  transports: [
    new winston.transports.Console({ format: lineFormatter }),
    new winston.transports.File({ filename: dailyLogFile(), format: lineFormatter })
  ]
});

export function logRoutine(routine, detail, important) {
  logger.info("log", {
    routine,
    detail,
    important: sanitizeSensitive(important)
  });
}

export function listLogFiles() {
  ensureLogDir();
  retentionSweep();
  return fs
    .readdirSync(logDir)
    .filter((f) => f.endsWith(".log"))
    .sort()
    .reverse();
}

export function readLogFile(fileName) {
  const safe = String(fileName || "");
  if (!/^\d{4}-\d{2}-\d{2}\.log$/.test(safe)) {
    throw new Error("arquivo de log invalido");
  }
  const full = path.join(logDir, safe);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}