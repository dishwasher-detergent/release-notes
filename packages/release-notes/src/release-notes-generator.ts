import chalk from "chalk";
import { AzureOpenAI } from "openai";
import ora from "ora";
import { simpleGit, SimpleGit } from "simple-git";

export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
}

export interface ReleaseNotesOptions {
  repoPath: string;
  client: AzureOpenAI;
  deployment: string;
  maxCommits?: number;
  fromCommit?: string;
  toCommit?: string;
}

export class ReleaseNotesGenerator {
  private git: SimpleGit;
  private client: AzureOpenAI;
  private deployment: string;
  private maxCommits: number;
  private fromCommit?: string;
  private toCommit?: string;

  constructor(options: ReleaseNotesOptions) {
    this.git = simpleGit(options.repoPath);
    this.client = options.client;
    this.deployment = options.deployment;
    this.maxCommits = options.maxCommits || 5;
    this.fromCommit = options.fromCommit;
    this.toCommit = options.toCommit;
  }

  /**
   * Check if we're in a valid git repository
   */
  async checkGitRepo(): Promise<void> {
    const spinner = ora("Checking git repository...").start();
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        spinner.fail(chalk.red("Not a git repository"));
        throw new Error("Not a git repository");
      }
      spinner.succeed(chalk.green("Valid git repository detected"));
    } catch (error) {
      spinner.fail(chalk.red("Git repository check failed"));
      throw new Error(`Git repository check failed: ${error}`);
    }
  }

  /**
   * Get the last N commits from the current branch
   */
  async getLastCommits(count: number = this.maxCommits): Promise<GitCommit[]> {
    const spinner = ora(`Fetching last ${count} commits...`).start();
    try {
      const log = await this.git.log({
        maxCount: count,
      });

      if (log.all.length === 0) {
        spinner.fail(chalk.red("No commits found in repository history"));
        throw new Error("No commits found in repository history");
      }

      const commits = log.all.map((commit: any) => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author_name: commit.author_name,
        author_email: commit.author_email,
      }));

      spinner.succeed(
        chalk.green(`Found ${commits.length} commits in git history`)
      );
      return commits;
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch git history"));
      console.error(chalk.red("Git log error:"), error);
      throw new Error(`Failed to get git history: ${error}`);
    }
  }

  /**
   * Get commits between two commit hashes (inclusive)
   */
  async getCommitsBetween(
    fromCommit: string,
    toCommit: string
  ): Promise<GitCommit[]> {
    const spinner = ora(
      `Fetching commits between ${fromCommit.substring(
        0,
        8
      )}...${toCommit.substring(0, 8)} (inclusive)...`
    ).start();
    try {
      // Use git log with range syntax: fromCommit^..toCommit to include fromCommit
      // This makes the range inclusive of both commits
      const log = await this.git.log({
        from: `${fromCommit}^`,
        to: toCommit,
      });

      if (log.all.length === 0) {
        spinner.fail(
          chalk.red(
            `No commits found between ${fromCommit.substring(
              0,
              8
            )} and ${toCommit.substring(0, 8)}`
          )
        );
        throw new Error(
          `No commits found between ${fromCommit} and ${toCommit}`
        );
      }

      const commits = log.all.map((commit: any) => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author_name: commit.author_name,
        author_email: commit.author_email,
      }));

      spinner.succeed(
        chalk.green(
          `Found ${commits.length} commits between ${fromCommit.substring(
            0,
            8
          )} and ${toCommit.substring(0, 8)}`
        )
      );
      return commits;
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch git history between commits"));
      console.error(chalk.red("Git log error:"), error);
      throw new Error(
        `Failed to get git history between ${fromCommit} and ${toCommit}: ${error}`
      );
    }
  }

  /**
   * Get detailed commit information for each commit
   */
  async getCommitDetails(commits: GitCommit[]): Promise<string[]> {
    const spinner = ora("Analyzing commit details...").start();
    const details: string[] = [];

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      spinner.text = `Analyzing commit ${i + 1}/${
        commits.length
      }: ${commit.message.substring(0, 50)}...`;

      try {
        const show = await this.git.show([
          commit.hash,
          "--stat",
          "--format=fuller",
        ]);

        details.push(`
Commit: ${commit.message}
Author: ${commit.author_name} <${commit.author_email}>
Date: ${commit.date}
Hash: ${commit.hash}

${show}
---
        `);
      } catch (error) {
        console.warn(
          chalk.yellow(
            `⚠ Failed to get details for commit ${commit.hash.substring(0, 8)}`
          )
        );
      }
    }

    spinner.succeed(
      chalk.green(`Analyzed ${details.length} commits successfully`)
    );
    return details;
  }

  /**
   * Generate release notes using AI
   */
  async generateReleaseNotes(): Promise<string> {
    await this.checkGitRepo();

    let commits: GitCommit[];

    // Determine which method to use for getting commits
    if (this.fromCommit && this.toCommit) {
      commits = await this.getCommitsBetween(this.fromCommit, this.toCommit);
    } else if (this.fromCommit || this.toCommit) {
      throw new Error(
        "Both fromCommit and toCommit must be provided when using commit range"
      );
    } else {
      commits = await this.getLastCommits();
    }

    if (commits.length === 0) {
      throw new Error("No commits found in the repository");
    }

    const commitRangeDesc =
      this.fromCommit && this.toCommit
        ? `between ${this.fromCommit.substring(
            0,
            8
          )} and ${this.toCommit.substring(0, 8)}`
        : `last ${commits.length}`;

    console.log(
      chalk.blue(
        `\n📝 Processing ${commits.length} commits ${commitRangeDesc} for release notes generation...\n`
      )
    );

    const commitDetails = await this.getCommitDetails(commits);
    const combinedDetails = commitDetails.join("\n");

    const aiSpinner = ora("Generating release notes with AI...").start();

    const prompt = `
Analyze the following git commits and generate release notes in clean Markdown format.
Focus on user-facing changes and categorize them appropriately. 
This will be written directly to end users, that are non-technical, 
avoid adding anything that is too technical or detailed.

Git History:
${combinedDetails}

Please generate release notes with the following structure:

# Release Notes

**Release Date:** ${new Date().toISOString().split("T")[0]}

### ⚠️ Breaking Changes
- List any breaking changes that affect existing functionality (if any)

### ✨ New Features
- List new features or enhancements

### 🐛 Bug Fixes
- List bug fixes and corrections

### 📝 Other Changes
- List other notable changes (documentation, refactoring, etc.)

Each item should be a clear, concise description from a user's perspective.
If a category has no items, you may omit that section entirely.
Return ONLY the markdown content, no additional text or formatting.
`;

    try {
      const stream = await this.client.chat.completions.create({
        model: this.deployment,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      aiSpinner.succeed(chalk.green("Streaming release notes from AI...\n"));

      console.log(chalk.blue("📋 Generated Release Notes:\n"));

      let fullContent = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          process.stdout.write(content);
          fullContent += content;
        }
      }

      console.log("\n"); // Add a newline at the end

      if (!fullContent.trim()) {
        throw new Error("No content returned from Azure OpenAI");
      }

      return fullContent.trim();
    } catch (error) {
      console.log(JSON.stringify(error));
      const err = error instanceof Error ? error.message : String(error);
      aiSpinner.fail(chalk.red("AI generation failed"));
      throw new Error(`Failed to generate release notes with AI: ${err}`);
    }
  }
}
