import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = fileURLToPath(new URL('../cli.js', import.meta.url));

const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

test('help exits 0 and prints usage', () => {
  const { status, stdout } = run('help');
  assert.equal(status, 0);
  assert.match(stdout, /Usage/);
});

test('validate passes a clean external asset (conventions are warnings only)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-'));
  try {
    const asset = join(dir, 'tidy-skill');
    mkdirSync(asset);
    writeFileSync(
      join(asset, 'SKILL.md'),
      '---\nname: tidy-skill\ndescription: A tidy external skill. Use for testing.\n---\nbody\n'
    );
    const { status, stdout } = run('validate', asset);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /WARN/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate exits 1 on spec violations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-'));
  try {
    const asset = join(dir, 'Bad-Name');
    mkdirSync(asset);
    writeFileSync(join(asset, 'SKILL.md'), '---\nname: Bad-Name\ndescription: x\n---\nbody\n');
    const { status, stdout } = run('validate', asset);
    assert.equal(status, 1);
    assert.match(stdout, /ERROR/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
