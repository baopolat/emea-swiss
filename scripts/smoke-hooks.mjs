import { existsSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function resolveFile(base) {
  if (existsSync(base) && extname(base)) return base;
  for (const ext of [".ts", ".tsx", ".json", ".js", ".mjs"]) {
    const candidate = base + ext;
    if (existsSync(candidate)) return candidate;
  }
  const asIndex = join(base, "index.ts");
  if (existsSync(asIndex)) return asIndex;
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = resolveFile(join(root, "src", specifier.slice(2)));
    if (resolved) {
      return { shortCircuit: true, url: pathToFileURL(resolved).href };
    }
  }

  if (
    (specifier.startsWith(".") || specifier.startsWith("/")) &&
    context.parentURL?.startsWith("file:") &&
    !extname(specifier.split("?")[0])
  ) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const resolved = resolveFile(join(parentDir, specifier));
    if (resolved) {
      return { shortCircuit: true, url: pathToFileURL(resolved).href };
    }
  }

  return nextResolve(specifier, context);
}
