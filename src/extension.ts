import * as vscode from 'vscode';
import axios from 'axios';
import * as dotenv from "dotenv";
import { ChatViewProvider } from './providers/ChatViewProvider';

dotenv.config();
//9QehsnZ1I03qQd9q6iJ9oO7LXxtUgPqCygl2mCKsNHTyu1Mvl4sGJQQJ99BBACAAAAAAAAAAAAASAZDO1CFs
// Function to call DeepSeek API through OpenRouter
async function callDeepSeekAPI(codeSnippet: string, query: string): Promise<string> {
    try {
        console.log("Processing query...");
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: "deepseek/deepseek-r1:free",
            messages: [
              {
                role: "user",
                content: `Code: ${codeSnippet}\nQuery: ${query}`,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer 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`,
              "HTTP-Referer": "vscode-extension",
              "X-Title": "TaskTrace AI",
              "Content-Type": "application/json",
            },
          },
        );
        console.log("Response received:", response.data);
        return response.data.choices[0].message.content;
      } catch (error) {
        console.error("Error calling the API:", (error as Error).message);
        return "Error processing request.";
      }
}

export function activate(context: vscode.ExtensionContext) {
    // Register the chat view provider
    const chatViewProvider = new ChatViewProvider(context);
    const chatView = vscode.window.registerWebviewViewProvider(
        'tasktrace.chatView',
        chatViewProvider
    );

    // Register the process query command
    let processCommand = vscode.commands.registerCommand('tasktrace.processQuery', 
        async (code: string, query: string) => {
            return await callDeepSeekAPI(code, query);
    });

    context.subscriptions.push(chatView, processCommand);
}

export function deactivate() {}
