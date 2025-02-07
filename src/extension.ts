import * as vscode from "vscode";
import * as dotenv from "dotenv";
import { ChatViewProvider } from "./providers/ChatViewProvider";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function* callDeepseekAPIStream(codeSnippet: string, query: string) {
  try {
    console.log("Processing query with DeepSeek API...");
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-r1:free",
        messages: [
          {
            role: "user",
            content: `Code: ${codeSnippet}\nQuery: ${query}`
          }
        ],
        stream: true
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
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

async function* callGeminiAPIStream(codeSnippet: string, query: string) {
  try {
    console.log("Processing query with Gemini API...");
    const prompt = `Code: ${codeSnippet}\nQuery: ${query}`;
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
    async (code: string, query: string, model: string) => {
      const webview = chatViewProvider.getWebview();
      if (!webview) {
        console.error("Webview not found");
        return;
      }

      const streamGenerator = model === "deepseek-r1" 
        ? callDeepseekAPIStream(code, query)
        : callGeminiAPIStream(code, query);

      try {
        for await (const chunk of streamGenerator) {
          webview.postMessage({
            type: "chunk",
            message: chunk
          });
        }
        // Signal completion
        webview.postMessage({ type: "complete" });
      } catch (error) {
        webview.postMessage({
          type: "error",
          message: "Error processing stream: " + (error as Error).message
        });
      }
    }
  );

  context.subscriptions.push(chatView, processCommand);
}

export function deactivate() {}
