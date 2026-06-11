// Controlled vocabulary - keep in sync with docs/conventions.md
export const CATEGORIES = [
  'coding',
  'document',
  'writing',
  'devops',
  'data',
  'research',
  'productivity',
  'meta',
];

export const ORIGINS = ['original', 'third-party'];

export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validate an asset manifest against the Agent Skills spec plus repo conventions.
 * Spec violations are always errors; repo-convention gaps (category/origin/source)
 * are errors for in-repo assets but warnings for external ones being evaluated
 * before import.
 */
export function validateManifest({ data, dirName, inRepo = true }) {
  const errors = [];
  const warnings = [];
  const convention = (msg) => (inRepo ? errors : warnings).push(msg);

  if (!data || typeof data !== 'object') {
    errors.push('frontmatter: missing or unparsable');
    return { errors, warnings };
  }

  const { name, description } = data;
  if (typeof name !== 'string' || name.length === 0) {
    errors.push('name: required');
  } else {
    if (name.length > 64) errors.push('name: must be at most 64 characters');
    if (!NAME_RE.test(name)) {
      errors.push('name: must be kebab-case (lowercase a-z, 0-9, single hyphens, no leading/trailing hyphen)');
    }
    if (dirName && name !== dirName) {
      errors.push(`name: must match directory name ("${name}" vs directory "${dirName}")`);
    }
  }

  if (typeof description !== 'string' || description.trim().length === 0) {
    errors.push('description: required (what it does + when to use it)');
  } else if (description.length > 1024) {
    errors.push('description: must be at most 1024 characters');
  }

  const md = data.metadata ?? {};
  if (typeof md !== 'object' || Array.isArray(md)) {
    errors.push('metadata: must be a YAML map');
    return { errors, warnings };
  }

  for (const [key, value] of Object.entries(md)) {
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') {
      errors.push(`metadata.${key}: metadata values must be strings - quote the value in YAML`);
    }
  }

  const category = typeof md.category === 'string' ? md.category : undefined;
  if (!category) {
    convention('metadata.category: required');
  } else if (!CATEGORIES.includes(category)) {
    convention(`metadata.category: "${category}" is not in the allowed list (${CATEGORIES.join(', ')})`);
  }

  const origin = typeof md.origin === 'string' ? md.origin : undefined;
  if (!origin) {
    convention('metadata.origin: required ("original" or "third-party")');
  } else if (!ORIGINS.includes(origin)) {
    errors.push('metadata.origin: must be "original" or "third-party"');
  }

  if (origin === 'third-party') {
    if (typeof md.source !== 'string' || !/^https?:\/\//.test(md.source)) {
      convention('metadata.source: required http(s) upstream URL for third-party assets');
    }
    if (typeof data.license !== 'string' || data.license.length === 0) {
      convention('license: required for third-party assets (upstream license)');
    }
  }

  return { errors, warnings };
}
