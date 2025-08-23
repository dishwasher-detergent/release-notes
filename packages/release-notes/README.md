# @knth/release-notes

Core library for generating release notes based on git history using Azure OpenAI.

## Installation

```bash
npm install @knth/release-notes
```

## Usage

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
  maxCommits: 5, // For last N commits
  // OR for commit range:
  // fromCommit: "abc123...",
  // toCommit: "def456...",
});

// Generate release notes (streams to console by default)
const releaseNotes = await generator.generateReleaseNotes();
console.log(releaseNotes);
```

## API

### `ReleaseNotesGenerator`

#### Constructor Options

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

#### Methods

- `generateReleaseNotes(): Promise<string>` - Generate release notes as markdown string
- `checkGitRepo(): Promise<void>` - Verify the repository is valid
- `getLastCommits(count?: number): Promise<GitCommit[]>` - Get recent commits
- `getCommitsBetween(from: string, to: string): Promise<GitCommit[]>` - Get commits in range

## Features

- 🤖 AI-powered release note generation using Azure OpenAI
- 📝 Analyzes git commits to extract meaningful changes
- 🎯 Flexible commit selection: last N commits or specific commit range
- 🌊 Real-time streaming AI responses
- 🏷️ Categorizes changes into features, bug fixes, breaking changes, and other changes
- 📄 Outputs clean Markdown format ready for release notes

## Requirements

- Node.js 18 or higher
- Git repository with commit history
- Azure OpenAI resource and API key

## License

MIT
