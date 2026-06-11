import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest, CATEGORIES } from '../lib/schema.js';

function validData(overrides = {}) {
  return {
    name: 'good-skill',
    description: 'Does something useful. Use when you need it.',
    license: 'MIT',
    metadata: {
      category: 'coding',
      tags: 'alpha, beta',
      origin: 'original',
      author: 'lqzhgood',
      version: '1.0',
      added: '2026-06-12',
      ...overrides.metadata,
    },
    ...Object.fromEntries(Object.entries(overrides).filter(([k]) => k !== 'metadata')),
  };
}

function run(data, opts = {}) {
  return validateManifest({ data, dirName: data?.name ?? 'good-skill', inRepo: true, ...opts });
}

test('valid in-repo manifest has no errors', () => {
  const { errors } = run(validData());
  assert.deepEqual(errors, []);
});

test('exports a non-empty category list', () => {
  assert.ok(Array.isArray(CATEGORIES) && CATEGORIES.includes('coding'));
});

test('missing name is an error', () => {
  const data = validData();
  delete data.name;
  const { errors } = run(data, { dirName: 'good-skill' });
  assert.ok(errors.some((e) => /name/.test(e)));
});

test('rejects invalid name formats', () => {
  for (const bad of ['Upper-Case', 'has_underscore', '-leading', 'trailing-', 'a--b']) {
    const { errors } = run(validData({ name: bad }), { dirName: bad });
    assert.ok(errors.some((e) => /name/.test(e)), `expected name error for "${bad}"`);
  }
});

test('name longer than 64 chars is an error', () => {
  const long = 'a'.repeat(65);
  const { errors } = run(validData({ name: long }), { dirName: long });
  assert.ok(errors.some((e) => /name/.test(e)));
});

test('name must match directory name', () => {
  const { errors } = run(validData(), { dirName: 'other-dir' });
  assert.ok(errors.some((e) => /directory/.test(e)));
});

test('missing description is an error', () => {
  const data = validData();
  delete data.description;
  const { errors } = run(data);
  assert.ok(errors.some((e) => /description/.test(e)));
});

test('description over 1024 chars is an error', () => {
  const { errors } = run(validData({ description: 'x'.repeat(1025) }));
  assert.ok(errors.some((e) => /description/.test(e)));
});

test('in-repo: missing category is an error', () => {
  const { errors } = run(validData({ metadata: { category: undefined } }));
  assert.ok(errors.some((e) => /category/.test(e)));
});

test('in-repo: unknown category is an error', () => {
  const { errors } = run(validData({ metadata: { category: 'nonsense' } }));
  assert.ok(errors.some((e) => /category/.test(e)));
});

test('in-repo: missing origin is an error', () => {
  const { errors } = run(validData({ metadata: { origin: undefined } }));
  assert.ok(errors.some((e) => /origin/.test(e)));
});

test('in-repo: invalid origin value is an error', () => {
  const { errors } = run(validData({ metadata: { origin: 'stolen' } }));
  assert.ok(errors.some((e) => /origin/.test(e)));
});

test('third-party requires source URL and license', () => {
  const data = validData({ metadata: { origin: 'third-party' } });
  delete data.license;
  const { errors } = run(data);
  assert.ok(errors.some((e) => /source/.test(e)));
  assert.ok(errors.some((e) => /license/.test(e)));
});

test('third-party source must be an http(s) URL', () => {
  const { errors } = run(
    validData({ metadata: { origin: 'third-party', source: 'not-a-url' } })
  );
  assert.ok(errors.some((e) => /source/.test(e)));
});

test('valid third-party manifest passes', () => {
  const { errors } = run(
    validData({
      metadata: { origin: 'third-party', source: 'https://github.com/x/y', author: 'x' },
    })
  );
  assert.deepEqual(errors, []);
});

test('non-string metadata values are errors (spec: string map)', () => {
  const { errors } = run(validData({ metadata: { version: 1.0 } }));
  assert.ok(errors.some((e) => /metadata.*string|string.*metadata/i.test(e)));
});

test('out-of-repo: missing category/origin downgrade to warnings', () => {
  const data = validData({ metadata: { category: undefined, origin: undefined } });
  const { errors, warnings } = validateManifest({ data, dirName: 'good-skill', inRepo: false });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => /category/.test(w)));
  assert.ok(warnings.some((w) => /origin/.test(w)));
});
