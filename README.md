<div align="center">

# OpenClaw Nebula

**Long-term semantic memory for OpenClaw, powered by Nebula AI.**

Automatically captures conversations and provides agent-driven search to recall relevant context from past interactions.

[![npm](https://img.shields.io/npm/v/@nebula-ai/openclaw-nebula)](https://www.npmjs.com/package/@nebula-ai/openclaw-nebula)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Get Started](#getting-started) &bull; [Usage](#usage) &bull; [Configuration](#configuration) &bull; [Troubleshooting](#troubleshooting)

</div>

---

## Getting Started

### 1. Install the plugin

```bash
openclaw plugins install @nebula-ai/openclaw-nebula
```

### 2. Configure your credentials

Get your API key and collection ID at [trynebula.ai](https://trynebula.ai), then run:

```bash
echo -e "NEBULA_API_KEY=neb_xxx\nNEBULA_COLLECTION_ID=your_collection_id" >> ~/.openclaw/.env
```

### 3. Restart OpenClaw

```bash
openclaw gateway restart
```

That's it — Nebula will start capturing and recalling memories automatically.

> **Prefer a config file?** See [Alternative: Config File](#alternative-config-file) below.

---

## Usage

### Automatic Capture

Once configured, every conversation turn is automatically stored as a searchable memory after each AI response. No action needed.

### Agent Tool — `nebula_search`

The AI agent can proactively search stored memories during conversations to recall user preferences, past discussions, and relevant context.

```typescript
nebula_search({ query: "coding preferences" })
```

### Slash Commands

| Command | Description |
|---------|-------------|
| `/nebula-remember <text>` | Manually save something to memory |
| `/nebula-recall <query>` | Search and display stored memories |

```
/nebula-remember I prefer TypeScript for new projects
/nebula-recall typescript preferences
```

### CLI

```bash
openclaw nebula search "python coding style"
```

---

## Configuration

### Alternative: Config File

Instead of environment variables, you can configure the plugin in `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "openclaw-nebula": {
        "enabled": true,
        "config": {
          "apiKey": "your_api_key_here",
          "collectionId": "your_collection_id_here"
        }
      }
    }
  }
}
```

Then restart: `openclaw gateway restart`

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | *required* | Nebula API key (or set `NEBULA_API_KEY` env var) |
| `collectionId` | *required* | Nebula collection ID (or set `NEBULA_COLLECTION_ID` env var) |
| `collectionName` | — | Optional display name for the collection |
| `autoCapture` | `true` | Automatically store conversations after AI turns |
| `debug` | `false` | Enable debug logging |

---

## Troubleshooting

**`nebula: apiKey is required`**
Set the `NEBULA_API_KEY` environment variable or add it to your config file.

**`nebula: collectionId is required`**
Set the `NEBULA_COLLECTION_ID` environment variable or add it to your config file. Get your collection ID from [trynebula.ai](https://trynebula.ai).

**No search results?**
Nebula takes 5–10 seconds to index new memories. Wait briefly after storing before searching.

**Need more detail?** Enable debug mode in your config:

```json
{ "config": { "debug": true } }
```

Then check OpenClaw logs for `[nebula]` messages.

---

## Links

- [Nebula AI](https://trynebula.ai)
- [OpenClaw Docs](https://docs.openclaw.ai)

## License

MIT
