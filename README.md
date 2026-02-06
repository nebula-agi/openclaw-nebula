# OpenClaw Nebula Memory Plugin

Long-term semantic memory for OpenClaw powered by Nebula AI. Automatically captures conversations and provides agent-driven search to recall relevant context from past interactions.

## Installation

```bash
openclaw plugins install @nebula-ai/openclaw-nebula
```

Restart OpenClaw after installation.

## Configuration

### Quick Setup (Copy & Paste)

1. Get your API key and collection ID at [trynebula.ai](https://trynebula.ai)
2. Run this command (replace with your actual values):

```bash
echo -e "NEBULA_API_KEY=neb_xxx\nNEBULA_COLLECTION_ID=your_collection_id" >> ~/.openclaw/.env && openclaw gateway restart
```

Done! The plugin will automatically read your credentials from the .env file.

### Alternative: Config File

Edit `~/.openclaw/openclaw.json`:

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

### Optional Settings

| Option | Default | Description |
|--------|---------|-------------|
| `collectionName` | — | Optional display name for the collection |
| `autoCapture` | `true` | Auto-store conversations after AI turns |
| `debug` | `false` | Enable debug logging |

## Usage

### Automatic Capture

Once configured, the plugin automatically stores conversation turns as memories after each AI response.

### Agent Tool

The AI agent can search stored memories during conversations:

#### `nebula_search`
Search stored memories for relevant context. The agent is encouraged to proactively use this tool to recall user preferences, past discussions, and relevant information before responding.

```typescript
nebula_search({ query: "coding preferences", limit: 5 })
```

### Slash Commands

#### `/nebula-remember <text>`
Manually save to memory.
```
/nebula-remember I prefer TypeScript for new projects
```

#### `/nebula-recall <query>`
Search and display memories.
```
/nebula-recall typescript preferences
```

### CLI Commands

#### Search memories
```bash
openclaw nebula search "python coding style"
```

**Warning:** Wipe permanently deletes all memories and cannot be undone.

## Troubleshooting

### Plugin won't load
**Error:** `nebula: apiKey is required`
Set the `NEBULA_API_KEY` environment variable or add it to your config file.

**Error:** `nebula: collectionId is required`
Set the `NEBULA_COLLECTION_ID` environment variable or add it to your config file. Get your collection ID from [trynebula.ai](https://trynebula.ai).

### No search results
Nebula takes 5-10 seconds to index new memories. Wait after storing before searching.

### Enable debug mode
Add to config:
```json
{
  "config": {
    "debug": true
  }
}
```

Check OpenClaw logs for `[nebula]` messages.

## Support

- Documentation: [docs.openclaw.ai](https://docs.openclaw.ai)
- Nebula AI: [trynebula.ai](https://trynebula.ai)

## License

MIT
