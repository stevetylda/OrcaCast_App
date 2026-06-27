import * as duckdb from "@duckdb/duckdb-wasm";
import { getDataVersionToken } from "./meta";

const schemaCache = new Map<string, Promise<Set<string>>>();
const registeredFiles = new Set<string>();
let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

function withBase(url: string): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/";
  const basePrefix = base.endsWith("/") ? base.slice(0, -1) : base;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${window.location.origin}${url}`;
  return `${basePrefix}/${url}`;
}

function applyCacheToken(url: string, cacheToken?: string | null): string {
  const resolved = new URL(withBase(url), window.location.origin);
  if (!cacheToken) return resolved.toString();
  resolved.searchParams.set("v", cacheToken);
  return resolved.toString();
}

function resolveParquetUrl(path: string): string {
  return applyCacheToken(path, getDataVersionToken());
}

function sqlStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function toJsonRow(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && "toJSON" in value && typeof value.toJSON === "function") {
    return value.toJSON() as Record<string, unknown>;
  }
  return (value ?? {}) as Record<string, unknown>;
}

async function getDb(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
      const worker = await duckdb.createWorker(bundle.mainWorker!);
      const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      await db.open({
        path: ":memory:",
        query: { castBigIntToDouble: true },
        filesystem: {
          reliableHeadRequests: false,
          allowFullHTTPReads: true,
        },
      });
      return db;
    })();
  }
  return dbPromise;
}

async function registerParquetUrl(path: string): Promise<string> {
  const db = await getDb();
  const resolvedUrl = resolveParquetUrl(path);
  const fileName = `parquet:${resolvedUrl}`;
  if (!registeredFiles.has(fileName)) {
    await db.registerFileURL(fileName, resolvedUrl, duckdb.DuckDBDataProtocol.HTTP, false);
    registeredFiles.add(fileName);
  }
  return fileName;
}

export async function queryParquetRows(sql: string): Promise<Array<Record<string, unknown>>> {
  const db = await getDb();
  const conn = await db.connect();
  try {
    const result = await conn.query(sql);
    return result.toArray().map(toJsonRow);
  } finally {
    await conn.close();
  }
}

export async function getParquetColumns(path: string): Promise<Set<string>> {
  let cached = schemaCache.get(path);
  if (!cached) {
    cached = (async () => {
      const fileName = await registerParquetUrl(path);
      const rows = await queryParquetRows(
        `DESCRIBE SELECT * FROM read_parquet(${sqlStringLiteral(fileName)})`
      );
      return new Set(
        rows
          .map((row) => row.column_name)
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      );
    })();
    schemaCache.set(path, cached);
  }
  return cached;
}

export async function queryParquetFile(
  path: string,
  buildSql: (fileName: string, columns: Set<string>) => string
): Promise<Array<Record<string, unknown>>> {
  const [fileName, columns] = await Promise.all([registerParquetUrl(path), getParquetColumns(path)]);
  return queryParquetRows(buildSql(fileName, columns));
}

export function sqlLiteral(value: string): string {
  return sqlStringLiteral(value);
}
