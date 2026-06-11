import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

// Well-known placeholder identities used in documentation examples
// (docs/conventions.md asks for these instead of real data, so examples can
// stay concrete - concrete examples beat abstract placeholders for LLMs).
const MOCK_USERS = new Set([
  'alice', 'bob', 'carol', 'dave', 'eve', 'mallory', 'trent',
  'example', 'user', 'username', 'yourname', 'you',
  'jdoe', 'johndoe', 'janedoe', 'demo', 'foo', 'test',
]);
// RFC 2606 / RFC 6761 reserved names - safe by definition.
const MOCK_EMAIL_DOMAIN_RE = /(?:^|\.)(?:example\.(?:com|org|net)|example|test|invalid|localhost)$/i;

const allowHomePath = (m) => MOCK_USERS.has(m.split(/[\\/]+/).pop().toLowerCase());
const allowEmail = (m) => MOCK_EMAIL_DOMAIN_RE.test(m.split('@').pop());

// Heuristic patterns for portability/privacy problems. Findings are warnings
// for a human or AI to review, not hard failures - false positives are expected.
// An `allow` predicate suppresses matches that follow the mock conventions above.
const PATTERNS = [
  { kind: 'unix-home-path', re: /(?:\/Users|\/home)\/[A-Za-z0-9._-]+/g, allow: allowHomePath },
  { kind: 'windows-home-path', re: /[A-Za-z]:\\+Users\\+[A-Za-z0-9._-]+/g, allow: allowHomePath },
  { kind: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, allow: allowEmail },
  { kind: 'ip-address', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  {
    kind: 'api-key',
    re: /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[bap]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35})\b/g,
  },
];

const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.js', '.mjs', '.cjs', '.ts', '.py', '.sh', '.ps1',
  '.yaml', '.yml', '.toml', '.html', '.css', '.csv', '.xml', '.svg', '.env',
]);

export function scanText(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { kind, re, allow } of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        if (allow && allow(m[0])) continue;
        findings.push({ kind, match: m[0], line: i + 1 });
      }
    }
  });
  return findings;
}

export function scanAsset(dirPath) {
  const findings = [];
  walk(dirPath, (file) => {
    if (!TEXT_EXTENSIONS.has(extname(file).toLowerCase())) return;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      return;
    }
    for (const f of scanText(text)) findings.push({ file, ...f });
  });
  return findings;
}

function walk(dir, onFile) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full, onFile);
    } else if (entry.isFile()) {
      onFile(full);
    }
  }
}
