import * as vscode from 'vscode';
import * as dotenv from "dotenv";
import { ChatViewProvider } from './providers/ChatViewProvider';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI('AIzaSyAXlk5CLNI7aeaa6pqsIRQ6bBXlVgIV3HY');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

/**
 * Calls the Gemini AI API with the given code snippet and query
 * @param codeSnippet Optional code snippet from editor selection. Can be empty if no code is selected.
 * @param query User's query text
 * @returns Response from Gemini AI
 * y
 * Note: To include code in your query, select the relevant code in your active editor before sending.
 * If no code is selected, only the query text will be processed.
 */
async function callGeminiAPI(codeSnippet: string, query: string): Promise<string> {
    try {
        console.log("Processing query with Gemini API...");
        console.log(`Query length: ${query.length}, Code snippet length: ${codeSnippet.length}`);
        const prompt = `Code: ${codeSnippet}\nQuery: ${query}`;
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        console.log("Response received from Gemini");
        return response;
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error("Error calling Gemini API:", errorMessage);
        return `Error processing request: ${errorMessage}. Please ensure your query is clear and try again.`;
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
            return await callGeminiAPI(code, query);
    });

    context.subscriptions.push(chatView, processCommand);
}

export function deactivate() {}
