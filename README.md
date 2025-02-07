# TaskTrace AI

A VS Code extension that uses DeepSeek AI to help you understand, refactor, and optimize your code.

## Features

- Process selected code snippets with AI assistance
- Get explanations, refactoring suggestions, and optimizations
- Simple and intuitive interface
- Supports all programming languages

## Usage

1. Select a code snippet in your editor
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Type "TaskTrace" and select "TaskTrace: Process Snippet"
4. Enter your query (e.g., "explain this code", "optimize this", "refactor this")
5. View the AI-generated response in a new editor window

## Requirements

- VS Code 1.60.0 or higher
- An OpenRouter API key (set in `.env` file)

## Extension Settings

This extension requires the following environment variables:
- `OPENROUTER_API_KEY`: Your OpenRouter API key

## Known Issues

None at the moment.

## Release Notes

### 1.0.0

Initial release of TaskTrace AI:
- Basic code processing functionality
- Integration with DeepSeek AI through OpenRouter
- Support for code explanations, refactoring, and optimization

---

## For more information

* [TaskTrace AI Repository](https://github.com/yourusername/tasktrace-ai)
* [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

**Enjoy!**