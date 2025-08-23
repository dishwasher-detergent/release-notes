# AI Release Notes Generator

A TypeScript npm package ecosystem that generates release notes based on git history using Azure OpenAI. This monorepo contains both a core library and an interactive CLI tool.

## Packages

### [@knth/release-notes](./packages/release-notes) - Core Library

The core functionality for generating release notes programmatically.

### [@knth/release-notes-cli](./packages/release-notes-cli) - CLI Tool

Interactive CLI wizard that provides a user-friendly interface for the core library.

## Features

- 🤖 AI-powered release note generation using Azure OpenAI
- 🧙‍♂️ Interactive CLI wizard - no complex command-line arguments needed
- 📝 Analyzes git commits to extract meaningful changes
- 🎯 Flexible commit selection: last N commits or specific commit range
- 📋 Paginated commit selection with visual browsing
- 🌊 Real-time streaming AI responses
- 🏷️ Categorizes changes into features, bug fixes, breaking changes, and other changes
- 📄 Outputs clean Markdown format ready for release notes
- 🎨 Beautiful terminal output with colors, spinners, and progress indicators
- 🔧 Save to file or display in console
- 💰 Cost-effective using GPT-4o Mini by default

## Installation

### For CLI Usage (Recommended)

```bash
npm install -g @knth/release-notes-cli
```

### For Programmatic Usage

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

## CLI Usage Details

The CLI features a user-friendly interactive wizard that eliminates the need for complex command-line arguments:

```bash
release-notes
```

The wizard will prompt you for:

1. **Azure OpenAI Configuration**:

   - API Key (can use `AZURE_OPENAI_API_KEY` environment variable)
   - Endpoint URL
   - Deployment name

2. **Repository Settings**:

   - Repository path (defaults to current directory)

3. **Commit Selection**:

   - **Last N commits**: Specify how many recent commits to analyze
   - **Commit range**: Browse and select two specific commits with paginated lists

4. **Output Options**:
   - Display in console with real-time streaming
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

1. **Interactive Setup**: The CLI wizard guides you through Azure OpenAI configuration and repository selection
2. **Commit Selection**: Choose between:
   - **Last N commits**: Analyze the most recent commits
   - **Commit range**: Browse through commits with pagination and select a specific range
3. **Git Analysis**: Extracts detailed commit information including messages, authors, dates, and file changes
4. **AI Processing**: Sends commit data to Azure OpenAI with streaming responses for real-time feedback
5. **Structured Output**: Generates clean, categorized Markdown suitable for release notes

## Output Format

The generated release notes follow this structure:

```markdown
# Release Notes

**Release Date:** 2025-08-22

### ⚠️ Breaking Changes

- List of breaking changes that affect existing functionality (if any)

### ✨ New Features

- List of new features and enhancements

### 🐛 Bug Fixes

- List of bug fixes and corrections

### 📝 Other Changes

- List of other notable changes (documentation, refactoring, etc.)
```

## Requirements

- Node.js 18 or higher
- Git repository with commit history
- Azure OpenAI resource and API key

## Example CLI Session

```bash
$ release-notes

🚀 AI Release Notes Generator

Let's set up your release notes generation...

? Enter your Azure OpenAI API key: ****
? Enter your Azure OpenAI endpoint: https://your-resource.cognitiveservices.azure.com/
? Enter your deployment name: gpt-4o-mini
? Repository path (press Enter for current directory):
? How would you like to select commits? Between two specific commits

📋 Select commit range for release notes generation:

• First select the OLDER commit (start of range)
• Then select the NEWER commit (end of range)
• Use arrow keys to navigate, Enter to select

? 📍 Select the starting commit (OLDER): abc12345 - Initial project setup (John Doe)
? 📍 Select the ending commit (NEWER): def67890 - Add user authentication (Jane Smith)
? Where would you like the output? Display in console
? Proceed with release notes generation? Yes

📝 Processing 5 commits between abc12345 and def67890 for release notes generation...

📋 Generated Release Notes:

# Release Notes
...
```

## Development Setup

See [README-PACKAGES.md](./README-PACKAGES.md) for detailed development and publishing instructions.

## Tips

- **Cost Optimization**: The default `gpt-4o-mini` model provides excellent results at a lower cost
- **Commit Range**: Use the visual commit browser to precisely select the range you want to analyze
- **File Output**: Save to `RELEASE_NOTES.md` for easy integration with your release process
- **Environment Variables**: Set `AZURE_OPENAI_API_KEY` to skip the API key prompt

## Troubleshooting

### Common Issues

1. **"Not a git repository"**: Ensure you're running the command in a directory with git history
2. **"No commits found"**: Check that your repository has commits in the selected range
3. **Azure OpenAI errors**: Verify your API key, endpoint, and deployment name are correct
4. **Permission errors**: Ensure you have read access to the git repository

### Getting Help

If you encounter issues:

1. Check the error message for specific guidance
2. Verify your Azure OpenAI configuration
3. Ensure your git repository is accessible
4. Open an issue on GitHub with details about your setup

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Support

If you encounter any issues or have questions:

- 📖 Check this README for common solutions
- 🐛 Open an issue on GitHub for bugs
- 💡 Submit feature requests via GitHub issues
- 📧 Contact the maintainers for support

---

**Made with ❤️ for developers who want beautiful, AI-generated release notes**
