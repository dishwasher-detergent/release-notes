#!/usr/bin/env node

import { ReleaseNotesGenerator } from "@knth/release-notes";
import chalk from "chalk";
import { Command } from "commander";
import { writeFileSync } from "fs";
import inquirer from "inquirer";
import { AzureOpenAI } from "openai";
import ora from "ora";
import { join } from "path";
import { simpleGit } from "simple-git";

const program = new Command();

interface WizardAnswers {
  apiKey: string;
  endpoint: string;
  deployment: string;
  commitMode: "last" | "range";
  commitCount?: number;
  fromCommit?: string;
  toCommit?: string;
  outputMode: "console" | "file";
  outputFile?: string;
  repoPath?: string;
}

async function getRecentCommits(
  repoPath?: string
): Promise<Array<{ name: string; value: string }>> {
  try {
    const git = simpleGit(repoPath || process.cwd());
    const log = await git.log({ maxCount: 50 }); // Get more commits for better selection

    return log.all.map((commit) => ({
      name: `${commit.hash.substring(0, 8)} - ${commit.message.substring(
        0,
        60
      )}${commit.message.length > 60 ? "..." : ""} (${commit.author_name})`,
      value: commit.hash,
    }));
  } catch (error) {
    return [];
  }
}

async function runWizard(): Promise<WizardAnswers> {
  console.log(chalk.blue.bold("🚀 AI Release Notes Generator\n"));
  console.log(chalk.gray("Let's set up your release notes generation...\n"));

  const basicAnswers = await inquirer.prompt([
    {
      type: "input",
      name: "apiKey",
      message: "Enter your Azure OpenAI API key:",
      validate: (input: string) => input.length > 0 || "API key is required",
      default: process.env.AZURE_OPENAI_API_KEY,
    },
    {
      type: "input",
      name: "endpoint",
      message: "Enter your Azure OpenAI endpoint:",
      validate: (input: string) => input.length > 0 || "Endpoint is required",
      default: process.env.AZURE_OPENAI_ENDPOINT,
    },
    {
      type: "input",
      name: "deployment",
      message: "Enter your deployment name:",
      validate: (input: string) =>
        input.length > 0 || "Deployment name is required",
      default: "gpt-4o-mini",
    },
    {
      type: "input",
      name: "repoPath",
      message: "Repository path (press Enter for current directory):",
      default: process.cwd(),
    },
    {
      type: "list",
      name: "commitMode",
      message: "How would you like to select commits?",
      choices: [
        { name: "Last N commits", value: "last" },
        { name: "Between two specific commits", value: "range" },
      ],
    },
  ]);

  let answers: WizardAnswers = {
    ...basicAnswers,
    outputMode: "console",
  };

  if (answers.commitMode === "last") {
    const commitCountAnswer = await inquirer.prompt([
      {
        type: "input",
        name: "commitCount",
        message: "How many recent commits to analyze?",
        default: "5",
        validate: (input: string) => {
          const num = parseInt(input);
          return (!isNaN(num) && num > 0) || "Must be a number greater than 0";
        },
      },
    ]);
    answers.commitCount = parseInt(commitCountAnswer.commitCount);
  } else {
    const spinner = ora("Fetching recent commits...").start();
    const recentCommits = await getRecentCommits(answers.repoPath);

    if (recentCommits.length === 0) {
      spinner.fail("Could not fetch commits from repository");
      console.log(
        chalk.red(
          "❌ Unable to fetch commits. Please check that you're in a valid git repository."
        )
      );
      process.exit(1);
    }

    spinner.succeed(`Loaded ${recentCommits.length} commits`);

    console.log(
      chalk.blue("\n📋 Select commit range for release notes generation:\n")
    );
    console.log(chalk.gray("• First select the OLDER commit (start of range)"));
    console.log(chalk.gray("• Then select the NEWER commit (end of range)"));
    console.log(chalk.gray("• Use arrow keys to navigate, Enter to select\n"));

    const commitRange = await inquirer.prompt([
      {
        type: "list",
        name: "fromCommit",
        message: "📍 Select the starting commit (OLDER):",
        choices: recentCommits,
        pageSize: 15,
        loop: false,
      },
      {
        type: "list",
        name: "toCommit",
        message: "📍 Select the ending commit (NEWER):",
        choices: recentCommits,
        pageSize: 15,
        loop: false,
      },
    ]);

    answers.fromCommit = commitRange.fromCommit;
    answers.toCommit = commitRange.toCommit;

    const fromIndex = recentCommits.findIndex(
      (c) => c.value === answers.fromCommit
    );
    const toIndex = recentCommits.findIndex(
      (c) => c.value === answers.toCommit
    );

    if (fromIndex <= toIndex) {
      console.log(
        chalk.yellow(
          "\n⚠ Warning: You selected commits in reverse order. Swapping them..."
        )
      );
      const temp = answers.fromCommit;
      answers.fromCommit = answers.toCommit;
      answers.toCommit = temp;
    }
  }

  const outputOptions = await inquirer.prompt([
    {
      type: "list",
      name: "outputMode",
      message: "Where would you like the output?",
      choices: [
        { name: "Display in console", value: "console" },
        { name: "Save to file", value: "file" },
      ],
    },
  ]);

  answers.outputMode = outputOptions.outputMode;

  if (answers.outputMode === "file") {
    const fileOptions = await inquirer.prompt([
      {
        type: "input",
        name: "outputFile",
        message: "Enter output filename:",
        default: "RELEASE_NOTES.md",
        validate: (input: string) => input.length > 0 || "Filename is required",
      },
    ]);
    answers.outputFile = fileOptions.outputFile;
  }

  return answers;
}

async function main() {
  try {
    const answers = await runWizard();

    console.log(chalk.blue("\n📋 Configuration Summary:"));
    console.log(chalk.gray(`• Deployment: ${answers.deployment}`));
    console.log(chalk.gray(`• Repository: ${answers.repoPath}`));

    if (answers.commitMode === "last") {
      console.log(chalk.gray(`• Commits: Last ${answers.commitCount}`));
    } else {
      console.log(chalk.gray(`• Commit range:`));
      console.log(
        chalk.gray(`  └─ From: ${answers.fromCommit?.substring(0, 8)} (older)`)
      );
      console.log(
        chalk.gray(`  └─ To:   ${answers.toCommit?.substring(0, 8)} (newer)`)
      );
    }

    if (answers.outputMode === "file") {
      console.log(chalk.gray(`• Output: ${answers.outputFile}`));
    } else {
      console.log(chalk.gray(`• Output: Console`));
    }

    const confirm = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: "Proceed with release notes generation?",
        default: true,
      },
    ]);

    if (!confirm.proceed) {
      console.log(chalk.yellow("Operation cancelled."));
      process.exit(0);
    }

    console.log(); // Add spacing

    const client = new AzureOpenAI({
      apiKey: answers.apiKey,
      endpoint: answers.endpoint,
      apiVersion: "2024-10-21",
    });

    const generatorOptions = {
      repoPath: answers.repoPath!,
      client: client,
      deployment: answers.deployment,
      ...(answers.commitMode === "last"
        ? { maxCommits: answers.commitCount! }
        : { fromCommit: answers.fromCommit!, toCommit: answers.toCommit! }),
    };

    const generator = new ReleaseNotesGenerator(generatorOptions);
    const releaseNotes = await generator.generateReleaseNotes();

    if (answers.outputMode === "file") {
      const outputSpinner = ora("Writing to file...").start();
      const outputPath = join(process.cwd(), answers.outputFile!);
      writeFileSync(outputPath, releaseNotes);
      outputSpinner.succeed(
        chalk.green(`Release notes written to: ${chalk.cyan(outputPath)}`)
      );
    }

    console.log(
      chalk.green("\n✅ Release notes generation completed successfully!")
    );
  } catch (error) {
    console.error(
      chalk.red("\n❌ Error:"),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

program
  .name("release-notes")
  .description("Generate release notes based on git history using Azure OpenAI")
  .version("1.0.0")
  .action(main);

program.parse();
