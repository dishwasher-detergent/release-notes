# @knth/release-notes-cli

Interactive CLI for generating release notes from git history using Azure OpenAI.

## Installation

```bash
npm install -g @knth/release-notes-cli
```

## Usage

Run the interactive wizard:

```bash
release-notes
```

Or use the short alias:

```bash
rn
```

### Command Line Options

Skip interactive prompts by providing options directly:

```bash
release-notes --api-key "your-key" --endpoint "https://your-resource.cognitiveservices.azure.com/" --deployment "gpt-4o-mini" --commit-mode "last" --commit-count 5 --output-mode "console"
```

Available options:

- `--api-key <key>` - Azure OpenAI API key
- `--endpoint <url>` - Azure OpenAI endpoint URL
- `--deployment <name>` - Azure OpenAI deployment name (default: gpt-4o-mini)
- `--repo-path <path>` - Repository path (default: current directory)
- `--commit-mode <mode>` - Commit selection: `last` or `range`
- `--commit-count <number>` - Number of recent commits (for last mode)
- `--from-commit <hash>` - Starting commit hash (for range mode)
- `--to-commit <hash>` - Ending commit hash (for range mode)
- `--output-mode <mode>` - Output mode: `console` or `file`
- `--output-file <filename>` - Output filename (for file mode)

## Features

- Interactive CLI wizard with no complex arguments required
- Command-line options for automation and scripting
- Paginated commit selection and browsing
- Real-time streaming responses
- Console display or file output
- Terminal UI with colors and progress indicators

## How It Works

1. Interactive setup guides through Azure OpenAI configuration
2. Choose commit selection: last N commits or specific range with pagination
3. Select output options: console display or file save

## Environment Variables

Set to skip prompts:

```bash
export AZURE_OPENAI_API_KEY="your-azure-openai-api-key"
export AZURE_OPENAI_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
```

## Requirements

- Node.js 18 or higher
- Git repository with commit history
- Azure OpenAI resource and API key

## License

MIT
