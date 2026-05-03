/**
 * Browser-side retrieval.
 *
 * Loads the knowledge base bundle (chunks + embeddings) once and keeps it in
 * memory. At query time, embeds the user's question (via the Worker which
 * proxies DashScope), then does cosine similarity in pure JS.
 *
 * For our scale (17 chunks now, maybe a few hundred eventually), this is
 * trivially fast and has zero infrastructure dependencies.
 */

export type Chunk = {
  idx: number;
  id: string;
  source_type: string;
  source_path: string | null;
  section: string | null;
  area_id: string | null;
  area_title: string | null;
  cell_index: number | null;
  line_start: number | null;
  line_end: number | null;
  name: string | null;
  text: string;
};

export type ScoredChunk = Chunk & { score: number };

let _cache: { chunks: Chunk[]; matrix: Float32Array; dim: number; nChunks: number } | null = null;

export async function loadKnowledgeBase(): Promise<void> {
  if (_cache) return;

  const base = import.meta.env.BASE_URL;
  const [knowledgeResp, embResp] = await Promise.all([
    fetch(`${base}kb/knowledge.json`),
    fetch(`${base}kb/embeddings.bin`),
  ]);
  if (!knowledgeResp.ok) throw new Error(`knowledge.json: ${knowledgeResp.status}`);
  if (!embResp.ok) throw new Error(`embeddings.bin: ${embResp.status}`);

  const knowledge = await knowledgeResp.json() as { dim: number; chunks: Chunk[] };
  const buffer = await embResp.arrayBuffer();
  const matrix = new Float32Array(buffer);

  const nChunks = knowledge.chunks.length;
  if (matrix.length !== nChunks * knowledge.dim) {
    throw new Error(
      `embedding matrix size ${matrix.length} != chunks*dim (${nChunks}*${knowledge.dim})`,
    );
  }

  // Pre-normalize every row so cosine similarity is a pure dot product later.
  for (let i = 0; i < nChunks; i++) {
    const offset = i * knowledge.dim;
    let norm = 0;
    for (let j = 0; j < knowledge.dim; j++) norm += matrix[offset + j] ** 2;
    norm = Math.sqrt(norm) || 1;
    for (let j = 0; j < knowledge.dim; j++) matrix[offset + j] /= norm;
  }

  _cache = { chunks: knowledge.chunks, matrix, dim: knowledge.dim, nChunks };
}

export function isKnowledgeBaseLoaded(): boolean {
  return _cache !== null;
}

/**
 * Rank chunks by cosine similarity against a query embedding.
 * Returns the top-k chunks (scored), filtered by minSim.
 */
export function rankChunks(
  queryVec: Float32Array,
  opts: { topK?: number; minSim?: number } = {},
): ScoredChunk[] {
  if (!_cache) throw new Error('Knowledge base not loaded; call loadKnowledgeBase() first');
  const { chunks, matrix, dim, nChunks } = _cache;
  const topK = opts.topK ?? 8;
  const minSim = opts.minSim ?? 0.25;

  // Normalize the query vector
  let qNorm = 0;
  for (let i = 0; i < queryVec.length; i++) qNorm += queryVec[i] ** 2;
  qNorm = Math.sqrt(qNorm) || 1;

  const sims = new Float32Array(nChunks);
  for (let i = 0; i < nChunks; i++) {
    const offset = i * dim;
    let dot = 0;
    for (let j = 0; j < dim; j++) {
      dot += matrix[offset + j] * queryVec[j];
    }
    sims[i] = dot / qNorm;
  }

  const idxs = Array.from({ length: nChunks }, (_, i) => i);
  idxs.sort((a, b) => sims[b] - sims[a]);

  const out: ScoredChunk[] = [];
  for (const i of idxs.slice(0, topK)) {
    if (sims[i] < minSim) break;
    out.push({ ...chunks[i], score: sims[i] });
  }
  return out;
}
