import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionContext: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
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
                        const response = await vscode.commands.executeCommand(
                            'tasktrace.processQuery',
                            code,
                            message.query
                        );
                        webviewView.webview.postMessage({ 
                            type: 'response', 
                            message: response 
                        });
                    } catch (error) {
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

    private _getWebviewContent() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        padding: 15px;
                        display: flex;
                        flex-direction: column;
                        height: 95vh;
                    }
                    #chat-container {
                        flex-grow: 1;
                        overflow-y: auto;
                        margin-bottom: 15px;
                        padding: 10px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 5px;
                    }
                    .message {
                        margin: 10px 0;
                        padding: 10px;
                        border-radius: 5px;
                    }
                    .user-message {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-input-border);
                    }
                    .ai-message {
                        background: var(--vscode-editor-selectionBackground);
                        color: var(--vscode-editor-foreground);
                    }
                    .error-message {
                        color: var(--vscode-errorForeground);
                    }
                    #input-container {
                        display: flex;
                        gap: 10px;
                    }
                    #query-input {
                        flex-grow: 1;
                        padding: 8px;
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border-radius: 4px;
                    }
                    button {
                        padding: 8px 16px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .loading {
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                    }
                </style>
            </head>
            <body>
                <div id="chat-container"></div>
                <div id="input-container">
                    <input type="text" id="query-input" placeholder="Type your query here...">
                    <button id="send-button">Send</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const chatContainer = document.getElementById('chat-container');
                    const queryInput = document.getElementById('query-input');
                    const sendButton = document.getElementById('send-button');

                    function addMessage(content, type) {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'message ' + type;
                        messageDiv.textContent = content;
                        chatContainer.appendChild(messageDiv);
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }

                    sendButton.addEventListener('click', () => {
                        const query = queryInput.value.trim();
                        if (query) {
                            addMessage(query, 'user-message');
                            vscode.postMessage({ command: 'sendQuery', query });
                            queryInput.value = '';
                        }
                    });

                    queryInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            sendButton.click();
                        }
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'response':
                                addMessage(message.message, 'ai-message');
                                break;
                            case 'error':
                                addMessage(message.message, 'error-message');
                                break;
                            case 'loading':
                                addMessage('Processing...', 'loading');
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
