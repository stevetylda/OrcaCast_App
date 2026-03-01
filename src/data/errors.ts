export class DataLoadError extends Error {
  path: string;
  details?: string;

  constructor(path: string, message: string, details?: string) {
    super(message);
    this.name = "DataLoadError";
    this.path = path;
    this.details = details;
  }
}

export function formatDataPath(path: string): string {
  try {
    const url = new URL(path, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return path;
  }
}

export function normalizeDataLoadError(error: unknown, fallbackPath: string): DataLoadError {
  if (error instanceof DataLoadError) return error;
  if (error instanceof Error) {
    return new DataLoadError(fallbackPath, error.message, error.stack);
  }
  return new DataLoadError(fallbackPath, "Unknown data loading error");
}
