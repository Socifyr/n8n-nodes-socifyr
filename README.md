# n8n-nodes-socifyr

Official [Socifyr](https://socifyr.com) community node for [n8n](https://n8n.io) — publish, schedule, and manage
social posts across **18 platforms** (Instagram, LinkedIn, X, TikTok, Facebook, YouTube, Threads, Pinterest,
Reddit, Bluesky, Telegram, Discord, Mastodon, Nostr, Slack, Dev.to, Hashnode, Tumblr) from n8n workflows.

## Install

1. n8n → **Settings → Community Nodes → Install**
2. Enter `n8n-nodes-socifyr` (or this repo's folder for local dev)
3. Restart n8n if prompted

## Set up credentials

Add a **Socifyr API** credential with:

| Field | Value |
|---|---|
| API Key | `sk_...` from Dashboard → API Keys |
| Base URL | default `https://api.socifyr.com/api`; change only for self-hosted |

The key belongs to one workspace, so the node always posts there. To post to another workspace, add a second credential with that workspace's key.

**Tip — keep agents safe:** create a dedicated key for n8n and give it agent guardrails
(Dashboard → API Keys → shield icon): a daily post limit, an X spend cap, or *require
approval* so every workflow-published post waits for human review. The node inherits all of
it automatically.

## Operations

**Create**
- Create Text Post · Create Photo Post · Create Video Post · Create Document Post
- Bulk Schedule (rows JSON or CSV, up to 500 posts)

**Fetch**
- Get Content (per-platform results included)
- List Content (status/type/platform filters, pagination)
- Check Status (poll `requestId` from async publishes)

**Manage**
- Publish Draft · Publish Now · Submit for Approval · Approve Post · Reject Post · Retry Failed · Delete Content

## Media files

The node posts media by **URL or media-library ID** (`medias[]`). n8n file buffers can't be
attached directly — either pass a public `https://` URL, or use an HTTP Request/Socifyr media
library upload node upstream and pass the returned ID.

## Response shape

Socifyr's `{ success, data }` envelope is unwrapped — downstream nodes see `data` directly
(`uploadId`, `requestId`, `usage`, per-channel results, ...). API errors surface as node errors
with the Socifyr message (e.g. `403: API key "n8n" reached its daily post limit (...)`).

## Local development

```bash
pnpm install
pnpm --filter n8n-nodes-socifyr build
# then load dist/ into n8n via ~/.n8n/nodes (link this package)
```

Docs: <https://socifyr.com/docs/integrations/n8n>
