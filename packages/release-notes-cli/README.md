# @knth/release-notes-cli

Interactive CLI for generating release notes based on git history using Azure OpenAI.

## Installation

```bash
npm install -g @knth/release-notes-cli
```

## Usage

Simply run the command and follow the interactive wizard:

```bash
release-notes
```

Or use the short alias:

```bash
rn
```

## Features

- 🧙‍♂️ Interactive CLI wizard - no complex command-line arguments needed
- 📋 Paginated commit selection with visual browsing
- 🌊 Real-time streaming AI responses
- 🔧 Save to file or display in console
- 🎨 Beautiful terminal output with colors, spinners, and progress indicators

## How It Works

1. **Interactive Setup**: The CLI wizard guides you through Azure OpenAI configuration and repository selection
2. **Commit Selection**: Choose between:
   - **Last N commits**: Specify how many recent commits to analyze
   - **Commit range**: Browse through commits with pagination and select a specific range
3. **Output Options**: Display in console with real-time streaming or save to file

## Environment Variables

You can set these environment variables to skip some prompts:

```bash
export AZURE_OPENAI_API_KEY="your-azure-openai-api-key"
```

## Example Session

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

## Requirements

- Node.js 18 or higher
- Git repository with commit history
- Azure OpenAI resource and API key

## Related Packages

- [@knth/release-notes](https://www.npmjs.com/package/@knth/release-notes) - Core library for programmatic usage

## License

MIT
