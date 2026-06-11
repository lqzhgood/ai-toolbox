import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanText, scanAsset } from '../lib/scan.js';

const kinds = (findings) => findings.map((f) => f.kind);

test('detects unix home paths', () => {
  assert.ok(kinds(scanText('save to /Users/daiyayuan/notes.md')).includes('unix-home-path'));
  assert.ok(kinds(scanText('cd /home/zhangwei/project')).includes('unix-home-path'));
});

test('detects windows user paths', () => {
  assert.ok(kinds(scanText('C:\\Users\\daiyayuan\\Desktop')).includes('windows-home-path'));
});

test('detects email addresses', () => {
  assert.ok(kinds(scanText('contact me at someone@gmail.com')).includes('email'));
});

test('does not flag well-known mock identities (docs convention)', () => {
  assert.deepEqual(scanText('e.g. /Users/alice/.handoff/2026-01-01_note.md'), []);
  assert.deepEqual(scanText('cd /home/bob/project'), []);
  assert.deepEqual(scanText('C:\\Users\\example\\Desktop'), []);
  assert.deepEqual(scanText('mail someone@example.com or admin@demo.test'), []);
});

test('detects IPv4 addresses', () => {
  assert.ok(kinds(scanText('server at 192.168.1.10:8080')).includes('ip-address'));
});

test('does not flag three-part version numbers as IPs', () => {
  assert.deepEqual(scanText('version 0.1.0 released'), []);
});

test('detects common API key shapes', () => {
  assert.ok(kinds(scanText('key=sk-abcdefghijklmnopqrstuvwxyz123456')).includes('api-key'));
  assert.ok(kinds(scanText('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcd1234')).includes('api-key'));
});

test('clean text yields no findings', () => {
  assert.deepEqual(scanText('A generic skill that formats markdown tables.'), []);
});

test('findings carry line numbers', () => {
  const findings = scanText('line one\nemail: x@y.dev\n');
  assert.equal(findings[0].line, 2);
});

test('scanAsset walks text files and skips binaries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scan-'));
  try {
    writeFileSync(join(dir, 'SKILL.md'), 'see /Users/daiyayuan/tmp');
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'assets', 'pic.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(dir, 'assets', 'note.txt'), 'ping 10.0.0.5 now');
    const findings = scanAsset(dir);
    const files = findings.map((f) => f.file);
    assert.ok(files.some((f) => f.endsWith('SKILL.md')));
    assert.ok(files.some((f) => f.endsWith('note.txt')));
    assert.ok(!files.some((f) => f.endsWith('pic.png')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
