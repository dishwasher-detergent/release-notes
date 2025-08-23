# AI Release Notes Generator

TypeScript npm package ecosystem for generatin## Environment Variables

Set to skip prompts:

```bash
export AZURE_OPENAI_API_KEY="your-azure-openai-api-key"
```

## Configuration

### Azure OpenAI Setup

Required:

1. API Key from Azure OpenAI resource
2. Endpoint (e.g., `https://your-resource.cognitiveservices.azure.com/`)
3. Deployment with model (e.g., `gpt-4o-mini`, `gpt-4o`) git history using Azure OpenAI. Contains core library and interactive CLI.

## Packages

### [@knth/release-notes](./packages/release-notes)

Core library for programmatic release note generation.

### [@knth/release-notes-cli](./packages/release-notes-cli)

Interactive CLI tool for the core library.

## Features

- AI-powered release note generation using Azure OpenAI
- Interactive CLI wizard with no complex arguments
- Git commit analysis and categorization
- Flexible commit selection (last N commits or range)
- Paginated commit browsing
- Real-time streaming responses
- Markdown output format
- Terminal UI with colors and progress indicators
- Console display or file output
- Cost-effective with GPT-4o Mini default

## Installation

### CLI Usage (Recommended)

```bash
npm install -g @knth/release-notes-cli
```

### Programmatic Usage

```bash
npm install @knth/release-notes
```

## Quick Start

### CLI Usage

```bash
release-notes
# or use the short alias:
rn
```

### Programmatic Usage

```typescript
import { ReleaseNotesGenerator } from "@knth/release-notes";
import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  apiKey: "your-azure-openai-api-key",
  endpoint: "https://your-resource.cognitiveservices.azure.com/",
  apiVersion: "2024-10-21",
});

const generator = new ReleaseNotesGenerator({
  repoPath: "/path/to/repo",
  client: client,
  deployment: "gpt-4o-mini",
});

const releaseNotes = await generator.generateReleaseNotes();
```

## CLI Usage

Interactive wizard eliminates complex command-line arguments:

```bash
release-notes
```

Prompts for:

1. Azure OpenAI configuration (API Key, Endpoint, Deployment)
2. Repository path (defaults to current directory)
3. Commit selection (last N commits or specific range)
4. Output options (console or file)
   - Save to file (e.g., `RELEASE_NOTES.md`)

## Environment Variables

You can set these environment variables to skip some prompts:

```bash
export AZURE_OPENAI_API_KEY="your-azure-openai-api-key"
```

## Configuration

### Azure OpenAI Setup

You'll need an Azure OpenAI resource with:

1. **API Key**: Found in your Azure OpenAI resource
2. **Endpoint**: Your resource endpoint (e.g., `https://your-resource.cognitiveservices.azure.com/`)
3. **Deployment**: A deployed model (e.g., `gpt-4o-mini`, `gpt-4o`)

### Core Library Interface

```typescript
interface ReleaseNotesOptions {
  repoPath: string; // Path to git repository
  client: AzureOpenAI; // Azure OpenAI client instance
  deployment: string; // Azure OpenAI deployment name
  maxCommits?: number; // Number of commits for "last N" mode
  fromCommit?: string; // Starting commit hash for range mode
  toCommit?: string; // Ending commit hash for range mode
}
```

## How It Works

1. Interactive setup guides through Azure OpenAI configuration
2. Choose commit selection: last N commits or specific range with pagination
3. Extract commit information (messages, authors, dates, files)
4. Process with Azure OpenAI using streaming responses
5. Generate categorized Markdown output

## Output Format

Generated release notes structure:

```markdown
# Release Notes

**Release Date:** 2025-08-22

### Breaking Changes

- Breaking changes affecting existing functionality

### New Features

- New features and enhancements

### Bug Fixes

- Bug fixes and corrections

### Other Changes

- Documentation, refactoring, etc.
```

## Requirements

- Node.js 18 or higher
- Git repository with commit history
- Azure OpenAI resource and API key

## Example CLI Session

```bash
$ release-notes

AI Release Notes Generator

? Enter your Azure OpenAI API key: ****
? Enter your Azure OpenAI endpoint: https://your-resource.cognitiveservices.azure.com/
? Enter your deployment name: gpt-4o-mini
? Repository path (press Enter for current directory):
? How would you like to select commits? Between two specific commits
? Select the starting commit (OLDER): abc12345 - Initial project setup (John Doe)
? Select the ending commit (NEWER): def67890 - Add user authentication (Jane Smith)
? Where would you like the output? Display in console
? Proceed with release notes generation? Yes

Processing 5 commits between abc12345 and def67890...

Generated Release Notes:
# Release Notes
...
```

## Development

See [README-PACKAGES.md](./README-PACKAGES.md) for development and publishing instructions.

## Tips

- Use `gpt-4o-mini` for cost optimization
- Visual commit browser for precise range selection
- Save to `RELEASE_NOTES.md` for integration
- Set `AZURE_OPENAI_API_KEY` environment variable

## Troubleshooting

### Common Issues

1. "Not a git repository" - Run in directory with git history
2. "No commits found" - Check repository has commits in range
3. Azure OpenAI errors - Verify API key, endpoint, deployment
4. Permission errors - Ensure git repository access

### Getting Help

1. Check error messages for guidance
2. Verify Azure OpenAI configuration
3. Ensure git repository accessibility
4. Open GitHub issue with setup details

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and add tests if applicable
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## Support

For issues or questions:

- Check README for common solutions
- Open GitHub issue for bugs
- Submit feature requests via GitHub issues
- Contact maintainers for support
