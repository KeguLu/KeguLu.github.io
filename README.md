# PhD Agent — Web Frontend

Personal research site + agent UI for Kegu Lu's PhD work. Built with React +
Vite + Tailwind, deployed on GitHub Pages, with a Cloudflare Worker proxy
for DashScope (Qwen) API calls.

## Architecture

```
┌──────────────┐          ┌──────────────────────┐         ┌─────────────┐
│ kegulu.github│  fetch   │ phd-agent-proxy      │ bearer  │  DashScope  │
│    .io       │─────────▶│ .workers.dev         │────────▶│  Singapore  │
│  (this app)  │          │ (rate limit, budget) │         │   Qwen API  │
└──────────────┘          └──────────────────────┘         └─────────────┘
```

The browser never sees the DashScope key. The Worker enforces:
- Per-IP rate limit: 30/day + 5/minute
- Monthly token budget: 2M tokens (≈ $2)
- CORS whitelist: only your own domain

## Project structure

```
phd-agent-web/
├── index.html                   Font imports, meta tags
├── vite.config.ts              base: '/' for KeguLu.github.io
├── tailwind.config.js          Fonts, colors, type scale
├── src/
│   ├── main.tsx                Entry
│   ├── App.tsx                 Router
│   ├── styles.css              Global + prose + KaTeX + hljs
│   ├── lib/
│   │   ├── site.ts             ⭐ Personal info (edit this!)
│   │   ├── frontmatter.ts      Parse YAML frontmatter in-browser
│   │   ├── retrieval.ts        Cosine-sim retrieval over the KB
│   │   └── agent.ts            Chat + embed client (talks to Worker)
│   ├── components/
│   │   └── Layout.tsx          Header + footer
│   └── pages/
│       ├── HomePage.tsx        Hero + About + Research + Contact
│       ├── AreaPage.tsx        Research-area detail (markdown + KaTeX)
│       ├── ChatPage.tsx        Conversation + sources sidebar
│       └── NotFoundPage.tsx    404
├── scripts/
│   └── build_kb.mjs            Convert prototype's index to public/kb/
├── public/
│   └── kb/                     (generated) knowledge.json + embeddings.bin
│                               + areas/*.md + manifest.json
├── worker/                     Cloudflare Worker (separate deploy target)
│   ├── index.ts                /api/embed and /api/chat
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
└── .github/workflows/
    └── deploy.yml              Auto-deploy to GitHub Pages on push to main
```

---

## 1. Prerequisites

- Node.js 20+ and npm
- The `phd-agent-proto` Python prototype built successfully (its
  `data/index/` directory must exist).
- Cloudflare account (free; used for the Worker)
- GitHub account with a repo named `KeguLu.github.io`

---

## 2. First-time setup

```bash
cd phd-agent-web

# Install frontend deps
npm install

# Install Worker deps (separate project)
cd worker && npm install && cd ..

# Build the knowledge base bundle from the Python prototype.
# Adjust the path if your prototype is elsewhere.
npm run build:kb -- ../phd-agent-proto
```

You should now see `public/kb/knowledge.json`, `public/kb/embeddings.bin`,
`public/kb/areas/*.md`, and `public/kb/manifest.json`.

Rerun `npm run build:kb` whenever you edit the markdown or re-run the Python
build.

---

## 3. Local development

### Frontend

```bash
npm run dev
# open http://localhost:5173
```

### Worker (local)

In a second terminal:

```bash
cd worker
wrangler login                # opens browser, one-time
wrangler kv namespace create "KV"
# Paste the returned namespace id into wrangler.toml
wrangler secret put DASHSCOPE_API_KEY    # paste your Singapore-region key

wrangler dev                  # runs locally at http://127.0.0.1:8787
```

Now edit `phd-agent-web/.env.local` (create it) to point the frontend at the
local Worker:

```env
VITE_CHAT_API_URL=http://127.0.0.1:8787/api/chat
```

Restart `npm run dev` for the env var to take effect.

---

## 4. Deploy the Worker

From inside `worker/`:

```bash
wrangler deploy
```

Wrangler will print your Worker's URL, e.g.
`https://phd-agent-proxy.<your-subdomain>.workers.dev`.

Update `src/lib/site.ts`:

```ts
chatApiUrl: 'https://phd-agent-proxy.<your-subdomain>.workers.dev/api/chat',
```

---

## 5. Deploy the frontend to GitHub Pages

### One-time repository setup

1. Create a GitHub repo named **exactly** `KeguLu.github.io` (user-pages repo).
2. In repo settings → **Pages** → Source: **GitHub Actions**.
3. Commit `public/kb/` to the repo (the CI does not regenerate it — see the
   comment in `.github/workflows/deploy.yml`).
4. Push to `main`. The action deploys automatically.

Your site goes live at `https://kegulu.github.io/`.

### Every subsequent update

```bash
# When you change the markdown or code:
npm run build:kb -- ../phd-agent-proto
git add public/kb
git add -A
git commit -m "Update research area"
git push
```

---

## 6. Editing content

**Personal info, bio, links**: `src/lib/site.ts`

**Research-area markdown**: Edit files in `phd-agent-proto/data/kb/`, then
rerun the Python embed step and `npm run build:kb`. The site picks up the
manifest on next load.

**Adding a new research area**: Create `02-<slug>.md` in the prototype's
`data/kb/`, re-run the full build chain. The homepage will show it in the
research list automatically.

**Swap models**: Edit `worker/wrangler.toml` (`MODEL_CHAT`, `MODEL_EMBED`)
then `wrangler deploy`. Available options:
- `qwen-plus` (default, balanced)
- `qwen3-max` (most capable, higher cost)
- `qwen-turbo` (cheapest, weakest)
- `qwen3-coder-plus` (code-specialized)

**Tweak rate limits / budget**: Edit the `[vars]` block in `wrangler.toml`
and `wrangler deploy`.

---

## 7. Monitoring and costs

- **Worker logs**: `cd worker && npm run logs`
- **DashScope usage**: [Alibaba Cloud Model Studio console](https://www.alibabacloud.com/product/modelstudio)
- **GitHub Pages**: free for public repos
- **Cloudflare Workers**: 100k requests/day free — you will not hit this.

Monthly token budget enforcement is in KV, keyed by `tokens:YYYY-MM`. Once
exhausted, chat requests return 503 until next month.

---

## Troubleshooting

**Chat returns 403 "origin not allowed"**: Add your current origin to
`ALLOWED_ORIGINS` in `wrangler.toml` and redeploy.

**Chat returns 429**: You (or another user sharing your IP) hit the rate
limit. Adjust `IP_LIMIT_PER_DAY` / `IP_LIMIT_PER_MINUTE` if needed.

**"Knowledge base failed to load"**: Run `npm run build:kb` and make sure
`public/kb/` was committed.

**Math renders as `$...$`**: KaTeX CSS failed to load. Check network tab
for the `katex.min.css` request from jsdelivr.

**Chinese text displays as `??` or boxes**: Only happens in very old
browsers. The app serves UTF-8 by default.
