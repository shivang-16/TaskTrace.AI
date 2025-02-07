import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionContext: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionContext.extensionUri],
    };

    webviewView.webview.html = this._getWebviewContent();

    // In the onDidReceiveMessage handler:
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "sendQuery":
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            webviewView.webview.postMessage({
              type: "error",
              message: "No active editor found",
            });
            return;
          }
          const selection = editor.selection;
          const code = editor.document.getText(selection);
          try {
            webviewView.webview.postMessage({ type: "loading" });
            await vscode.commands.executeCommand(
              "tasktrace.processQuery",
              code,
              message.query,
              message.model // Make sure this is being passed from the webview
            );
          } catch (error) {
            console.error("Error processing query:", error);
            webviewView.webview.postMessage({
              type: "error",
              message: "Failed to process query. Please verify your API key and ensure proper query format.",
            });
          }
          break;
      }
    });
  }

  private _getWebviewContent() {
    try {
      const htmlPath = path.join(
        this._extensionContext.extensionPath,
        "out",
        "webview",
        "chat-view.html",
      );
      if (!fs.existsSync(htmlPath)) {
        console.error(`HTML file not found at: ${htmlPath}`);
        return this._getErrorContent();
      }
      let html = fs.readFileSync(htmlPath, "utf-8");
      return html;
    } catch (error) {
      console.error("Error loading webview content:", error);
      return this._getErrorContent();
    }
  }

  private _getErrorContent() {
    return `
            <!DOCTYPE html>
            <html>
                <body>
                    <p>Error loading the chat view. Please try reloading the window.</p>
                </body>
            </html>
        `;
  }

  public getWebview(): vscode.Webview | undefined {
    return this._view?.webview;
  }
}
