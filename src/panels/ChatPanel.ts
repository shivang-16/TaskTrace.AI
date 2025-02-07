import * as vscode from 'vscode';

/**
 * @deprecated This panel implementation is deprecated in favor of the sidebar ChatViewProvider.
 * This class may be removed in a future version. Please use the sidebar chat interface instead.
 */
export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._panel.webview.html = this._getWebviewContent();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'sendQuery':
                        const editor = vscode.window.activeTextEditor;
                        if (!editor) {
                            this._panel.webview.postMessage({ 
                                type: 'error', 
                                message: 'No active editor found' 
                            });
                            return;
                        }
                        const selection = editor.selection;
                        const code = editor.document.getText(selection);
                        if (!code) {
                            this._panel.webview.postMessage({ 
                                type: 'error', 
                                message: 'Please select code first' 
                            });
                            return;
                        }
                        try {
                            this._panel.webview.postMessage({ type: 'loading' });
                            const response = await vscode.commands.executeCommand(
                                'tasktrace.processQuery',
                                code,
                                message.query
                            );
                            this._panel.webview.postMessage({ 
                                type: 'response', 
                                message: response 
                            });
                        } catch (error) {
                            this._panel.webview.postMessage({ 
                                type: 'error', 
                                message: 'Failed to process query' 
                            });
                        }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * @deprecated Please use the sidebar chat interface instead of this floating panel.
     * This method is maintained for backward compatibility but will be removed in a future version.
     */
    public static render() {
        // Show deprecation warning to users
        vscode.window.showWarningMessage('This chat panel is deprecated. Please use the sidebar chat interface for better experience.');
        
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'tasktraceChat',
            'TaskTrace AI Chat',
            vscode.ViewColumn.Two,
            {
                enableScripts: true
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel);
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

    // TODO: This entire class will be removed once the migration to ChatViewProvider is complete
    private dispose() {
        ChatPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
