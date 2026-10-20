import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const origin = 'https://adrxlv.github.io/COMPi/';
const index = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');

// Assert the generated artefact, not merely the Vite source configuration.
test('built JavaScript and CSS resolve inside the repository Pages path', () => {
  const script = index.match(/<script[^>]+src="([^"]+)"/)?.[1];
  const css = index.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1];
  assert.ok(script, 'missing built script');
  assert.ok(css, 'missing built stylesheet');
  for (const asset of [script, css]) {
    const url = new URL(asset, origin);
    assert.equal(url.origin, new URL(origin).origin);
    assert.match(url.pathname, /^\/COMPi\/assets\//, `wrong Pages asset path: ${url.pathname}`);
  }
});

test('the build does not reassign a removed custom domain', () => {
  assert.equal(existsSync(new URL('../dist/CNAME', import.meta.url)), false);
});
