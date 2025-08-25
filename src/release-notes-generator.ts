import chalk from "chalk";
import { AzureOpenAI } from "openai";
import ora from "ora";
import { simpleGit, SimpleGit } from "simple-git";

const MAX_COMMIT_DIFF_CHARS = 3000;

export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
}

export interface ReleaseNotesOptions {
  client: AzureOpenAI;
  maxCommits?: number;
  fromCommit?: string;
  toCommit?: string;
}

export class ReleaseNotesGenerator {
  private git: SimpleGit;
  private client: AzureOpenAI;
  private maxCommits: number;
  private fromCommit?: string;
  private toCommit?: string;

  constructor(options: ReleaseNotesOptions) {
    this.git = simpleGit(process.cwd());
    this.client = options.client;
    this.maxCommits = options.maxCommits || 5;
    this.fromCommit = options.fromCommit;
    this.toCommit = options.toCommit;
  }
  async checkGitRepo(): Promise<void> {
    const spinner = ora("Checking repository...").start();
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        spinner.fail(chalk.red("Not a git repository"));
        throw new Error("Not a git repository");
      }
      spinner.succeed(chalk.green("Git repository OK"));
    } catch (error) {
      spinner.fail(chalk.red("Git check failed"));
      throw new Error(`Git repository check failed: ${error}`);
    }
  }

  async getLastCommits(count: number = this.maxCommits): Promise<GitCommit[]> {
    const spinner = ora(`Fetching ${count} commits...`).start();
    try {
      const log = await this.git.log({ maxCount: count });

      if (log.all.length === 0) {
        spinner.fail(chalk.red("No commits found"));
        throw new Error("No commits found in repository history");
      }

      const commits = log.all.map((commit: any) => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author_name: commit.author_name,
        author_email: commit.author_email,
      }));

      spinner.succeed(chalk.green(`Found ${commits.length} commits`));
      return commits;
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch commits"));
      console.error(chalk.red("Git log error:"), error);
      throw new Error(`Failed to get git history: ${error}`);
    }
  }

  async getCommitsBetween(
    fromCommit: string,
    toCommit: string
  ): Promise<GitCommit[]> {
    const spinner = ora(
      `Fetching commits ${fromCommit.substring(0, 8)}..${toCommit.substring(
        0,
        8
      )}`
    ).start();
    try {
      const log = await this.git.log({ from: `${fromCommit}^`, to: toCommit });

      if (log.all.length === 0) {
        spinner.fail(chalk.red("No commits found in range"));
        throw new Error(`No commits found between ${fromCommit} and ${toCommit}`);
      }

      const commits = log.all.map((commit: any) => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author_name: commit.author_name,
        author_email: commit.author_email,
      }));

      spinner.succeed(chalk.green(`Found ${commits.length} commits in range`));
      return commits;
    } catch (error) {
      spinner.fail(chalk.red("Failed to fetch commits in range"));
      console.error(chalk.red("Git log error:"), error);
      throw new Error(`Failed to get git history between ${fromCommit} and ${toCommit}: ${error}`);
    }
  }

  async getCommitDetails(commits: GitCommit[]): Promise<string[]> {
    const spinner = ora("Analyzing commits...").start();
    const details: string[] = [];

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      spinner.text = `Analyzing ${i + 1}/${commits.length}: ${commit.message.substring(0, 50)}...`;

      try {
        const show = await this.git.show([commit.hash, "--stat", "--format=fuller", "--patch"]);
        const diff = show.length > MAX_COMMIT_DIFF_CHARS ? show.substring(0, MAX_COMMIT_DIFF_CHARS) + "\n...[truncated]\n" : show;

        details.push([
          "--- Code changes (diff) ---",
          diff,
          "---",
        ].join("\n"));
      } catch (error) {
        console.warn(chalk.yellow(`Failed to get details for ${commit.hash.substring(0, 8)}`));
      }
    }

    spinner.succeed(chalk.green(`Analyzed ${details.length} commits`));
    return details;
  }

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

    const commitRangeDesc = this.fromCommit && this.toCommit
      ? `between ${this.fromCommit.substring(0, 8)} and ${this.toCommit.substring(0, 8)}`
      : `last ${commits.length}`;

    console.log(chalk.blue(`\n📝 Processing ${commits.length} commits ${commitRangeDesc}...\n`));

    const commitDetails = await this.getCommitDetails(commits);
    const combinedDetails = commitDetails.join("\n");

  const aiSpinner = ora("Generating release notes...").start();

    const prompt = `
You will generate user-facing release notes in plain Markdown for non-technical end users.

Instructions:
- Read the commit history below and extract only items that matter to an end user of the application.
- Ignore developer-only changes such as: upgrading models or machine-learning artifacts, README or docs updates, CI/workflow changes, test changes, linting/style changes, pure refactors that do not change behavior, and dependency or build-tool bumps unless they directly change user-visible behavior.
- Include only: new features or enhancements users will notice, UI/UX changes, performance improvements that affect users, bug fixes that change observable behavior, and explicit breaking changes that require user action.
- Do not include any duplicates or near-duplicates.
- For each item, write one short, plain-language sentence (no technical jargon), starting with a verb when appropriate (e.g., "Users can now...", "Fixed an issue where...").
- Group items under these headings (omit any empty section):
  ### ⚠️ Breaking Changes
  ### ✨ New Features
  ### 🐛 Bug Fixes
  ### 📝 Other Changes (only include user-relevant things like support for new file types, integrations, or settings that users can change)
- If a section has no items, omit that section entirely. Do not create a section with No x changes in this release.
- If a change is internal or not user-facing, skip it entirely.
- If nothing user-facing is present, return a short note: "No user-facing changes in this release." under the # Release Notes heading.
- Return ONLY Markdown content for the release notes. Do not add explanations, metadata, or commentary.

Git History:
${combinedDetails}

# Release Notes

**Release Date:** ${new Date().toISOString().split("T")[0]}

`;

    try {
      const stream = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{role: "system", content: "You are a helpful assistant that generates release notes from commit messages."},{ role: "user", content: prompt }],
        max_completion_tokens: 16384,
        stream: true,
      });

      aiSpinner.succeed(chalk.green("AI streaming started\n"));
      console.log(chalk.blue("📋 Generated Release Notes:\n"));

      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          process.stdout.write(content);
          fullContent += content;
        }
      }

      if (!fullContent.trim()) throw new Error("No content returned from Azure OpenAI");
      return fullContent.trim();
    } catch (error) {
      console.log(JSON.stringify(error));
      const err = error instanceof Error ? error.message : String(error);
      aiSpinner.fail(chalk.red("AI generation failed"));
      throw new Error(`Failed to generate release notes with AI: ${err}`);
    }
  }
}
