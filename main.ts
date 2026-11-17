// main.ts — hands the entry in.
//
// Copies app/ and screenshots/ from this repository into the output
// directory and writes dossier.json there with the kit's buildDossier,
// byte for byte what the grader rebuilds and compares. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repo = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(out, { recursive: true });
cpSync(join(repo, 'app'), join(out, 'app'), { recursive: true });
cpSync(join(repo, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
  app_path_max_bytes: 1000,
} as const;

// The grader runs this program twice and requires the same bytes both
// times, so build twice here and refuse to hand in a dossier that moves.
const dossier = buildDossier(out, CAPS);
const again = buildDossier(out, CAPS);
if (!Buffer.from(dossier).equals(Buffer.from(again))) {
  throw new Error('main.ts: two dossier builds from the same files differ');
}
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`main.ts: wrote ${dossier.length} bytes of dossier.json to ${out} (two builds, identical)`);
