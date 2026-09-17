type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel = (process.env.LOG_LEVEL ?? "info") as LogLevel;

function ts() {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel) {
  return (LEVELS[level] ?? 0) >= (LEVELS[minLevel] ?? 1);
}

export const log = {
  debug(msg: string, data?: Record<string, unknown>) {
    if (!shouldLog("debug")) return;
    console.log(JSON.stringify({ level: "debug", ts: ts(), msg, ...data }));
  },
  info(msg: string, data?: Record<string, unknown>) {
    if (!shouldLog("info")) return;
    console.log(JSON.stringify({ level: "info", ts: ts(), msg, ...data }));
  },
  warn(msg: string, data?: Record<string, unknown>) {
    if (!shouldLog("warn")) return;
    console.warn(JSON.stringify({ level: "warn", ts: ts(), msg, ...data }));
  },
  error(msg: string, data?: Record<string, unknown>) {
    if (!shouldLog("error")) return;
    console.error(JSON.stringify({ level: "error", ts: ts(), msg, ...data }));
  },
};
