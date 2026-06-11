import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from './frontmatter.js';

export const ASSET_TYPES = [
  { type: 'skill', dir: 'skills', manifest: 'SKILL.md' },
  { type: 'prompt', dir: 'prompts', manifest: 'PROMPT.md' },
  { type: 'mcp', dir: 'mcp', manifest: 'MCP.md' },
];

const DEFAULT_REPO = 'lqzhgood/ai-toolbox';

export function parseTags(tags) {
  if (typeof tags !== 'string') return [];
  return tags.split(',').map((t) => t.trim()).filter(Boolean);
}

/** Scan all asset directories and build catalog entries (sorted, stable). */
export function collectAssets(repoRoot) {
  const entries = [];
  const problems = [];
  for (const { type, dir, manifest } of ASSET_TYPES) {
    const base = join(repoRoot, dir);
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const manifestPath = join(base, d.name, manifest);
      if (!existsSync(manifestPath)) {
        problems.push(`${dir}/${d.name}: missing ${manifest}`);
        continue;
      }
      const { data, error } = parseFrontmatter(readFileSync(manifestPath, 'utf8'));
      if (!data) {
        problems.push(`${dir}/${d.name}: ${error ?? 'missing frontmatter'}`);
        continue;
      }
      const md = data.metadata ?? {};
      entries.push(
        prune({
          type,
          name: typeof data.name === 'string' ? data.name : d.name,
          description: typeof data.description === 'string' ? data.description : '',
          category: md.category,
          tags: parseTags(md.tags),
          origin: md.origin,
          source: md.source,
          author: md.author,
          version: md.version,
          added: md.added,
          updated: md.updated,
          license: data.license,
          path: `${dir}/${d.name}`,
        })
      );
    }
  }
  entries.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  return { entries, problems };
}

function prune(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export function buildCatalogJson(entries, repo) {
  return `${JSON.stringify({ schemaVersion: 1, repo, count: entries.length, assets: entries }, null, 2)}\n`;
}

export function buildCatalogJs(catalogJson) {
  return `window.CATALOG = ${catalogJson.trimEnd()};\n`;
}

/** Rewrite the ai-toolbox-skills plugin to list every non-meta skill. */
export function syncMarketplace(marketplace, entries) {
  const clone = structuredClone(marketplace);
  const target = clone.plugins?.find((p) => p.name === 'ai-toolbox-skills');
  if (target) {
    target.skills = entries
      .filter((e) => e.type === 'skill' && e.category !== 'meta')
      .map((e) => `./skills/${e.name}`)
      .sort();
  }
  return clone;
}

/**
 * Read the committed catalog.json (zero-dependency path for installed copies);
 * fall back to a live scan when it does not exist yet.
 */
export function readCatalog(repoRoot) {
  const catalogPath = join(repoRoot, 'catalog.json');
  if (existsSync(catalogPath)) {
    try {
      return JSON.parse(readFileSync(catalogPath, 'utf8'));
    } catch {
      // fall through to live scan
    }
  }
  const { entries } = collectAssets(repoRoot);
  return { schemaVersion: 1, repo: repoSlug(repoRoot), count: entries.length, assets: entries };
}

function repoSlug(repoRoot) {
  try {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
    const url = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? '';
    const m = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url);
    if (m) return m[1];
  } catch {
    // fall through to default
  }
  return DEFAULT_REPO;
}

/**
 * Generate catalog.json, catalog.js and the synced marketplace manifest.
 * In check mode nothing is written; `changed` lists files that would differ.
 */
export function writeIndex(repoRoot, { check = false } = {}) {
  const { entries, problems } = collectAssets(repoRoot);
  const catalogJson = buildCatalogJson(entries, repoSlug(repoRoot));
  const outputs = [
    ['catalog.json', catalogJson],
    ['catalog.js', buildCatalogJs(catalogJson)],
  ];

  const marketplacePath = join(repoRoot, '.claude-plugin', 'marketplace.json');
  if (existsSync(marketplacePath)) {
    const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));
    const synced = syncMarketplace(marketplace, entries);
    outputs.push(['.claude-plugin/marketplace.json', `${JSON.stringify(synced, null, 2)}\n`]);
  }

  const changed = [];
  for (const [rel, content] of outputs) {
    const filePath = join(repoRoot, rel);
    const current = existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
    if (current !== content) {
      changed.push(rel);
      if (!check) writeFileSync(filePath, content);
    }
  }
  return { changed, problems, count: entries.length };
}
