import { rm } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("_site");

if (path.basename(outputDirectory) !== "_site" || path.dirname(outputDirectory) !== process.cwd()) {
  throw new Error(`Refusing to clean unexpected output path: ${outputDirectory}`);
}

await rm(outputDirectory, { recursive: true, force: true });
