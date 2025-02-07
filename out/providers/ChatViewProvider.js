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
exports.ChatViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ChatViewProvider {
    _extensionContext;
    _view;
    constructor(_extensionContext) {
        this._extensionContext = _extensionContext;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionContext.extensionUri
            ]
        };
        webviewView.webview.html = this._getWebviewContent();
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sendQuery':
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        webviewView.webview.postMessage({
                            type: 'error',
                            message: 'No active editor found'
                        });
                        return;
                    }
                    // Code snippet selection is optional. If no code is selected, 
                    // an empty string will be used for the query
                    const selection = editor.selection;
                    const code = editor.document.getText(selection);
                    if (!code) {
                        console.log('No code snippet selected, proceeding with empty code');
                    }
                    try {
                        webviewView.webview.postMessage({ type: 'loading' });
                        const response = await vscode.commands.executeCommand('tasktrace.processQuery', code, message.query);
                        webviewView.webview.postMessage({
                            type: 'response',
                            message: response
                        });
                    }
                    catch (error) {
                        console.error('Error processing query:', error);
                        webviewView.webview.postMessage({
                            type: 'error',
                            message: 'Failed to process query. Please verify your API key, network connection, and ensure proper query format.'
                        });
                    }
                    break;
            }
        });
    }
    _getWebviewContent() {
        try {
            const htmlPath = path.join(this._extensionContext.extensionPath, 'out', 'webview', 'chat-view.html');
            if (!fs.existsSync(htmlPath)) {
                console.error(`HTML file not found at: ${htmlPath}`);
                return this._getErrorContent();
            }
            let html = fs.readFileSync(htmlPath, 'utf-8');
            return html;
        }
        catch (error) {
            console.error('Error loading webview content:', error);
            return this._getErrorContent();
        }
    }
    _getErrorContent() {
        return `
            <!DOCTYPE html>
            <html>
                <body>
                    <p>Error loading the chat view. Please try reloading the window.</p>
                </body>
            </html>
        `;
    }
}
exports.ChatViewProvider = ChatViewProvider;
//# sourceMappingURL=ChatViewProvider.js.map