import { existsSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { resolve, join } from 'node:path';

const distDir = resolve('dist');
const vercelOutputDir = process.env.VERCEL_OUTPUT_DIR
  ? process.env.VERCEL_OUTPUT_DIR
  : process.env.VERCEL
    ? '/vercel/output'
    : resolve('.vercel', 'output');
const vercelStaticDir = join(vercelOutputDir, 'static');

if (!existsSync(distDir)) {
  console.warn('[vercel-output] dist directory not found; skipping output staging.');
  process.exit(0);
}

// Ensure a clean static output directory for each build.
rmSync(vercelStaticDir, { recursive: true, force: true });
mkdirSync(vercelStaticDir, { recursive: true });
cpSync(distDir, vercelStaticDir, { recursive: true });

console.log(`[vercel-output] staged dist to ${vercelStaticDir}`);
