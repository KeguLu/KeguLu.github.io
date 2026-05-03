#!/usr/bin/env node
/**
 * Build the frontend knowledge-base bundle from the Python prototype's
 * data/index/ directory.
 *
 * Input:
 *   ../phd-agent-proto/data/index/index.json        (chunks)
 *   ../phd-agent-proto/data/index/embeddings.npy    (N x D float32)
 *   ../phd-agent-proto/data/kb/*.md                 (research-area markdown)
 *
 * Output (all written to public/kb/):
 *   knowledge.json       — { chunks, dim }; chunks include their section text
 *   embeddings.bin       — raw float32 little-endian N×D matrix
 *   areas/<id>.md        — each research-area markdown (frontmatter + body)
 *   manifest.json        — metadata: areas list, stats, build timestamp
 *
 * Why a raw .bin instead of JSON for embeddings?
 *   17 chunks × 1024 dims × 4 bytes = 68 KB. JSON-encoded float arrays waste
 *   ~3x space on number stringification. fetch() + ArrayBuffer + Float32Array
 *   gives us the matrix in 2 lines of browser code.
 *
 * Usage (from web project root):
 *   node scripts/build_kb.mjs [path/to/phd-agent-proto]
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const WEB_ROOT = resolve(__dirname, '..');

const PROTO_ROOT = resolve(process.argv[2] || '../phd-agent-proto');
const INDEX_JSON = join(PROTO_ROOT, 'data/index/index.json');
const EMB_NPY = join(PROTO_ROOT, 'data/index/embeddings.npy');
const KB_DIR = join(PROTO_ROOT, 'data/kb');

const OUT_DIR = join(WEB_ROOT, 'public/kb');
const OUT_AREAS = join(OUT_DIR, 'areas');

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (!existsSync(INDEX_JSON)) {
  fail(`Prototype index not found at ${INDEX_JSON}\n` +
       `Run the Python build first:\n` +
       `  cd ${PROTO_ROOT} && python build/build_index.py`);
}
if (!existsSync(EMB_NPY)) {
  fail(`Embeddings not found at ${EMB_NPY}`);
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(OUT_AREAS, { recursive: true });

// --- 1. Load chunks -----------------------------------------------------
console.log(`Reading chunks from ${INDEX_JSON}`);
const indexData = JSON.parse(readFileSync(INDEX_JSON, 'utf-8'));
console.log(`  ${indexData.chunks.length} chunks, dim=${indexData.dim}`);

// --- 2. Parse .npy file and extract the float32 matrix -----------------
// NumPy .npy format: https://numpy.org/doc/stable/reference/generated/numpy.lib.format.html
//   6-byte magic (\x93NUMPY) + 2-byte version + 2-byte header-length (LE)
//   + ASCII header (python dict-like) + data
function parseNpy(buffer) {
  const magic = buffer.subarray(0, 6);
  const expected = Buffer.from([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59]);
  if (!magic.equals(expected)) {
    throw new Error('Not a valid .npy file (magic mismatch)');
  }
  const major = buffer[6];
  const headerLen = major < 2
    ? buffer.readUInt16LE(8)
    : buffer.readUInt32LE(8);
  const headerStart = major < 2 ? 10 : 12;
  const header = buffer.subarray(headerStart, headerStart + headerLen).toString('ascii');
  // Header is like: "{'descr': '<f4', 'fortran_order': False, 'shape': (17, 1024), }"
  const shapeMatch = header.match(/'shape'\s*:\s*\(([^)]+)\)/);
  const descrMatch = header.match(/'descr'\s*:\s*'([^']+)'/);
  if (!shapeMatch || !descrMatch) {
    throw new Error(`Could not parse .npy header: ${header}`);
  }
  const shape = shapeMatch[1].split(',').map(s => s.trim()).filter(Boolean).map(Number);
  const dtype = descrMatch[1];
  if (dtype !== '<f4') {
    throw new Error(`Expected float32 little-endian (<f4); got ${dtype}`);
  }
  const dataOffset = headerStart + headerLen;
  const dataBuffer = buffer.subarray(dataOffset);
  return { shape, dataBuffer };
}

console.log(`Reading embeddings from ${EMB_NPY}`);
const npyBuf = readFileSync(EMB_NPY);
const { shape, dataBuffer } = parseNpy(npyBuf);
const [nChunks, dim] = shape;
console.log(`  shape=[${nChunks}, ${dim}]`);

if (nChunks !== indexData.chunks.length) {
  fail(`Mismatch: index.json has ${indexData.chunks.length} chunks but .npy has ${nChunks} rows`);
}
if (dim !== indexData.dim) {
  fail(`Mismatch: index.json declares dim=${indexData.dim} but .npy has dim=${dim}`);
}

// --- 3. Write knowledge.json (chunks with text + metadata) -------------
// Strip redundant fields to keep the JSON small.
const trimmedChunks = indexData.chunks.map((c, i) => ({
  idx: i,
  id: c.id,
  source_type: c.source_type,
  source_path: c.source_path,
  section: c.section ?? null,
  area_id: c.area_id ?? null,
  area_title: c.area_title ?? null,
  cell_index: c.cell_index ?? null,
  line_start: c.line_start ?? null,
  line_end: c.line_end ?? null,
  name: c.name ?? null,
  text: c.text,
}));

writeFileSync(
  join(OUT_DIR, 'knowledge.json'),
  JSON.stringify({ dim, chunks: trimmedChunks }, null, 0),
  'utf-8',
);
console.log(`✓ knowledge.json (${trimmedChunks.length} chunks)`);

// --- 4. Write embeddings.bin (raw float32) -----------------------------
writeFileSync(join(OUT_DIR, 'embeddings.bin'), dataBuffer);
console.log(`✓ embeddings.bin (${(dataBuffer.length / 1024).toFixed(1)} KB)`);

// --- 5. Copy research-area markdown verbatim ---------------------------
const mdFiles = readdirSync(KB_DIR).filter(f => f.endsWith('.md'));
const areas = [];
for (const file of mdFiles) {
  const src = join(KB_DIR, file);
  const dst = join(OUT_AREAS, file);
  copyFileSync(src, dst);

  // Peek at frontmatter to build the manifest
  const raw = readFileSync(src, 'utf-8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  let id = file.replace(/\.md$/, '');
  let title = id;
  let status = 'unknown';
  let period = '';
  if (fmMatch) {
    const fm = fmMatch[1];
    const idM = fm.match(/^id:\s*(.+)$/m);
    const titleM = fm.match(/^title:\s*(.+)$/m);
    const statusM = fm.match(/^status:\s*(\S+)/m);
    const periodM = fm.match(/^period:\s*(.+?)\s*$/m);
    if (idM) id = idM[1].trim();
    if (titleM) title = titleM[1].trim();
    if (statusM) status = statusM[1].trim();
    if (periodM) period = periodM[1].trim();
  }
  areas.push({ id, title, status, period, file });
  console.log(`✓ area: ${id}`);
}

// --- 6. Write manifest --------------------------------------------------
const manifest = {
  built_at: new Date().toISOString(),
  total_chunks: trimmedChunks.length,
  embedding_dim: dim,
  areas,
};
writeFileSync(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf-8',
);
console.log(`✓ manifest.json`);

console.log(`\nKnowledge base built -> public/kb/\n`);
