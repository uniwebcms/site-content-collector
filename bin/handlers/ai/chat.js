// Remove unused imports
import inquirer from "inquirer";
import { Anthropic } from "@anthropic-ai/sdk";
import chalk from "chalk";
import ora from "ora";
import figlet from "figlet";
import path from "path";
import fs from "fs";

import ContextManager from "../ai/context-manager.js";
import ActionHandler from "../ai/action-handler.js";
import ProjectManager from "../ai/project-manager.js";
import ChatPersistence from "../ai/chat-persistence.js";

/**
 * Manages AI-powered chat functionality for Uniweb CLI
 */
export default class AIChatCommand {
  /**
   * Creates a new AIChatCommand instance
   */
  constructor() {
    this.anthropic = null;
    this.contextManager = new ContextManager();
    this.projectManager = new ProjectManager();
    this.actionHandler = new ActionHandler(this.projectManager);
    this.chatHistory = [];
    this.chatPersistence = null; // Initialize later once we have the API key
    this.apiKey = null;
  }

  /**
   * Initialize components needed for the AI chat
   * @returns {Promise<boolean>} True if initialization succeeded
   */
  async initialize() {
    try {
      console.log(
        chalk.cyan(figlet.textSync("Uniweb AI", { horizontalLayout: "full" }))
      );
      console.log(chalk.green("Initializing Uniweb AI assistant..."));

      // Initialize project manager
      const projectInitialized = await this.projectManager.initialize();
      if (!projectInitialized) {
        console.log(
          chalk.yellow("No Uniweb project detected in the current directory.")
        );

        const { shouldCreate } = await inquirer.prompt([
          {
            type: "confirm",
            name: "shouldCreate",
            message:
              "Would you like to create a new Uniweb project in the current directory?",
            default: true,
          },
        ]);

        if (shouldCreate) {
          console.log(chalk.green("Creating project structure..."));
          await this.projectManager.ensureProjectStructure();
          console.log(chalk.green("Project structure created successfully."));
        } else {
          console.log(
            chalk.yellow(
              "You can initialize a project manually with `uniweb init` first."
            )
          );
          return false;
        }
      }

      // Get API key
      this.apiKey = await this.getApiKey();
      if (!this.apiKey) {
        console.log(chalk.red("Could not get a valid API key. Exiting."));
        return false;
      }

      // Initialize chat persistence with API key for intelligent summarization
      this.chatPersistence = new ChatPersistence(process.cwd(), this.apiKey);
      await this.chatPersistence.initialize();

      // Load framework knowledge
      const spinner = ora("Loading Uniweb framework knowledge...").start();
      const contextInitialized = await this.contextManager.initialize();
      spinner.succeed("Uniweb framework knowledge loaded");

      if (!contextInitialized) {
        console.log(
          chalk.yellow(
            "Warning: Framework knowledge could not be fully loaded."
          )
        );
      }

      // Initialize Anthropic client
      this.anthropic = new Anthropic({
        apiKey: this.apiKey,
      });

      return true;
    } catch (error) {
      console.error(chalk.red("Error during initialization:"), error);
      return false;
    }
  }

  /**
   * Get Anthropic API key from environment, config file, or user input
   * @returns {Promise<string|null>} The API key or null if not available
   */
  async getApiKey() {
    try {
      // Check environment variable first
      let apiKey = process.env.ANTHROPIC_API_KEY;

      // Check config file
      if (!apiKey) {
        const configPath = path.join(
          process.env.HOME || process.env.USERPROFILE,
          ".uniweb",
          "config.json"
        );
        try {
          if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
            apiKey = config.anthropicApiKey;
          }
        } catch (err) {
          // Config file doesn't exist or is invalid
          console.warn(
            chalk.yellow("Could not read config file:", err.message)
          );
        }
      }

      // Prompt user if still no API key
      if (!apiKey) {
        const { providedKey } = await inquirer.prompt([
          {
            type: "password",
            name: "providedKey",
            message: "Please enter your Anthropic API key:",
            validate: (input) =>
              input && input.length > 0 ? true : "API key is required",
          },
        ]);

        apiKey = providedKey;

        // Ask if they want to save the key
        const { saveKey } = await inquirer.prompt([
          {
            type: "confirm",
            name: "saveKey",
            message: "Would you like to save this API key for future sessions?",
            default: true,
          },
        ]);

        if (saveKey) {
          const configDir = path.join(
            process.env.HOME || process.env.USERPROFILE,
            ".uniweb"
          );

          if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
          }

          const configPath = path.join(configDir, "config.json");
          const config = fs.existsSync(configPath)
            ? JSON.parse(fs.readFileSync(configPath, "utf8"))
            : {};

          config.anthropicApiKey = apiKey;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(chalk.green("API key saved successfully."));
        }
      }

      return apiKey;
    } catch (error) {
      console.error(chalk.red("Error getting API key:"), error);
      return null;
    }
  }

  /**
   * Start an interactive chat session
   * @param {boolean} useIntelligentSummaries Whether to use AI to summarize long chats
   * @returns {Promise<void>}
   */
  async startChat(useIntelligentSummaries = false) {
    try {
      console.log(
        chalk.green(
          "\nUniwebAI is ready to assist you with your Uniweb project."
        )
      );

      // Use intelligent summaries if requested and possible
      if (useIntelligentSummaries && this.chatPersistence) {
        this.chatPersistence.summarizer =
          this.chatPersistence.summarizer ||
          new IntelligentHistorySummarizer(this.apiKey);
      }

      // Check if there are existing chat sessions
      const sessions = await this.chatPersistence.getAvailableSessions();
      let sessionId;

      if (sessions.length > 0) {
        // Ask user if they want to resume an existing session or start a new one
        const { sessionChoice } = await inquirer.prompt([
          {
            type: "list",
            name: "sessionChoice",
            message: "Would you like to:",
            choices: [
              { name: "Start a new chat session", value: "new" },
              ...sessions.map((s) => ({
                name: `Resume "${s.title}" (${new Date(
                  s.lastUpdated
                ).toLocaleString()})`,
                value: s.id,
              })),
            ],
          },
        ]);

        if (sessionChoice === "new") {
          // Ask for a title for the new session
          const { sessionTitle } = await inquirer.prompt([
            {
              type: "input",
              name: "sessionTitle",
              message: "Enter a title for this chat session:",
              default: `Chat ${sessions.length + 1}`,
            },
          ]);

          sessionId = await this.chatPersistence.createNewSession(sessionTitle);

          // Get the system prompt from the context manager
          const systemPrompt = await this.contextManager.getBasicSystemPrompt();

          // Initialize chat history with system prompt
          this.chatHistory = [{ role: "system", content: systemPrompt }];

          // Save the initial system message
          await this.chatPersistence.saveMessages(this.chatHistory);
        } else {
          // Load existing session
          sessionId = sessionChoice;
          this.chatHistory = await this.chatPersistence.loadSession(sessionId);

          console.log(
            chalk.blue(
              `Resumed chat session. Previous messages: ${
                this.chatHistory.length - 1
              }`
            )
          );

          // If we have too many messages, use a condensed history
          if (this.chatHistory.length > 20) {
            console.log(
              chalk.yellow(
                "This is a long conversation. Using condensed history to stay within token limits."
              )
            );
            this.chatHistory =
              await this.chatPersistence.createCondensedHistory(sessionId);
          }
        }
      } else {
        // No existing sessions, create a new one
        sessionId = await this.chatPersistence.createNewSession("Initial Chat");

        // Get the system prompt from the context manager
        const systemPrompt = await this.contextManager.getBasicSystemPrompt();

        // Initialize chat history with system prompt
        this.chatHistory = [{ role: "system", content: systemPrompt }];

        // Save the initial system message
        await this.chatPersistence.saveMessages(this.chatHistory);
      }

      console.log(
        chalk.blue('Type your questions or commands, or type "exit" to quit.')
      );

      await this.chatLoop();
    } catch (error) {
      console.error(chalk.red("Error in chat session:"), error);
    }
  }

  /**
   * Main chat interaction loop
   * @returns {Promise<void>}
   */
  async chatLoop() {
    try {
      while (true) {
        const { userInput } = await inquirer.prompt([
          {
            type: "input",
            name: "userInput",
            message: chalk.bold("> "),
          },
        ]);

        if (userInput.toLowerCase() === "exit") {
          console.log(chalk.green("Thank you for using UniwebAI. Goodbye!"));
          break;
        }

        await this.handleUserInput(userInput);
      }
    } catch (error) {
      console.error(chalk.red("Error in chat loop:"), error);
    } finally {
      // Clean up any running processes
      this.projectManager.stopDevServer();
    }
  }

  /**
   * Process user input and generate response
   * @param {string} userInput The user's message
   * @returns {Promise<void>}
   */
  async handleUserInput(userInput) {
    try {
      // Update chat history with user message
      this.chatHistory.push({ role: "user", content: userInput });

      // Save the user message to persistence
      if (this.chatPersistence) {
        await this.chatPersistence.saveMessage("user", userInput);
      }

      // Get relevant context for this query
      const relevantContext = await this.contextManager.getRelevantContext(
        userInput
      );

      // Set a new system message with the relevant context
      this.chatHistory[0] = { role: "system", content: relevantContext };

      // Display thinking indicator
      const spinner = ora("Thinking...").start();

      try {
        // Get response from Claude
        const response = await this.anthropic.messages.create({
          model: "claude-3-sonnet-20240229",
          max_tokens: 4000,
          messages: this.chatHistory,
        });

        spinner.stop();

        const assistantMessage = response.content[0].text;

        // Update chat history
        this.chatHistory.push({ role: "assistant", content: assistantMessage });

        // Save the assistant message to persistence
        if (this.chatPersistence) {
          await this.chatPersistence.saveMessage("assistant", assistantMessage);
        }

        // Parse actions from response
        const actions = this.parseActions(assistantMessage);
        const cleanMessage = this.removeActions(assistantMessage);

        // Display the response without action tags
        console.log(chalk.cyan("\nAssistant: ") + cleanMessage);

        // Execute actions if any
        if (actions.length > 0) {
          await this.processActions(actions);
        }

        console.log(""); // Add a blank line for readability
      } catch (error) {
        spinner.stop();
        console.log(chalk.red("Error getting response: ") + error.message);
      }
    } catch (error) {
      console.error(chalk.red("Error handling user input:"), error);
    }
  }

  /**
   * Extract action commands from Claude's response
   * @param {string} message Claude's response message
   * @returns {string[]} Array of action commands
   */
  parseActions(message) {
    const actionRegex = /<action>(.*?)<\/action>/gs;
    const actions = [];
    let match;

    while ((match = actionRegex.exec(message)) !== null) {
      actions.push(match[1]);
    }

    return actions;
  }

  /**
   * Remove action tags from message for clean display
   * @param {string} message The message with action tags
   * @returns {string} Clean message without action tags
   */
  removeActions(message) {
    return message.replace(/<action>.*?<\/action>/gs, "");
  }

  /**
   * Process and execute actions found in Claude's response
   * @param {string[]} actions Array of action commands
   * @returns {Promise<void>}
   */
  async processActions(actions) {
    for (const action of actions) {
      console.log(chalk.yellow("\nDetected action: ") + action);

      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "Do you want to execute this action?",
          default: true,
        },
      ]);

      if (confirm) {
        const actionSpinner = ora("Executing...").start();
        try {
          const result = await this.actionHandler.executeAction(action);
          actionSpinner.stop();

          if (result.success) {
            console.log(chalk.green("Action result: ") + result.result);
          } else {
            console.log(chalk.red("Action failed: ") + result.result);
          }
        } catch (error) {
          actionSpinner.stop();
          console.log(chalk.red("Error executing action: ") + error.message);
        }
      }
    }
  }

  /**
   * Manage saved chat sessions (rename, delete)
   * @returns {Promise<void>}
   */
  async manageSessions() {
    try {
      const sessions = await this.chatPersistence.getAvailableSessions();

      if (sessions.length === 0) {
        console.log(chalk.yellow("No chat sessions found."));
        return;
      }

      console.log(chalk.green("Available chat sessions:"));
      sessions.forEach((session, index) => {
        console.log(chalk.blue(`${index + 1}. ${session.title}`));
        console.log(
          `   Last updated: ${new Date(session.lastUpdated).toLocaleString()}`
        );
        console.log(`   Messages: ${session.messageCount}`);
        console.log(`   ID: ${session.id}`);
        console.log("");
      });

      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "What would you like to do?",
          choices: [
            { name: "Rename a session", value: "rename" },
            { name: "Delete a session", value: "delete" },
            { name: "Exit", value: "exit" },
          ],
        },
      ]);

      if (action === "exit") return;

      const { sessionIndex } = await inquirer.prompt([
        {
          type: "list",
          name: "sessionIndex",
          message: `Select a session to ${action}:`,
          choices: sessions.map((s, i) => ({
            name: `${i + 1}. ${s.title} (${new Date(
              s.lastUpdated
            ).toLocaleString()})`,
            value: i,
          })),
        },
      ]);

      const selectedSession = sessions[sessionIndex];

      if (action === "rename") {
        const { newTitle } = await inquirer.prompt([
          {
            type: "input",
            name: "newTitle",
            message: "Enter a new title:",
            default: selectedSession.title,
          },
        ]);

        await this.chatPersistence.renameSession(selectedSession.id, newTitle);
        console.log(chalk.green(`Session renamed to "${newTitle}"`));
      } else if (action === "delete") {
        const { confirm } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirm",
            message: `Are you sure you want to delete "${selectedSession.title}"?`,
            default: false,
          },
        ]);

        if (confirm) {
          await this.chatPersistence.deleteSession(selectedSession.id);
          console.log(
            chalk.green(`Session "${selectedSession.title}" deleted`)
          );
        }
      }
    } catch (error) {
      console.error(chalk.red("Error managing sessions:"), error);
    }
  }

  /**
   * Register command with the CLI program
   * @param {object} program Commander program instance
   */
  registerCommands(program) {
    program
      .command("chat")
      .description("Start an AI-powered chat for your Uniweb project")
      .option(
        "-i, --intelligent-summaries",
        "Use intelligent AI-powered summarization for long conversations"
      )
      .action(async (options) => {
        const initialized = await this.initialize();
        if (initialized) {
          await this.startChat(options.intelligentSummaries);
        }
      });

    program
      .command("sessions")
      .description("Manage your chat sessions")
      .action(async () => {
        try {
          // Get API key first
          this.apiKey = await this.getApiKey();
          if (!this.apiKey) {
            console.log(chalk.red("Could not get a valid API key. Exiting."));
            return;
          }

          // Initialize just chat persistence
          this.chatPersistence = new ChatPersistence(
            process.cwd(),
            this.apiKey
          );
          await this.chatPersistence.initialize();
          await this.manageSessions();
        } catch (error) {
          console.error(chalk.red("Error in sessions command:"), error);
        }
      });
  }
}
