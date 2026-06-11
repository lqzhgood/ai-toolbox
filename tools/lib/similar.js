const STOPWORDS = new Set([
  'the', 'a', 'an', 'for', 'with', 'when', 'use', 'to', 'and', 'or', 'of',
  'in', 'on', 'is', 'are', 'this', 'that', 'it', 'you', 'your', 'from', 'by',
  'as', 'at', 'be', 'will', 'can', 'into', 'used', 'using',
]);

export function tokenize(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .split(/[^a-z0-9一-鿿]+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  );
}

export function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const fingerprint = (asset) =>
  tokenize(`${asset.name ?? ''} ${asset.description ?? ''} ${asset.tags ?? ''}`);

/**
 * Keyword-overlap pre-filter for duplicate detection. Scores are a cheap
 * first pass — semantic comparison of top hits is the AI/human's job.
 */
export function rankSimilar(target, candidates, limit = 5) {
  const targetSet = fingerprint(target);
  return candidates
    .map((c) => ({ name: c.name, score: jaccard(targetSet, fingerprint(c)) }))
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score || x.name.localeCompare(y.name))
    .slice(0, limit);
}
