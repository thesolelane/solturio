import fs from "fs";
import path from "path";

declare global {
  var __solturioEnvLoaded: boolean | undefined;
}

type EnvRecord = Record<string, string>;

const ENV_TARGET_KEY = "SOLTURIO_ENV_TARGET";
const PRODUCTION_UNLOCK_KEY = "SOLTURIO_PRODUCTION_UNLOCK";
const PRODUCTION_UNLOCK_VALUE = "ACTIVATE_PRODUCTION";

function parseEnvValue(rawValue: string): string {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readEnvFile(filePath: string): EnvRecord {
  const values: EnvRecord = {};

  if (!fs.existsSync(filePath)) {
    return values;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");

  for (const line of fileContents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const exportPrefix = trimmed.startsWith("export ") ? 7 : 0;
    const equalsIndex = trimmed.indexOf("=", exportPrefix);
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(exportPrefix, equalsIndex).trim();
    if (!key) {
      continue;
    }

    const rawValue = trimmed.slice(equalsIndex + 1);
    values[key] = parseEnvValue(rawValue);
  }

  return values;
}

function applyEnvValues(values: EnvRecord) {
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }
}

function readControlValue(
  name: string,
  envLocalValues: EnvRecord,
  envValues: EnvRecord
): string | undefined {
  return process.env[name] ?? envLocalValues[name] ?? envValues[name];
}

function normalizeEnvironmentTarget(rawValue?: string): "beta" | "production" {
  const normalized = rawValue?.trim().toLowerCase() ?? "beta";

  if (normalized === "beta" || normalized === "production") {
    return normalized;
  }

  throw new Error(
    `${ENV_TARGET_KEY} must be either "beta" or "production". Received "${rawValue ?? ""}".`
  );
}

function getEnvLoadOrder(rootDir: string, target: "beta" | "production"): string[] {
  return [
    path.join(rootDir, ".env"),
    path.join(rootDir, ".env.local"),
    path.join(rootDir, `.env.${target}`),
    path.join(rootDir, `.env.${target}.local`),
  ];
}

function mergeEnvFiles(filePaths: string[]): EnvRecord {
  const mergedValues: EnvRecord = {};

  for (const filePath of filePaths) {
    Object.assign(mergedValues, readEnvFile(filePath));
  }

  return mergedValues;
}

if (!globalThis.__solturioEnvLoaded) {
  const rootDir = process.cwd();
  const envFilePath = path.join(rootDir, ".env");
  const envLocalFilePath = path.join(rootDir, ".env.local");
  const envValues = readEnvFile(envFilePath);
  const envLocalValues = readEnvFile(envLocalFilePath);
  const target = normalizeEnvironmentTarget(
    readControlValue(ENV_TARGET_KEY, envLocalValues, envValues)
  );
  const productionUnlock = readControlValue(PRODUCTION_UNLOCK_KEY, envLocalValues, envValues);

  if (target === "production" && productionUnlock !== PRODUCTION_UNLOCK_VALUE) {
    throw new Error(
      [
        "Production environment activation is locked.",
        `Set ${ENV_TARGET_KEY}=production and ${PRODUCTION_UNLOCK_KEY}=${PRODUCTION_UNLOCK_VALUE}`,
        "in your shell or local env file when you intentionally want to load production secrets.",
      ].join(" ")
    );
  }

  applyEnvValues(mergeEnvFiles(getEnvLoadOrder(rootDir, target)));

  if (process.env[ENV_TARGET_KEY] === undefined) {
    process.env[ENV_TARGET_KEY] = target;
  }

  globalThis.__solturioEnvLoaded = true;
}

export {};
