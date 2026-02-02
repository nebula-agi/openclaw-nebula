# OpenClaw Nebula Memory Plugin

Long-term semantic memory for OpenClaw powered by Nebula AI. Automatically captures conversations, recalls relevant context, and builds a persistent user profile.

## Installation

```bash
openclaw plugins install @nebula-ai/openclaw-nebula
```

Restart OpenClaw after installation.

## Configuration

### Required: API Key

Set your Nebula API key:

```bash
export NEBULA_API_KEY="your_nebula_api_key"
```

Or in `~/.openclaw/config.json`:

```json
{
  "plugins": {
    "entries": {
      "openclaw-nebula": {
        "enabled": true,
        "config": {
          "apiKey": "${NEBULA_API_KEY}"
        }
      }
    }
  }
}
```

Get your API key at [trynebula.ai](https://trynebula.ai)

### Optional Settings

| Option | Default | Description |
|--------|---------|-------------|
| `collectionName` | `openclaw_{hostname}` | Collection name for storing memories |
| `autoRecall` | `true` | Auto-inject relevant memories before AI turns |
| `autoCapture` | `true` | Auto-store conversations after AI turns |
| `maxRecallResults` | `10` | Maximum memories injected per turn |
| `debug` | `false` | Enable debug logging |

## Usage

### Automatic Mode

Once configured, the plugin works automatically:

- **Auto-Capture**: Stores conversation turns as memories
- **Auto-Recall**: Injects relevant context before AI responses

No manual intervention needed.

### MCP Tools

The AI can use these tools during conversations:

#### `nebula_store`
Save information to memory.
```typescript
nebula_store({ text: "User prefers dark mode", category: "preference" })
```

#### `nebula_search`
Search stored memories.
```typescript
nebula_search({ query: "coding preferences", limit: 5 })
```

#### `nebula_forget`
Delete a memory.
```typescript
nebula_forget({ query: "outdated preference" })
```

#### `nebula_profile`
Get user profile summary.
```typescript
nebula_profile({ query: "programming habits" })
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

#### View profile
```bash
openclaw nebula profile
```

#### Delete all memories
```bash
openclaw nebula wipe
```

**Warning:** Wipe permanently deletes all memories and cannot be undone.

## Troubleshooting

### Plugin won't load
**Error:** `nebula: apiKey is required`

Set the `NEBULA_API_KEY` environment variable or add it to your config file.

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
