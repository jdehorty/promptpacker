import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as minimatch from 'minimatch';
import { ConfigLoader } from './core/ConfigLoader';
import { CodebaseProcessor } from './core/CodebaseProcessor';
import { PromptPackerConfig } from './types';
import { logger } from './core/Logger';
import { IntelligentFilter } from './core/IntelligentFilter';

// ==========================================
// Professional Type Definitions
// ==========================================

/**
 * VS Code command arguments can be various types depending on the context
 */
type CommandArgs = vscode.Uri | vscode.Uri[] | unknown;

/**
 * Webview message types for communication between webview and extension
 */
interface WebviewMessage {
  type: 'copied' | 'copyError';
  error?: string;
}

/**
 * File path mapping for URI handling
 */
type UriPathMap = Record<string, vscode.Uri>;

/**
 * Command registration helper type
 */
type CommandHandler = (...args: CommandArgs[]) => Promise<void> | void;

// ==========================================
// Extension State
// ==========================================

let statusBarItem: vscode.StatusBarItem;

// ==========================================
// Main Extension Functions
// ==========================================

export function activate(context: vscode.ExtensionContext): void {
  try {
    logger.info('Extension', 'PromptPacker activation started', {
      extensionId: context.extension.id,
      extensionPath: context.extensionPath,
      version: context.extension.packageJSON.version,
      vsCodeVersion: vscode.version,
      workspaceFolders: vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath),
    });

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(statusBarItem);

    logger.debug('Extension', 'Status bar item created successfully');

    // Register commands with proper typing
    const commands: Record<string, CommandHandler> = {
      'promptpacker.packCode': handlePackCode,
      'promptpacker.packCodeWithContext': handlePackCodeWithContext,
      'promptpacker.configure': handleConfigure,
      'promptpacker.preview': handlePreview,
      'promptpacker.diagnose': handleDiagnose,
      'promptpacker.showLogs': handleShowLogs,
    };

    // Register all commands
    Object.entries(commands).forEach(([commandId, handler]) => {
      const disposable = vscode.commands.registerCommand(commandId, handler);
      context.subscriptions.push(disposable);
    });

    logger.info('Extension', 'PromptPacker activation completed successfully', {
      commandsRegistered: Object.keys(commands).length,
      logFile: logger.getLogFile(),
    });
  } catch (error) {
    logger.error('Extension', 'Critical error during activation', error as Error);
    vscode.window.showErrorMessage(
      `PromptPacker failed to activate: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

// ==========================================
// Command Handlers
// ==========================================

async function handlePackCode(...args: CommandArgs[]): Promise<void> {
  logger.info('Command', 'packCode command executed', { argsLength: args.length });

  try {
    const uris = extractUniqueUris(args);
    logger.debug('Command', 'Extracted URIs from command args', {
      uriCount: uris.length,
      uris: uris.map(u => u.fsPath),
    });

    if (uris.length === 0) {
      const errorMsg = 'Please select one or more files or folders to pack for AI prompts.';
      logger.warn('Command', 'No URIs provided to packCode command');
      vscode.window.showErrorMessage(errorMsg);
      return;
    }

    const filePaths: string[] = [];

    uris.forEach(uri => {
      if (uri instanceof vscode.Uri) {
        try {
          const isDirectory = fs.statSync(uri.fsPath).isDirectory();
          if (isDirectory) {
            logger.debug('Command', 'Processing directory', { path: uri.fsPath });
            const files = traverseFolder(uri.fsPath);
            filePaths.push(...files);
            logger.debug('Command', 'Found files in directory', { count: files.length });
          } else {
            logger.debug('Command', 'Processing file', { path: uri.fsPath });
            filePaths.push(uri.fsPath);
          }
        } catch (error) {
          logger.error('Command', 'Error processing URI', error as Error, {
            uri: uri.fsPath,
          });
          vscode.window.showErrorMessage(
            `Error accessing ${uri.fsPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    });

    if (filePaths.length > 0) {
      logger.info('Command', 'Packing files', { fileCount: filePaths.length });
      await packCodeFiles(filePaths);
    } else {
      const errorMsg = 'No files found in the selected folders.';
      logger.warn('Command', errorMsg);
      vscode.window.showErrorMessage(errorMsg);
    }
  } catch (error) {
    logger.error('Command', 'Error in packCode command', error as Error);
    vscode.window.showErrorMessage(
      `PromptPacker error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handlePackCodeWithContext(...args: CommandArgs[]): Promise<void> {
  logger.info('Command', 'packCodeWithContext command executed (redirecting to packCode)');
  // Same as packCode since new version always preserves context based on config
  await vscode.commands.executeCommand('promptpacker.packCode', ...args);
}

async function handleConfigure(): Promise<void> {
  logger.info('Command', 'configure command executed');

  try {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      const errorMsg = 'No workspace folder open';
      logger.warn('Command', errorMsg);
      vscode.window.showErrorMessage(errorMsg);
      return;
    }

    logger.debug('Command', 'Using workspace root', { workspaceRoot });

    const configPath = path.join(workspaceRoot, '.promptpackerrc');
    logger.debug('Command', 'Config path determined', { configPath });

    if (!fs.existsSync(configPath)) {
      logger.info('Command', 'Config file does not exist, prompting user to create');
      const create = await vscode.window.showInformationMessage(
        'No .promptpackerrc file found. Would you like to create one?',
        'Yes',
        'No'
      );

      if (create === 'Yes') {
        logger.info('Command', 'Creating default config file');
        const defaultConfig = await ConfigLoader.loadConfig(workspaceRoot);
        await ConfigLoader.saveConfig(workspaceRoot, defaultConfig);
        logger.info('Command', 'Config file created successfully');
      } else {
        logger.info('Command', 'User chose not to create config file');
        return;
      }
    }

    const document = await vscode.workspace.openTextDocument(configPath);
    await vscode.window.showTextDocument(document);
    logger.info('Command', 'Config file opened successfully');
  } catch (error) {
    logger.error('Command', 'Error in configure command', error as Error);
    vscode.window.showErrorMessage(
      `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handlePreview(...args: CommandArgs[]): Promise<void> {
  logger.info('Command', 'preview command executed', { argsLength: args.length });

  try {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      const errorMsg = 'No workspace folder open';
      logger.warn('Command', errorMsg);
      vscode.window.showErrorMessage(errorMsg);
      return;
    }

    logger.debug('Command', 'Loading config for preview', { workspaceRoot });
    const config = await ConfigLoader.loadConfig(workspaceRoot);
    const uris = extractUniqueUris(args);

    logger.debug('Command', 'Extracted URIs for preview', {
      uriCount: uris.length,
      uris: uris.map(u => u.fsPath),
    });

    if (uris.length === 0) {
      const errorMsg = 'Please select one or more files or folders to preview.';
      logger.warn('Command', errorMsg);
      vscode.window.showErrorMessage(errorMsg);
      return;
    }

    logger.info('Command', 'Creating processor and processing files');
    const processor = new CodebaseProcessor(config, statusBarItem);
    const filePaths = await expandUris(uris);
    logger.debug('Command', 'Expanded file paths', { fileCount: filePaths.length });

    const result = await processor.processFiles(filePaths, workspaceRoot);
    logger.info('Command', 'Files processed successfully', {
      processedFiles: result.files.length,
      totalSize: result.totalSize,
      tokenEstimate: result.tokenEstimate,
    });

    // Create preview panel
    logger.debug('Command', 'Creating webview panel');
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
    logger.info('Command', 'Preview panel created successfully');

    // Handle webview messages with proper typing
    panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        switch (message.type) {
          case 'copied':
            vscode.window.showInformationMessage('✅ Content copied to clipboard!');
            break;
          case 'copyError':
            vscode.window.showErrorMessage(
              `❌ Failed to copy: ${message.error || 'Unknown error'}`
            );
            break;
        }
      },
      undefined,
      []
    );
  } catch (error) {
    logger.error('Command', 'Error in preview command', error as Error);
    vscode.window.showErrorMessage(
      `PromptPacker preview error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleDiagnose(): Promise<void> {
  logger.info('Command', 'diagnose command executed');
  await runDiagnostics();
}

async function handleShowLogs(): Promise<void> {
  logger.info('Command', 'showLogs command executed');
  await showDebugLogs();
}

// ==========================================
// Utility Functions
// ==========================================

function getWorkspaceRoot(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].uri.fsPath;
  }
  return undefined;
}

async function packCodeFiles(filePaths: string[]): Promise<void> {
  logger.info('PackCode', 'Starting to pack files', { fileCount: filePaths.length });

  try {
    let combinedCode = '';

    filePaths.forEach(filePath => {
      try {
        const relativePath = getRelativePath(filePath);
        logger.debug('PackCode', 'Reading file', { filePath, relativePath });

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const codeSnippet = `// ${relativePath}\n${fileContent.trim()}`;
        combinedCode += `${codeSnippet}\n\n`;

        logger.debug('PackCode', 'File processed successfully', {
          filePath,
          contentLength: fileContent.length,
        });
      } catch (error) {
        logger.error('PackCode', 'Error reading file', error as Error, { filePath });
        // Continue with other files
      }
    });

    await vscode.env.clipboard.writeText(combinedCode);

    const fileCount = filePaths.length;
    const tokenEstimate = Math.ceil(combinedCode.length / 4);
    const message = `🚀 PromptPacker: ${fileCount} file${fileCount > 1 ? 's' : ''} packed (~${tokenEstimate.toLocaleString()} tokens) and copied to clipboard!`;

    logger.info('PackCode', 'Files packed successfully', {
      fileCount,
      totalLength: combinedCode.length,
      tokenEstimate,
    });

    vscode.window.showInformationMessage(message);
  } catch (error) {
    logger.error('PackCode', 'Error packing files', error as Error, { filePaths });
    vscode.window.showErrorMessage(
      'Failed to copy the packed code to the clipboard: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    );
  }
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

function extractUniqueUris(args: unknown[]): vscode.Uri[] {
  const flatArgs = flattenArray(args);
  const uriMap: UriPathMap = {};

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

function isOverriddenByParent(path: string, uriMap: UriPathMap): boolean {
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
  const result: string[] = [];
  const files = fs.readdirSync(folderPath);

  files.forEach((file: string) => {
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

interface PreviewResult {
  formattedOutput: string;
  files: { length: number };
  totalSize: number;
  tokenEstimate: number;
}

function getPreviewHtml(result: PreviewResult, config: PromptPackerConfig): string {
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

async function runDiagnostics(): Promise<void> {
  logger.info('Diagnostics', 'Starting comprehensive diagnostics');

  try {
    const diagnostics: string[] = [];

    // Check VS Code version compatibility
    const vscodeVersion = vscode.version;
    diagnostics.push(`✅ VS Code Version: ${vscodeVersion}`);

    // Check workspace
    const workspaceRoot = getWorkspaceRoot();
    if (workspaceRoot) {
      diagnostics.push(`✅ Workspace Root: ${workspaceRoot}`);

      // Check config loading
      try {
        const config = await ConfigLoader.loadConfig(workspaceRoot);
        diagnostics.push(`✅ Config loaded successfully`);
        diagnostics.push(`   - Output Format: ${config.outputFormat}`);
        diagnostics.push(`   - Ignore Patterns: ${config.ignore.length}`);
        diagnostics.push(`   - Include Patterns: ${config.include.length}`);
        diagnostics.push(`   - Max File Size: ${config.maxFileSize}`);
        diagnostics.push(`   - Max Total Size: ${config.maxTotalSize}`);
      } catch (configError) {
        diagnostics.push(
          `❌ Config loading failed: ${configError instanceof Error ? configError.message : 'Unknown error'}`
        );
      }

      // Test file filtering
      try {
        new IntelligentFilter({
          root: workspaceRoot,
          ignore: ['**/*.test.js'],
          include: ['**/*.ts', '**/*.js'],
          maxFileSize: '100kb',
          respectGitignore: true,
        });
        diagnostics.push(`✅ IntelligentFilter created successfully`);
      } catch (filterError) {
        diagnostics.push(
          `❌ IntelligentFilter creation failed: ${filterError instanceof Error ? filterError.message : 'Unknown error'}`
        );
      }
    } else {
      diagnostics.push(`⚠️  No workspace folder open`);
    }

    // Check log file access
    const logFile = logger.getLogFile();
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      diagnostics.push(`✅ Log file accessible: ${logFile}`);
      diagnostics.push(`   - Size: ${(stats.size / 1024).toFixed(1)} KB`);
      diagnostics.push(`   - Modified: ${stats.mtime.toISOString()}`);
    } else {
      diagnostics.push(`❌ Log file not found: ${logFile}`);
    }

    // Check dependencies
    try {
      // Test minimatch functionality
      const testPattern = minimatch.minimatch('test.js', '*.js');
      diagnostics.push(`✅ minimatch dependency loaded (test: ${testPattern})`);
    } catch (depError) {
      diagnostics.push(
        `❌ minimatch dependency missing: ${depError instanceof Error ? depError.message : 'Unknown error'}`
      );
    }

    // System info
    diagnostics.push(`📊 System Information:`);
    diagnostics.push(`   - Node Version: ${process.version}`);
    diagnostics.push(`   - Platform: ${process.platform}`);
    diagnostics.push(`   - Architecture: ${process.arch}`);
    diagnostics.push(
      `   - Memory Usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`
    );

    const diagnosticReport = diagnostics.join('\n');
    logger.info('Diagnostics', 'Diagnostics completed', { report: diagnosticReport });

    // Show results in a webview
    const panel = vscode.window.createWebviewPanel(
      'promptPackerDiagnostics',
      'PromptPacker Diagnostics',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );

    panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
    <title>PromptPacker Diagnostics</title>
    <style>
        body { font-family: monospace; padding: 20px; line-height: 1.6; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .info { color: #17a2b8; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔧 PromptPacker Diagnostics Report</h1>
    <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    <p><strong>Log File:</strong> ${logFile}</p>
    <hr>
    <pre>${diagnosticReport}</pre>
    <hr>
    <p><em>For detailed logs, use the "Show Debug Logs" command.</em></p>
</body>
</html>`;

    vscode.window.showInformationMessage(
      '✅ Diagnostics completed. Check the report panel for details.'
    );
  } catch (error) {
    logger.error('Diagnostics', 'Error running diagnostics', error as Error);
    vscode.window.showErrorMessage(
      `Diagnostics failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function showDebugLogs(): Promise<void> {
  logger.info('ShowLogs', 'Opening debug logs');

  try {
    const logFile = logger.getLogFile();

    if (!fs.existsSync(logFile)) {
      vscode.window.showWarningMessage(
        'No log file found. Try using the extension first to generate logs.'
      );
      return;
    }

    // Open the log file in VS Code
    const document = await vscode.workspace.openTextDocument(logFile);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(`Debug logs opened: ${logFile}`);
  } catch (error) {
    logger.error('ShowLogs', 'Error opening debug logs', error as Error);
    vscode.window.showErrorMessage(
      `Failed to open logs: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function deactivate() {
  logger.info('Extension', 'PromptPacker deactivation started');

  try {
    if (statusBarItem) {
      statusBarItem.dispose();
      logger.debug('Extension', 'Status bar item disposed');
    }

    logger.info('Extension', 'PromptPacker deactivated successfully');
  } catch (error) {
    logger.error('Extension', 'Error during deactivation', error as Error);
  }
}
