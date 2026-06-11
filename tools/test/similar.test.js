import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, jaccard, rankSimilar } from '../lib/similar.js';

test('tokenize lowercases, splits and drops stopwords', () => {
  const tokens = tokenize('Create Excalidraw Diagrams for the user');
  assert.ok(tokens.has('excalidraw'));
  assert.ok(tokens.has('diagrams'));
  assert.ok(!tokens.has('the'));
  assert.ok(!tokens.has('for'));
});

test('jaccard is 1 for identical sets and 0 for disjoint sets', () => {
  const a = new Set(['x', 'y']);
  assert.equal(jaccard(a, new Set(['x', 'y'])), 1);
  assert.equal(jaccard(a, new Set(['z'])), 0);
});

test('rankSimilar returns sorted top matches above zero', () => {
  const target = { name: 'session-handoff', description: 'Save session summary and resume context', tags: '' };
  const candidates = [
    { name: 'handoff', description: 'Save a session summary to resume work later', tags: 'session' },
    { name: 'pdf-tools', description: 'Extract text from PDF files', tags: 'pdf' },
    { name: 'context-saver', description: 'Persist conversation context summaries', tags: 'session, resume' },
  ];
  const ranked = rankSimilar(target, candidates);
  assert.equal(ranked[0].name, 'handoff');
  assert.ok(ranked.every((r) => r.score > 0));
  assert.ok(!ranked.some((r) => r.name === 'pdf-tools'));
});

test('rankSimilar caps results at 5', () => {
  const target = { name: 'a', description: 'shared token here', tags: '' };
  const candidates = Array.from({ length: 8 }, (_, i) => ({
    name: `c${i}`,
    description: 'shared token here',
    tags: '',
  }));
  assert.equal(rankSimilar(target, candidates).length, 5);
});
