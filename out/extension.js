"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const dotenv = __importStar(require("dotenv"));
const ChatViewProvider_1 = require("./providers/ChatViewProvider");
const generative_ai_1 = require("@google/generative-ai");
dotenv.config();
// Initialize Gemini AI
const genAI = new generative_ai_1.GoogleGenerativeAI('AIzaSyAXlk5CLNI7aeaa6pqsIRQ6bBXlVgIV3HY');
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
async function callGeminiAPI(codeSnippet, query) {
    try {
        console.log("Processing query with Gemini API...");
        console.log(`Query length: ${query.length}, Code snippet length: ${codeSnippet.length}`);
        const prompt = `Code: ${codeSnippet}\nQuery: ${query}`;
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        console.log("Response received from Gemini");
        return response;
    }
    catch (error) {
        const errorMessage = error.message;
        console.error("Error calling Gemini API:", errorMessage);
        return `Error processing request: ${errorMessage}. Please ensure your query is clear and try again.`;
    }
}
function activate(context) {
    // Register the chat view provider
    const chatViewProvider = new ChatViewProvider_1.ChatViewProvider(context);
    const chatView = vscode.window.registerWebviewViewProvider('tasktrace.chatView', chatViewProvider);
    // Register the process query command
    let processCommand = vscode.commands.registerCommand('tasktrace.processQuery', async (code, query) => {
        return await callGeminiAPI(code, query);
    });
    context.subscriptions.push(chatView, processCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map