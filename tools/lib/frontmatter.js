import yaml from 'js-yaml';

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse YAML frontmatter from a markdown string.
 * Never throws: malformed YAML is reported via `error`.
 */
export function parseFrontmatter(content) {
  const m = FM_RE.exec(content);
  if (!m) return { data: null, body: content };
  try {
    const data = yaml.load(m[1]);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { data: null, body: m[2], error: 'frontmatter is not a YAML map' };
    }
    return { data, body: m[2] };
  } catch (e) {
    return { data: null, body: m[2], error: e.message };
  }
}
