import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TS_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];

async function fileExists(url) {
  try {
    await access(fileURLToPath(url));
    return true;
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    if (!isRelative || path.extname(specifier)) throw error;
    if (!context.parentURL?.startsWith("file:")) throw error;

    for (const extension of TS_EXTENSIONS) {
      const candidateUrl = new URL(`${specifier}${extension}`, context.parentURL);
      if (await fileExists(candidateUrl)) {
        return {
          shortCircuit: true,
          url: candidateUrl.href,
        };
      }
    }

    throw error;
  }
}
