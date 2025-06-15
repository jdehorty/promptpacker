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
    async (...args: unknown[]) => {
      try {
        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
          vscode.window.showErrorMessage('No workspace folder open');
          return;
        }

        const config = await ConfigLoader.loadConfig(workspaceRoot);
        const validation = ConfigLoader.validateConfig(config);

        if (!validation.valid) {
          vscode.window.showErrorMessage(`Invalid configuration: ${validation.errors.join(', ')}`);
          return;
        }

        const uris = extractUniqueUris(args);
        if (uris.length === 0) {
          vscode.window.showErrorMessage(
            'Please select one or more files or folders to pack for AI prompts.'
          );
          return;
        }

        await processUris(uris, config, workspaceRoot);
      } catch (error) {
        vscode.window.showErrorMessage(
          `PromptPacker error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  // Register pack with context command (for backwards compatibility)
  const packCodeWithContextDisposable = vscode.commands.registerCommand(
    'promptpacker.packCodeWithContext',
    async (...args: unknown[]) => {
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
          }
        );

        panel.webview.html = getPreviewHtml(result, config);
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

function extractUniqueUris(args: unknown[]): vscode.Uri[] {
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

function flattenArray(arr: unknown[]): unknown[] {
  return arr.reduce((acc: unknown[], item: unknown) => {
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

async function traverseFolder(folderPath: string): Promise<string[]> {
  const result: string[] = [];
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isFile()) {
      result.push(fullPath);
    } else if (entry.isDirectory()) {
      const nestedFiles = await traverseFolder(fullPath);
      result.push(...nestedFiles);
    }
  }

  return result;
}

async function processUris(uris: vscode.Uri[], config: PromptPackerConfig, workspaceRoot: string) {
  const processor = new CodebaseProcessor(config, statusBarItem);

  // Process directories and files
  const results = await Promise.all(
    uris.map(async uri => {
      const stat = await fs.promises.stat(uri.fsPath);

      if (stat.isDirectory()) {
        return processor.processDirectory(uri.fsPath, workspaceRoot);
      } else {
        return processor.processFiles([uri.fsPath], workspaceRoot);
      }
    })
  );

  // Merge results
  const mergedResult = results[0]; // For now, just use the first result
  // TODO: Implement proper merging of multiple results

  // Copy to clipboard
  await vscode.env.clipboard.writeText(mergedResult.formattedOutput);

  // Show notification
  const fileCount = mergedResult.files.length;
  const tokenEstimate = mergedResult.tokenEstimate;
  const message = `🚀 PromptPacker: ${fileCount} file${fileCount > 1 ? 's' : ''} packed (~${tokenEstimate.toLocaleString()} tokens) and copied to clipboard!`;

  vscode.window.showInformationMessage(message, 'Preview').then(selection => {
    if (selection === 'Preview') {
      vscode.commands.executeCommand('promptpacker.preview', ...uris);
    }
  });
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
            const content = ${JSON.stringify(result.formattedOutput)};
            navigator.clipboard.writeText(content).then(() => {
                vscode.postMessage({ type: 'copied' });
            });
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
