import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

// Heuristic patterns for portability/privacy problems. Findings are warnings
// for a human or AI to review, not hard failures — false positives are expected.
const PATTERNS = [
  { kind: 'unix-home-path', re: /(?:\/Users|\/home)\/[A-Za-z0-9._-]+/g },
  { kind: 'windows-home-path', re: /[A-Za-z]:\\+Users\\+[A-Za-z0-9._-]+/g },
  { kind: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
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
    for (const { kind, re } of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
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
