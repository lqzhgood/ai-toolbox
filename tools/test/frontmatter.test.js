import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../lib/frontmatter.js';

test('parses valid frontmatter and keeps body', () => {
  const md = `---
name: my-skill
description: Does a thing. Use when testing.
metadata:
  category: coding
---

# Body title

content here`;
  const { data, body, error } = parseFrontmatter(md);
  assert.equal(error, undefined);
  assert.equal(data.name, 'my-skill');
  assert.equal(data.description, 'Does a thing. Use when testing.');
  assert.equal(data.metadata.category, 'coding');
  assert.match(body, /# Body title/);
});

test('returns null data when no frontmatter present', () => {
  const { data, body } = parseFrontmatter('# Just markdown\n\ntext');
  assert.equal(data, null);
  assert.match(body, /Just markdown/);
});

test('reports error on malformed YAML instead of throwing', () => {
  const md = `---
name: [unclosed
---
body`;
  const { data, error } = parseFrontmatter(md);
  assert.equal(data, null);
  assert.ok(error && error.length > 0);
});

test('handles CRLF line endings', () => {
  const md = '---\r\nname: crlf-skill\r\ndescription: CRLF test.\r\n---\r\nbody';
  const { data } = parseFrontmatter(md);
  assert.equal(data.name, 'crlf-skill');
});
