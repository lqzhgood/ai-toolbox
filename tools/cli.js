#!/usr/bin/env node
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseFrontmatter } from './lib/frontmatter.js';
import { ASSET_TYPES, collectAssets, readCatalog, writeIndex } from './lib/indexer.js';
import { scanAsset } from './lib/scan.js';
import { NAME_RE, validateManifest } from './lib/schema.js';
import { rankSimilar } from './lib/similar.js';

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const MAX_MANIFEST_LINES = 500;

const USAGE = `ai-toolbox curation CLI

Usage: node tools/cli.js <command> [args]

Commands:
  validate [path...]        Validate assets (default: every asset in the repo).
                            Paths outside the repo are treated as import candidates:
                            spec violations are errors, repo conventions are warnings.
  index [--check]           Regenerate catalog.json, catalog.js and sync the
                            marketplace skill list. --check reports drift, writes nothing.
  list [--type t] [--category c]
                            List assets, optionally filtered.
  search <keyword>          Keyword match across name, description and tags.
  similar <path|name>       Keyword-overlap pre-filter for similar assets of the same type.
  new <type> <name>         Scaffold a new asset from templates/ (type: skill|prompt|mcp).
  help                      Show this message.
`;

function findManifest(dir) {
  for (const t of ASSET_TYPES) {
    const manifestPath = join(dir, t.manifest);
    if (existsSync(manifestPath)) return { ...t, manifestPath };
  }
  return null;
}

function isInRepo(dir) {
  const rel = relative(REPO_ROOT, dir).replaceAll('\\', '/');
  if (rel.startsWith('..') || rel === '') return false;
  return ASSET_TYPES.some((t) => rel.startsWith(`${t.dir}/`));
}

function repoAssetDirs() {
  const dirs = [];
  for (const { dir } of ASSET_TYPES) {
    const base = join(REPO_ROOT, dir);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(join(base, entry.name));
    }
  }
  return dirs;
}

function validateDir(dir) {
  const label = isInRepo(dir) ? relative(REPO_ROOT, dir).replaceAll('\\', '/') : dir;
  const errors = [];
  const warnings = [];

  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return { label, errors: ['not a directory'], warnings };
  }
  const manifest = findManifest(dir);
  if (!manifest) {
    return {
      label,
      errors: [`no manifest found (expected one of: ${ASSET_TYPES.map((t) => t.manifest).join(', ')})`],
      warnings,
    };
  }

  const raw = readFileSync(manifest.manifestPath, 'utf8');
  const { data, error } = parseFrontmatter(raw);
  if (error) errors.push(`${manifest.manifest}: ${error}`);

  const result = validateManifest({ data, dirName: basename(dir), inRepo: isInRepo(dir) });
  errors.push(...result.errors);
  warnings.push(...result.warnings);

  const lineCount = raw.split('\n').length;
  if (lineCount > MAX_MANIFEST_LINES) {
    warnings.push(
      `${manifest.manifest}: ${lineCount} lines (spec recommends < ${MAX_MANIFEST_LINES}; move detail into references/)`
    );
  }

  for (const f of scanAsset(dir)) {
    const file = relative(dir, f.file).replaceAll('\\', '/');
    warnings.push(`${file}:${f.line}: ${f.kind} "${f.match}" - review for portability/privacy`);
  }

  return { label, errors, warnings };
}

function cmdValidate(paths) {
  const targets = paths.length ? paths.map((p) => resolve(p)) : repoAssetDirs();
  if (targets.length === 0) {
    console.log('No assets found.');
    return 0;
  }
  let errorCount = 0;
  let warningCount = 0;
  for (const dir of targets) {
    const { label, errors, warnings } = validateDir(dir);
    for (const e of errors) console.log(`[ERROR] ${label}: ${e}`);
    for (const w of warnings) console.log(`[WARN]  ${label}: ${w}`);
    errorCount += errors.length;
    warningCount += warnings.length;
  }
  console.log(
    `\nChecked ${targets.length} asset(s): ${errorCount} error(s), ${warningCount} warning(s).`
  );
  return errorCount > 0 ? 1 : 0;
}

function cmdIndex(check) {
  const { changed, problems, count } = writeIndex(REPO_ROOT, { check });
  for (const p of problems) console.log(`[WARN]  ${p}`);
  if (check) {
    if (changed.length) {
      console.log(`Index drift detected in: ${changed.join(', ')}`);
      console.log('Run "npm run index" and commit the result.');
      return 1;
    }
    console.log(`Index up to date (${count} assets).`);
    return 0;
  }
  console.log(
    changed.length
      ? `Indexed ${count} assets; updated: ${changed.join(', ')}`
      : `Indexed ${count} assets; everything already up to date.`
  );
  return 0;
}

function printTable(entries) {
  if (entries.length === 0) {
    console.log('No matching assets.');
    return;
  }
  for (const e of entries) {
    const desc = e.description.length > 72 ? `${e.description.slice(0, 69)}...` : e.description;
    console.log(
      `${e.type.padEnd(7)} ${e.name.padEnd(24)} ${(e.category ?? '-').padEnd(13)} ${(e.origin ?? '-').padEnd(12)} ${desc}`
    );
  }
  console.log(`\n${entries.length} asset(s).`);
}

function cmdList({ type, category }) {
  const { assets } = readCatalog(REPO_ROOT);
  printTable(
    assets.filter((e) => (!type || e.type === type) && (!category || e.category === category))
  );
  return 0;
}

function cmdSearch(keyword) {
  const kw = keyword.toLowerCase();
  const { assets } = readCatalog(REPO_ROOT);
  printTable(
    assets.filter((e) =>
      [e.name, e.description, ...(e.tags ?? [])].join(' ').toLowerCase().includes(kw)
    )
  );
  return 0;
}

function cmdSimilar(target) {
  const { entries } = collectAssets(REPO_ROOT);
  let subject;
  const asPath = resolve(target);
  if (existsSync(asPath) && statSync(asPath).isDirectory()) {
    const manifest = findManifest(asPath);
    if (!manifest) {
      console.log(`[ERROR] ${target}: no manifest found`);
      return 1;
    }
    const { data } = parseFrontmatter(readFileSync(manifest.manifestPath, 'utf8'));
    subject = {
      type: manifest.type,
      name: data?.name ?? basename(asPath),
      description: data?.description ?? '',
      tags: data?.metadata?.tags ?? '',
    };
  } else {
    const found = entries.find((e) => e.name === target);
    if (!found) {
      console.log(`[ERROR] "${target}" is neither a directory nor a known asset name`);
      return 1;
    }
    subject = { ...found, tags: (found.tags ?? []).join(', ') };
  }

  const candidates = entries
    .filter((e) => e.type === subject.type && e.name !== subject.name)
    .map((e) => ({ name: e.name, description: e.description, tags: (e.tags ?? []).join(', ') }));
  const ranked = rankSimilar(subject, candidates);
  if (ranked.length === 0) {
    console.log(`No keyword overlap with existing ${subject.type} assets.`);
  } else {
    console.log(`Keyword-overlap candidates for "${subject.name}" (semantic review still required):`);
    for (const r of ranked) console.log(`  ${(r.score * 100).toFixed(0).padStart(3)}%  ${r.name}`);
  }
  return 0;
}

function cmdNew(type, name) {
  const assetType = ASSET_TYPES.find((t) => t.type === type);
  if (!assetType) {
    console.log(`[ERROR] unknown type "${type}" (expected: ${ASSET_TYPES.map((t) => t.type).join(' | ')})`);
    return 1;
  }
  if (!name || !NAME_RE.test(name) || name.length > 64) {
    console.log('[ERROR] name must be kebab-case (lowercase a-z, 0-9, single hyphens), max 64 chars');
    return 1;
  }
  const templateDir = join(REPO_ROOT, 'templates', type);
  if (!existsSync(templateDir)) {
    console.log(`[ERROR] missing template directory: templates/${type}`);
    return 1;
  }
  const dest = join(REPO_ROOT, assetType.dir, name);
  if (existsSync(dest)) {
    console.log(`[ERROR] ${assetType.dir}/${name} already exists`);
    return 1;
  }
  cpSync(templateDir, dest, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  fillPlaceholders(dest, { '{{name}}': name, '{{date}}': today });
  console.log(`Created ${assetType.dir}/${name}/ from templates/${type}/`);
  console.log('Next: edit the manifest, then run "npm run validate" and "npm run index".');
  return 0;
}

function fillPlaceholders(dir, replacements) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      fillPlaceholders(full, replacements);
    } else if (['.md', '.json', '.txt', '.yaml', '.yml'].includes(extname(entry.name))) {
      let text = readFileSync(full, 'utf8');
      for (const [from, to] of Object.entries(replacements)) text = text.replaceAll(from, to);
      writeFileSync(full, text);
    }
  }
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case 'validate':
      return cmdValidate(rest);
    case 'index': {
      const { values } = parseArgs({ args: rest, options: { check: { type: 'boolean' } } });
      return cmdIndex(Boolean(values.check));
    }
    case 'list': {
      const { values } = parseArgs({
        args: rest,
        options: { type: { type: 'string' }, category: { type: 'string' } },
      });
      return cmdList(values);
    }
    case 'search':
      if (!rest[0]) {
        console.log('[ERROR] search requires a keyword');
        return 1;
      }
      return cmdSearch(rest.join(' '));
    case 'similar':
      if (!rest[0]) {
        console.log('[ERROR] similar requires a path or asset name');
        return 1;
      }
      return cmdSimilar(rest[0]);
    case 'new':
      return cmdNew(rest[0], rest[1]);
    case 'help':
    case '--help':
    case undefined:
      console.log(USAGE);
      return 0;
    default:
      console.log(`Unknown command "${command}"\n`);
      console.log(USAGE);
      return 1;
  }
}

process.exitCode = main();
