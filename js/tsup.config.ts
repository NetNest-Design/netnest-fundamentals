import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

// The User-Agent names the published version: read from package.json at build time, never typed by hand.
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

export default defineConfig({
  entry: { index: 'src/index.ts', 'ai-sdk': 'src/ai-sdk.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: false,
  target: 'node20',
  external: ['ai', 'zod'],
  define: { __NETNEST_VERSION__: JSON.stringify(version) },
});
