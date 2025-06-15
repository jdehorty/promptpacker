import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from './core/ConfigLoader';
import { CodebaseProcessor } from './core/CodebaseProcessor';
import { PromptPackerConfig } from './types';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  context.subscriptions.push(statusBarItem);

  // Register main pack command
  const packCodeDisposable = vscode.commands.registerCommand(
    'promptpacker.packCode',
    (...args: any[]) => {
      const uris = extractUniqueUris(args);
      
      if (uris.length === 0) {
        vscode.window.showErrorMessage('Please select one or more files or folders to pack for AI prompts.');
        return;
      }

      const filePaths: string[] = [];
      
      uris.forEach(uri => {
        if (uri instanceof vscode.Uri) {
          const isDirectory = fs.statSync(uri.fsPath).isDirectory();
          if (isDirectory) {
            const files = traverseFolder(uri.fsPath);
            filePaths.push(...files);
          } else {
            filePaths.push(uri.fsPath);
          }
        }
      });

      if (filePaths.length > 0) {
        packCodeFiles(filePaths);
      } else {
        vscode.window.showErrorMessage('No files found in the selected folders.');
      }
    }
  );

  // Register pack with context command (for backwards compatibility)
  const packCodeWithContextDisposable = vscode.commands.registerCommand(
    'promptpacker.packCodeWithContext',
    (...args: any[]) => {
      // Same as packCode since new version always preserves context based on config
      vscode.commands.executeCommand('promptpacker.packCode', ...args);
    }
  );

  // Register configuration command
  const configureDisposable = vscode.commands.registerCommand(
    'promptpacker.configure',
    async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const configPath = path.join(workspaceRoot, '.promptpackerrc');

      if (!fs.existsSync(configPath)) {
        const create = await vscode.window.showInformationMessage(
          'No .promptpackerrc file found. Would you like to create one?',
          'Yes',
          'No'
        );

        if (create === 'Yes') {
          const defaultConfig = await ConfigLoader.loadConfig(workspaceRoot);
          await ConfigLoader.saveConfig(workspaceRoot, defaultConfig);
        } else {
          return;
        }
      }

      const document = await vscode.workspace.openTextDocument(configPath);
      await vscode.window.showTextDocument(document);
    }
  );

  // Register preview command
  const previewDisposable = vscode.commands.registerCommand(
    'promptpacker.preview',
    async (...args: unknown[]) => {
      try {
        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
          vscode.window.showErrorMessage('No workspace folder open');
          return;
        }

        const config = await ConfigLoader.loadConfig(workspaceRoot);
        const uris = extractUniqueUris(args);

        if (uris.length === 0) {
          vscode.window.showErrorMessage('Please select one or more files or folders to preview.');
          return;
        }

        const processor = new CodebaseProcessor(config, statusBarItem);
        const filePaths = await expandUris(uris);
        const result = await processor.processFiles(filePaths, workspaceRoot);

        // Create preview panel
        const panel = vscode.window.createWebviewPanel(
          'promptPackerPreview',
          'PromptPacker Preview',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            localResourceRoots: [],
            retainContextWhenHidden: true,
          }
        );

        panel.webview.html = getPreviewHtml(result, config);

        // Handle webview messages
        panel.webview.onDidReceiveMessage(
          message => {
            switch (message.type) {
              case 'copied':
                vscode.window.showInformationMessage('✅ Content copied to clipboard!');
                break;
              case 'copyError':
                vscode.window.showErrorMessage(`❌ Failed to copy: ${message.error}`);
                break;
            }
          },
          undefined,
          context.subscriptions
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `PromptPacker preview error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  context.subscriptions.push(
    packCodeDisposable,
    packCodeWithContextDisposable,
    configureDisposable,
    previewDisposable
  );
}

function getWorkspaceRoot(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].uri.fsPath;
  }
  return undefined;
}

function packCodeFiles(filePaths: string[]) {
  let combinedCode = '';

  filePaths.forEach((filePath) => {
    const relativePath = getRelativePath(filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const codeSnippet = `// ${relativePath}\n${fileContent.trim()}`;
    combinedCode += `${codeSnippet}\n\n`;
  });

  vscode.env.clipboard.writeText(combinedCode)
    .then(() => {
      const fileCount = filePaths.length;
      const tokenEstimate = Math.ceil(combinedCode.length / 4); // Simple token estimate
      const message = `🚀 PromptPacker: ${fileCount} file${fileCount > 1 ? 's' : ''} packed (~${tokenEstimate.toLocaleString()} tokens) and copied to clipboard!`;
      vscode.window.showInformationMessage(message);
    })
    .then(undefined, (error) => {
      vscode.window.showErrorMessage('Failed to copy the packed code to the clipboard: ' + error);
    });
}

function getRelativePath(filePath: string): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath;
      if (filePath.startsWith(folderPath)) {
        const relativePath = path.relative(folderPath, filePath).replace(/\\/g, '/');
        return relativePath;
      }
    }
  }
  return filePath;
}

function extractUniqueUris(args: any[]): vscode.Uri[] {
  const flatArgs = flattenArray(args);
  const uriMap: { [path: string]: vscode.Uri } = {};

  flatArgs.forEach(arg => {
    if (arg instanceof vscode.Uri) {
      const path = arg.fsPath;
      if (!isOverriddenByParent(path, uriMap)) {
        uriMap[path] = arg;
      }
    }
  });

  return Object.values(uriMap);
}

function flattenArray(arr: any[]): any[] {
  return arr.reduce((acc: any[], item: any) => {
    return Array.isArray(item) ? acc.concat(flattenArray(item)) : acc.concat(item);
  }, []);
}

function isOverriddenByParent(path: string, uriMap: { [path: string]: vscode.Uri }): boolean {
  for (const existingPath in uriMap) {
    if (path.startsWith(existingPath) && path !== existingPath) {
      return true;
    }
  }
  return false;
}

async function expandUris(uris: vscode.Uri[]): Promise<string[]> {
  const filePaths: string[] = [];

  for (const uri of uris) {
    const stat = await fs.promises.stat(uri.fsPath);

    if (stat.isDirectory()) {
      const files = await traverseFolder(uri.fsPath);
      filePaths.push(...files);
    } else {
      filePaths.push(uri.fsPath);
    }
  }

  return filePaths;
}

function traverseFolder(folderPath: string): string[] {
  let result: string[] = [];
  const files = fs.readdirSync(folderPath);

  files.forEach((file: any) => {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      result.push(filePath);
    } else if (stat.isDirectory()) {
      const nestedFiles = traverseFolder(filePath);
      result.push(...nestedFiles);
    }
  });

  return result;
}



function getPreviewHtml(
  result: {
    formattedOutput: string;
    files: { length: number };
    totalSize: number;
    tokenEstimate: number;
  },
  config: PromptPackerConfig
): string {
  const escapedContent = result.formattedOutput
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>PromptPacker Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: #007acc;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-label {
            font-size: 0.9em;
            color: #666;
        }
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #007acc;
        }
        .content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        pre {
            background: #f8f8f8;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.9em;
            line-height: 1.4;
        }
        .copy-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #007acc;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .copy-button:hover {
            background: #005a9e;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📦 PromptPacker Preview</h1>
        <p>Review your packed code before copying to clipboard</p>
    </div>
    
    <div class="stats">
        <div class="stat">
            <div class="stat-label">Files Included</div>
            <div class="stat-value">${result.files.length}</div>
        </div>
        <div class="stat">
            <div class="stat-label">Total Size</div>
            <div class="stat-value">${(result.totalSize / 1024).toFixed(1)} KB</div>
        </div>
        <div class="stat">
            <div class="stat-label">Token Estimate</div>
            <div class="stat-value">${result.tokenEstimate.toLocaleString()}</div>
        </div>
        <div class="stat">
            <div class="stat-label">Output Format</div>
            <div class="stat-value">${config.outputFormat}</div>
        </div>
    </div>
    
    <div class="content">
        <h2>Output</h2>
        <pre>${escapedContent}</pre>
    </div>
    
    <button class="copy-button" onclick="copyToClipboard()">
        📋 Copy to Clipboard
    </button>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function copyToClipboard() {
            const content = \`${result.formattedOutput.replace(/[\\`$]/g, '\\$&')}\`;
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(content).then(() => {
                    vscode.postMessage({ type: 'copied' });
                }).catch((error) => {
                    console.error('Clipboard copy failed:', error);
                    vscode.postMessage({ type: 'copyError', error: error.message });
                    // Fallback: try to use execCommand
                    fallbackCopyToClipboard(content);
                });
            } else {
                // Fallback for older browsers
                fallbackCopyToClipboard(content);
            }
        }
        
        function fallbackCopyToClipboard(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.width = '2em';
            textArea.style.height = '2em';
            textArea.style.padding = '0';
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';
            textArea.style.background = 'transparent';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    vscode.postMessage({ type: 'copied' });
                } else {
                    vscode.postMessage({ type: 'copyError', error: 'Copy command failed' });
                }
            } catch (err) {
                vscode.postMessage({ type: 'copyError', error: 'Fallback copy failed' });
            }
            
            document.body.removeChild(textArea);
        }
    </script>
</body>
</html>`;
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
