/** Resolve `@/*` and extension-less TS imports for the smoke script. */
import { register } from "node:module";
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

register(
  pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "smoke-hooks.mjs"))
    .href,
);

// Re-export hooks module path registration only; hooks live in smoke-hooks.mjs
export { resolveFile, root };
