#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { writeFileSync } from "fs";
import inquirer from "inquirer";
import { AzureOpenAI } from "openai";
import ora from "ora";
import { join } from "path";
import { simpleGit } from "simple-git";

import { ReleaseNotesGenerator } from "./release-notes-generator.js";

const program = new Command();

interface WizardAnswers {
  apiKey: string;
  endpoint: string;
  fromCommit: string;
  toCommit: string;
  outputMode: "console" | "file";
  outputFile?: string;
}

interface CliOptions {
  apiKey?: string;
  endpoint?: string;
  fromCommit?: string;
  toCommit?: string;
  outputMode?: "console" | "file";
  outputFile?: string;
}

async function getRecentCommits(): Promise<Array<{ name: string; value: string }>> {
  try {
    const git = simpleGit(process.cwd());
    const log = await git.log({ maxCount: 50 });

    return log.all.map((commit) => {
      const shortHash = commit.hash.substring(0, 8);
      const shortMsg = commit.message.substring(0, 60) + (commit.message.length > 60 ? "..." : "");

      let dateLabel = "";
      try {
        const d = new Date(commit.date);
        dateLabel = d.toLocaleString();
      } catch {
        dateLabel = commit.date || "";
      }

      return {
        name: `${shortHash} ${dateLabel} - ${shortMsg} (${commit.author_name})`,
        value: commit.hash,
      };
    });
  } catch (error) {
    return [];
  }
}

async function runWizard(cliOptions: CliOptions = {}): Promise<WizardAnswers> {
  console.log(chalk.blue.bold("🚀 AI Release Notes Generator\n"));
  console.log(chalk.gray("Let's set up your release notes generation...\n"));

  const questions: any[] = [];

  if (!process.env.AZURE_OPENAI_API_KEY && !cliOptions.apiKey) {
    questions.push({
      type: "input",
      name: "apiKey",
      message: "Enter your Azure OpenAI API key:",
      validate: (input: string) => input.length > 0 || "API key is required",
    });
  }

  if (!process.env.AZURE_OPENAI_ENDPOINT && !cliOptions.endpoint) {
    questions.push({
      type: "input",
      name: "endpoint",
      message: "Enter your Azure OpenAI endpoint:",
      validate: (input: string) => input.length > 0 || "Endpoint is required",
    });
  }

  const basicAnswers = await inquirer.prompt(questions);

  let answers: WizardAnswers = {
    apiKey:
      cliOptions.apiKey ||
      basicAnswers.apiKey ||
      process.env.AZURE_OPENAI_API_KEY!,
    endpoint:
      cliOptions.endpoint ||
      basicAnswers.endpoint ||
      process.env.AZURE_OPENAI_ENDPOINT!,
    outputMode: cliOptions.outputMode || "console",
    fromCommit: "",
    toCommit: "",
  };

  if (cliOptions.fromCommit && cliOptions.toCommit) {
    answers.fromCommit = cliOptions.fromCommit;
    answers.toCommit = cliOptions.toCommit;
  } else {
    const spinner = ora("Fetching recent commits...").start();
    const recentCommits = await getRecentCommits();

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

    console.log(chalk.blue("\n📋 Select commit range for release notes generation:\n"));
    console.log(chalk.gray("• First select the OLDER commit (start of range)"));
    console.log(chalk.gray("• Then select the NEWER commit (end of range)"));
    console.log(chalk.gray("• Use arrow keys to navigate, Enter to select\n"));

    const fromAnswer = await inquirer.prompt([
      {
        type: "list",
        name: "fromCommit",
        message: "📍 Select the START (older) commit:",
        choices: recentCommits,
        pageSize: 15,
        loop: false,
      },
    ]);

    const chosenFrom: string = fromAnswer.fromCommit;
    const fromIndex = recentCommits.findIndex((c) => c.value === chosenFrom);
    if (fromIndex === -1) {
      console.log(chalk.red("Invalid starting commit selected."));
      process.exit(1);
    }

    const toChoices = recentCommits.slice(0, fromIndex + 1);

    const toAnswer = await inquirer.prompt([
      {
        type: "list",
        name: "toCommit",
        message: "📍 Select the END (newer) commit:",
        choices: toChoices,
        pageSize: 15,
        loop: false,
      },
    ]);

    answers.fromCommit = chosenFrom;
    answers.toCommit = toAnswer.toCommit;
  }

  if (!cliOptions.outputMode) {
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
  }

  if (answers.outputMode === "file" && !cliOptions.outputFile) {
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
  } else if (cliOptions.outputFile) {
    answers.outputFile = cliOptions.outputFile;
  }

  return answers;
}

async function main(options: CliOptions) {
  try {
    const answers = await runWizard(options);

    console.log(chalk.blue("\n📋 Configuration Summary:"));
    console.log(chalk.gray(`• Commit range:`));
    console.log(chalk.gray(`  └─ From: ${answers.fromCommit?.substring(0, 8)} (older)`));
    console.log(chalk.gray(`  └─ To:   ${answers.toCommit?.substring(0, 8)} (newer)`));

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

    const client = new AzureOpenAI({
      apiKey: answers.apiKey,
      endpoint: answers.endpoint,
      deployment: "gpt-4o-mini",
      apiVersion: "2024-04-01-preview",
    });

    const generatorOptions = {
      client: client,
      fromCommit: answers.fromCommit!,
      toCommit: answers.toCommit!,
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
  .version("2.0.1")
  .option("--api-key <key>", "Azure OpenAI API key")
  .option("--endpoint <url>", "Azure OpenAI endpoint URL")
  .option("--from-commit <hash>", "Starting commit hash (older)")
  .option("--to-commit <hash>", "Ending commit hash (newer)")
  .option("--output-mode <mode>", "Output mode: console or file")
  .option("--output-file <filename>", "Output filename (for file mode)")
  .action((options) => {
    const cliOptions: CliOptions = {
      apiKey: options.apiKey,
      endpoint: options.endpoint,
      fromCommit: options.fromCommit,
      toCommit: options.toCommit,
      outputMode: options.outputMode as "console" | "file",
      outputFile: options.outputFile,
    };
    main(cliOptions);
  });

program.parse();
