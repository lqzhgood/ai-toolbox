import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectAssets, buildCatalogJson, buildCatalogJs, syncMarketplace, writeIndex, readCatalog } from '../lib/indexer.js';

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'toolbox-'));
  const put = (rel, content) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), content);
  };
  put(
    'skills/zeta-skill/SKILL.md',
    `---
name: zeta-skill
description: Z skill. Use for z things.
license: MIT
metadata:
  category: coding
  tags: "zed, last"
  origin: original
  author: lqzhgood
---
body`
  );
  put(
    'skills/alpha-skill/SKILL.md',
    `---
name: alpha-skill
description: A skill. Use for a things.
license: MIT
metadata:
  category: meta
  origin: original
---
body`
  );
  put(
    'prompts/beta-prompt/PROMPT.md',
    `---
name: beta-prompt
description: B prompt. Use for b things.
license: MIT
metadata:
  category: writing
  origin: third-party
  source: "https://github.com/x/y"
---
body`
  );
  mkdirSync(join(root, '.claude-plugin'), { recursive: true });
  writeFileSync(
    join(root, '.claude-plugin', 'marketplace.json'),
    JSON.stringify(
      {
        name: 'ai-toolbox',
        owner: { name: 'lqzhgood' },
        plugins: [
          { name: 'ai-toolbox-manager', source: './', strict: false, skills: ['./skills/alpha-skill'] },
          { name: 'ai-toolbox-skills', source: './', strict: false, skills: [] },
        ],
      },
      null,
      2
    )
  );
  return root;
}

test('collectAssets gathers manifests sorted by type then name', () => {
  const root = makeRepo();
  try {
    const { entries, problems } = collectAssets(root);
    assert.deepEqual(problems, []);
    assert.deepEqual(
      entries.map((e) => `${e.type}:${e.name}`),
      ['prompt:beta-prompt', 'skill:alpha-skill', 'skill:zeta-skill']
    );
    const zeta = entries.find((e) => e.name === 'zeta-skill');
    assert.deepEqual(zeta.tags, ['zed', 'last']);
    assert.equal(zeta.path, 'skills/zeta-skill');
    assert.equal(zeta.category, 'coding');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('collectAssets reports directories missing manifests as problems', () => {
  const root = makeRepo();
  try {
    mkdirSync(join(root, 'skills', 'broken-dir'));
    writeFileSync(join(root, 'skills', 'broken-dir', 'notes.txt'), 'no manifest');
    const { entries, problems } = collectAssets(root);
    assert.ok(problems.some((p) => p.includes('broken-dir')));
    assert.ok(!entries.some((e) => e.name === 'broken-dir'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('buildCatalogJson is deterministic and buildCatalogJs wraps it', () => {
  const entries = [{ type: 'skill', name: 'a', description: 'd', tags: [] }];
  const one = buildCatalogJson(entries, 'lqzhgood/ai-toolbox');
  const two = buildCatalogJson(entries, 'lqzhgood/ai-toolbox');
  assert.equal(one, two);
  const parsed = JSON.parse(one);
  assert.equal(parsed.repo, 'lqzhgood/ai-toolbox');
  assert.equal(parsed.count, 1);
  assert.match(buildCatalogJs(one), /^window\.CATALOG = /);
});

test('syncMarketplace fills ai-toolbox-skills with non-meta skills only', () => {
  const marketplace = {
    plugins: [
      { name: 'ai-toolbox-manager', skills: ['./skills/alpha-skill'] },
      { name: 'ai-toolbox-skills', skills: ['./skills/stale-entry'] },
    ],
  };
  const entries = [
    { type: 'skill', name: 'zeta-skill', category: 'coding' },
    { type: 'skill', name: 'alpha-skill', category: 'meta' },
    { type: 'prompt', name: 'beta-prompt', category: 'writing' },
  ];
  const synced = syncMarketplace(marketplace, entries);
  assert.deepEqual(
    synced.plugins.find((p) => p.name === 'ai-toolbox-skills').skills,
    ['./skills/zeta-skill']
  );
  assert.deepEqual(
    synced.plugins.find((p) => p.name === 'ai-toolbox-manager').skills,
    ['./skills/alpha-skill']
  );
});

test('readCatalog uses catalog.json when present and falls back to a live scan', () => {
  const root = makeRepo();
  try {
    const fallback = readCatalog(root);
    assert.equal(fallback.assets.length, 3);
    writeIndex(root, { check: false });
    const fromFile = readCatalog(root);
    assert.equal(fromFile.assets.length, 3);
    assert.ok(fromFile.assets.some((a) => a.name === 'zeta-skill'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writeIndex writes catalog files and check mode detects drift', () => {
  const root = makeRepo();
  try {
    const first = writeIndex(root, { check: false });
    assert.deepEqual(first.changed.sort(), ['catalog.js', 'catalog.json', '.claude-plugin/marketplace.json'].sort());
    const clean = writeIndex(root, { check: true });
    assert.deepEqual(clean.changed, []);
    const drifted = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
    drifted.assets.pop();
    writeFileSync(join(root, 'catalog.json'), JSON.stringify(drifted, null, 2));
    const dirty = writeIndex(root, { check: true });
    assert.ok(dirty.changed.includes('catalog.json'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
