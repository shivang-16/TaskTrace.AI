import * as vscode from "vscode";
import * as dotenv from "dotenv";
import { ChatViewProvider } from "./providers/ChatViewProvider";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as path from "path";

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.Gemini_API_KEY!);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function getFileContent(filePath: string): Promise<string> {
  try {
    const document = await vscode.workspace.openTextDocument(filePath);
    return `File: ${path.basename(filePath)}\n\`\`\`\n${document.getText()}\n\`\`\`\n\n`;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return `Error reading file ${path.basename(filePath)}\n`;
  }
}

async function* callDeepseekAPIStream(codeSnippet: string, query: string, selectedFiles: string[] = []) {
  try {
    console.log("Processing query with DeepSeek API...");
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-r1:free",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that responds in two phases: First, provide a planning phase marked with [PLAN] and end it with [PLAN_COMPLETE]. Then, provide the implementation phase marked with [CODE] and end it with [CODE_COMPLETE]."
          },
          {
            role: "user",
            content: codeSnippet.trim().length === 0 
              ? `Query: ${query}`
              : `Code: ${codeSnippet}\nQuery: ${query}`
          }
        ],
        stream: true
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OpenRouter_API_KEY!}`,
          "HTTP-Referer": "vscode-extension",
          "X-Title": "TaskTrace AI",
          "Content-Type": "application/json"
        },
        responseType: 'stream'
      }
    );

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.choices[0]?.delta?.content) {
            yield data.choices[0].delta.content;
          }
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error calling DeepSeek API:", errorMessage);
    yield `Error processing request: ${errorMessage}. Please ensure your query is clear and try again.`;
  }
}

async function* callGeminiAPIStream(codeSnippet: string, query: string, selectedFiles: string[] = []) {
  try {
    console.log("Processing query with Gemini API...");
    let fileContexts = '';
    if (selectedFiles.length > 0) {
      const fileContents = await Promise.all(selectedFiles.map(getFileContent));
      fileContexts = `\nReference Files:\n${fileContents.join('')}`;
    }
    
    const prompt = codeSnippet.trim().length === 0
      ? `You are an AI assistant that provides direct answers.\n\nQuery: ${query}${fileContexts}`
      : `You are an AI assistant that responds in two phases: First, provide a planning phase marked with [PLAN] and end it with [PLAN_COMPLETE]. Then, provide the implementation phase marked with [CODE] and end it with [CODE_COMPLETE].\n\nCode: ${codeSnippet}\nQuery: ${query}${fileContexts}`;
    const result = await geminiModel.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Error calling Gemini API:", errorMessage);
    yield `Error processing request: ${errorMessage}. Please ensure your query is clear and try again.`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const chatViewProvider = new ChatViewProvider(context);
  const chatView = vscode.window.registerWebviewViewProvider(
    "tasktrace.chatView",
    chatViewProvider
  );

  let processCommand = vscode.commands.registerCommand(
    "tasktrace.processQuery",
    async (code: string, query: string, model: string, selectedFiles: string[] = []) => {
      const webview = chatViewProvider.getWebview();
      if (!webview) {
        console.error("Webview not found");
        return;
      }

      const streamGenerator = model === "deepseek-r1" 
        ? callDeepseekAPIStream(code, query, selectedFiles)
        : callGeminiAPIStream(code, query, selectedFiles);

      try {
        let currentPhase: 'plan' | 'code' | null = null;
        let buffer = '';

        for await (const chunk of streamGenerator) {
          buffer += chunk;

          // Check for phase markers
          if (buffer.includes('[PLAN]')) {
            currentPhase = 'plan';
            buffer = buffer.replace('[PLAN]', '');
          } else if (buffer.includes('[CODE]')) {
            currentPhase = 'code';
            buffer = buffer.replace('[CODE]', '');
            // Signal plan phase completion if transitioning to code
            webview.postMessage({ type: 'plan_complete' });
          }

          // Check for phase completion markers
          if (buffer.includes('[PLAN_COMPLETE]')) {
            webview.postMessage({
              type: 'plan_chunk',
              message: buffer.replace('[PLAN_COMPLETE]', '').trim()
            });
            buffer = '';
            continue;
          } else if (buffer.includes('[CODE_COMPLETE]')) {
            webview.postMessage({
              type: 'code_chunk',
              message: buffer.replace('[CODE_COMPLETE]', '').trim()
            });
            buffer = '';
            webview.postMessage({ type: 'code_complete' });
            continue;
          }

          // Send buffered content if we have a current phase
          if (currentPhase && buffer.trim()) {
            webview.postMessage({
              type: `${currentPhase}_chunk`,
              message: buffer
            });
            buffer = '';
          }
        }

        // Handle any remaining buffer content
        if (buffer.trim()) {
          webview.postMessage({
            type: `${currentPhase || 'chunk'}_chunk`,
            message: buffer.trim()
          });
        }
        
        // Signal final completion if not already done
        webview.postMessage({ type: 'code_complete' });
      } catch (error) {
        webview.postMessage({
          type: "error",
          message: "Error processing stream: " + (error as Error).message
        });
      }
    }
  );

  let getRecentFiles = vscode.commands.registerCommand(
    "tasktrace.getRecentFiles",
    async (searchText: string) => {
      try {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          console.log("No active editor found. Handling query without code snippet.");
          // Handle the case where there is no active editor
          return [];
        }

        const document = activeEditor.document;
        let workspaceFolder: vscode.WorkspaceFolder | undefined = vscode.workspace.getWorkspaceFolder(document.uri);

        if (!workspaceFolder || document.isUntitled) {
          return [];
        }

        let workspaceFolderPath: string = workspaceFolder.uri.path;
        let relativeSearchFolderPrefix = path.normalize(path.dirname(document.uri.path) + '/' + searchText);
        relativeSearchFolderPrefix = path.relative(workspaceFolderPath, relativeSearchFolderPrefix);

        let relativePattern: vscode.RelativePattern = new vscode.RelativePattern(
          workspaceFolderPath,
          relativeSearchFolderPrefix + '/**/*.{png,jpeg,jpg,gif}'
        );

        const uris = await vscode.workspace.findFiles(relativePattern, null, 50);
        let relativePaths: string[] = [];

        uris.forEach((uri: vscode.Uri) => {
          relativePaths.push(path.relative(workspaceFolderPath, uri.path));
        });

        console.log(relativePaths, "here are relative paths");
        return relativePaths;
      } catch (error) {
        console.error("Error fetching recent files:", error);
        return [];
      }
    }
  );

  context.subscriptions.push(chatView, processCommand, getRecentFiles);
}

export function deactivate() {}
