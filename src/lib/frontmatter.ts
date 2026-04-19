/**
 * Parse a research-area markdown file into { frontmatter, body }.
 *
 * Frontmatter format expected:
 *
 *   ---
 *   id: 01-CP-Simulation
 *   title: ...
 *   papers:
 *     - id: paper-01
 *       title: ...
 *   ...
 *   ---
 *
 * We use gray-matter on Node (build time) but in the browser we do a minimal
 * hand-rolled YAML parse covering only the shapes our frontmatter actually
 * uses. No external YAML lib in the bundle.
 */

export type Paper = {
  id: string;
  title?: string;
  venue?: string;
  doi?: string;
  url?: string;
};

export type Repo = {
  name: string;
  url: string;
  role?: string;
  scope?: string;
  not_in_repo?: string;
};

export type AreaFrontmatter = {
  id: string;
  title: string;
  period?: string;
  status?: string;
  papers?: Paper[];
  repos?: Repo[];
  keywords?: string[];
};

export function parseFrontmatter(raw: string): { frontmatter: AreaFrontmatter; body: string } {
  if (!raw.startsWith('---')) {
    return { frontmatter: { id: '', title: '' }, body: raw };
  }
  const end = raw.indexOf('\n---', 3);
  if (end === -1) {
    return { frontmatter: { id: '', title: '' }, body: raw };
  }
  const fmText = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, '');
  return { frontmatter: miniYamlParse(fmText), body };
}

/**
 * Minimal YAML parser for our frontmatter shape.
 * Supports: scalar key: value, indented arrays of objects, simple lists,
 * and block scalars (|) for multi-line strings.
 */
function miniYamlParse(text: string): AreaFrontmatter {
  const lines = text.split('\n');
  const result: any = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }

    const topLevel = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!topLevel) { i++; continue; }

    const key = topLevel[1];
    const rest = topLevel[2];

    // Block scalar: foo: |   ... (indented lines until dedent)
    if (rest.trim() === '|') {
      i++;
      const collected: string[] = [];
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        collected.push(lines[i].replace(/^ {2}/, ''));
        i++;
      }
      result[key] = collected.join('\n').trim();
      continue;
    }

    // Inline scalar: foo: bar
    if (rest.trim() !== '') {
      result[key] = stripQuotes(rest.trim());
      i++;
      continue;
    }

    // List or object (next indented lines)
    i++;
    if (i < lines.length && lines[i].startsWith('  - ')) {
      // List
      const list: any[] = [];
      while (i < lines.length && (lines[i].startsWith('  - ') || lines[i].startsWith('    '))) {
        if (lines[i].startsWith('  - ')) {
          // New item
          const itemStart = lines[i].slice(4);
          const item: any = {};
          const firstKv = itemStart.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
          if (firstKv) {
            item[firstKv[1]] = stripQuotes(firstKv[2].trim());
            i++;
            // Continue reading following indented fields
            while (i < lines.length && lines[i].startsWith('    ') && !lines[i].startsWith('  - ')) {
              const sub = lines[i].slice(4);
              const subKv = sub.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
              if (subKv) {
                const [, subKey, subRest] = subKv;
                if (subRest.trim() === '|') {
                  i++;
                  const collected: string[] = [];
                  while (i < lines.length && (lines[i].startsWith('      ') || lines[i].trim() === '')) {
                    collected.push(lines[i].replace(/^ {6}/, ''));
                    i++;
                  }
                  item[subKey] = collected.join('\n').trim();
                } else {
                  item[subKey] = stripQuotes(subRest.trim());
                  i++;
                }
              } else {
                i++;
              }
            }
            list.push(item);
          } else {
            // Simple scalar list item: "  - foo"
            list.push(stripQuotes(itemStart.trim()));
            i++;
          }
        } else {
          i++;
        }
      }
      result[key] = list;
      continue;
    }
  }

  return result as AreaFrontmatter;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
