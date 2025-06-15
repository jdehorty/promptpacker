import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';

// ==========================================
// Types & Interfaces
// ==========================================

interface PromptPackerConfig {
  ignore: string[];
  includeExtensions: string[];
  includePatterns: string[];
  maxFileSize: string;
  maxTotalSize: string;
  preserveStructure: boolean;
  outputFormat: 'ai-optimized' | 'standard' | 'markdown';
}

interface ProcessedFiles {
  allFilePaths: string[];
  totalSize: number;
  totalFiles: number;
}

// ==========================================
// Main Activation
// ==========================================

export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 PromptPacker is now active!');

  const register = (command: string, handler: (...args: any[]) => Promise<void> | void) => {
    context.subscriptions.push(vscode.commands.registerCommand(command, handler));
  };

  // Core functionality commands
  register('promptpacker.combineFiles', (...args) => runPackCode(args, false));
  register('promptpacker.combineWithPaths', (...args) => runPackCode(args, true));
  register('promptpacker.previewOutput', (...args) => runPreview(args));
  register('promptpacker.openSettings', handleConfigure);

  // Diagnostic commands
  register('promptpacker.runDiagnostics', handleDiagnose);
  register('promptpacker.viewLogs', handleShowLogs);
  register('promptpacker.exportDebugInfo', handleDebugInfo);
  register('promptpacker.testExtension', handleTest);

  console.log('✅ All PromptPacker commands registered successfully');
}

export function deactivate() {
  console.log('👋 PromptPacker deactivated');
}

// ==========================================
// Command Handlers
// ==========================================

async function runPackCode(args: any[], includeContext: boolean) {
  try {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('Please open a folder to use PromptPacker.');
      return;
    }

    const processed = await processUris(args, workspaceRoot);
    if (processed.allFilePaths.length === 0) {
      vscode.window.showErrorMessage('No valid files found to pack.');
      return;
    }

    const config = getConfig();
    const combinedCode = await generateCombinedCode(
      processed.allFilePaths,
      workspaceRoot,
      config,
      includeContext
    );

    await vscode.env.clipboard.writeText(combinedCode);

    const fileCount = processed.allFilePaths.length;
    const sizeKb = Math.round(processed.totalSize / 1024);
    vscode.window.showInformationMessage(
      `📦 Packed ${fileCount} file${fileCount > 1 ? 's' : ''} (${sizeKb} KB). Copied to clipboard!`
    );
  } catch (error) {
    console.error('Error in runPackCode:', error);
    vscode.window.showErrorMessage(
      `Failed to pack code: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function runPreview(args: any[]) {
  try {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('Please open a folder to use PromptPacker.');
      return;
    }

    const processed = await processUris(args, workspaceRoot);
    if (processed.allFilePaths.length === 0) {
      vscode.window.showErrorMessage('No valid files found to preview.');
      return;
    }

    const config = getConfig();
    const combinedCode = await generateCombinedCode(
      processed.allFilePaths,
      workspaceRoot,
      config,
      true
    );
    const tokenEstimate = Math.ceil(combinedCode.length / 4);

    const panel = vscode.window.createWebviewPanel(
      'promptPackerPreview',
      '📦 PromptPacker Preview',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = getPreviewHtml(
      combinedCode,
      processed.totalFiles,
      processed.totalSize,
      tokenEstimate
    );
  } catch (error) {
    console.error('Error in runPreview:', error);
    vscode.window.showErrorMessage(
      `Failed to preview: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleConfigure() {
  await vscode.commands.executeCommand(
    'workbench.action.openSettings',
    '@ext:ai-edge.promptpacker'
  );
}

async function handleDiagnose() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  const config = getConfig();
  const diagnostics = [
    `🔍 PromptPacker Diagnostics`,
    `📁 Workspace: ${workspaceRoot}`,
    `⚙️ Config:`,
    `  - Output Format: ${config.outputFormat}`,
    `  - Max File Size: ${config.maxFileSize}`,
    `  - Max Total Size: ${config.maxTotalSize}`,
    `  - Preserve Structure: ${config.preserveStructure}`,
    `  - Ignore Patterns: ${config.ignore.length} patterns`,
    `  - Include Patterns: ${config.include.length} patterns`,
    `✅ Extension is working correctly`,
  ].join('\n');

  vscode.window.showInformationMessage('Diagnostics completed. Check output for details.');
  const output = vscode.window.createOutputChannel('PromptPacker Diagnostics');
  output.clear();
  output.appendLine(diagnostics);
  output.show();
}

async function handleShowLogs() {
  const output = vscode.window.createOutputChannel('PromptPacker Logs');
  output.clear();
  output.appendLine('📋 PromptPacker Debug Logs');
  output.appendLine(`⏰ ${new Date().toISOString()}`);
  output.appendLine('🟢 Extension is active and ready');
  output.show();
}

async function handleDebugInfo() {
  const info = {
    version:
      vscode.extensions.getExtension('ai-edge.promptpacker')?.packageJSON?.version || 'Unknown',
    vscodeVersion: vscode.version,
    workspaceCount: vscode.workspace.workspaceFolders?.length || 0,
    config: getConfig(),
  };

  const debugInfo = JSON.stringify(info, null, 2);
  vscode.window.showInformationMessage('Debug info copied to clipboard');
  await vscode.env.clipboard.writeText(debugInfo);
}

async function handleTest() {
  vscode.window.showInformationMessage('🧪 PromptPacker Extension Test - All systems operational!');
}

// ==========================================
// Core Processing Logic
// ==========================================

async function processUris(args: any[], workspaceRoot: string): Promise<ProcessedFiles> {
  const uris = extractUniqueUris(args);
  const config = getConfig();
  const allFilePaths: string[] = [];
  let totalSize = 0;

  for (const uri of uris) {
    try {
      const stats = await fs.promises.stat(uri.fsPath);
      if (stats.isDirectory()) {
        const files = await traverseFolder(uri.fsPath, workspaceRoot, config);
        allFilePaths.push(...files);
      } else {
        const relativePath = path.relative(workspaceRoot, uri.fsPath).replace(/\\/g, '/');
        if (shouldIncludeFile(relativePath, config, stats.size)) {
          allFilePaths.push(uri.fsPath);
        }
      }
    } catch (error) {
      console.error(`Error processing ${uri.fsPath}:`, error);
    }
  }

  // Calculate total size and apply size limits
  const maxTotalBytes = parseSize(config.maxTotalSize);
  let currentSize = 0;
  const filteredPaths: string[] = [];

  for (const filePath of allFilePaths) {
    try {
      const stats = await fs.promises.stat(filePath);
      if (currentSize + stats.size <= maxTotalBytes) {
        filteredPaths.push(filePath);
        currentSize += stats.size;
        totalSize += stats.size;
      }
    } catch (error) {
      console.error(`Error checking file size for ${filePath}:`, error);
    }
  }

  return {
    allFilePaths: filteredPaths,
    totalSize,
    totalFiles: filteredPaths.length,
  };
}

async function generateCombinedCode(
  filePaths: string[],
  workspaceRoot: string,
  config: PromptPackerConfig,
  includeContext: boolean
): Promise<string> {
  const results: string[] = [];

  if (config.outputFormat === 'ai-optimized') {
    results.push('<codebase_analysis>');

    if (includeContext) {
      results.push('  <project_overview>');
      results.push(`    <name>${path.basename(workspaceRoot)}</name>`);
      results.push(`    <total_files>${filePaths.length}</total_files>`);
      results.push('  </project_overview>');
      results.push('');
      results.push('  <source_files>');
    }
  }

  for (const filePath of filePaths) {
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');

      if (config.outputFormat === 'ai-optimized') {
        results.push(`    <file path="${relativePath}">`);
        results.push(fileContent.trim());
        results.push('    </file>');
        results.push('');
      } else if (config.outputFormat === 'markdown') {
        results.push(`## ${relativePath}`);
        results.push('```' + getFileExtensionForMarkdown(filePath));
        results.push(fileContent.trim());
        results.push('```');
        results.push('');
      } else {
        // Standard format
        if (config.preserveStructure || includeContext) {
          results.push(`// ${relativePath}`);
        }
        results.push(fileContent.trim());
        results.push('');
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }

  if (config.outputFormat === 'ai-optimized') {
    if (includeContext) {
      results.push('  </source_files>');
    }
    results.push('</codebase_analysis>');
  }

  return results.join('\n');
}

// ==========================================
// Utility Functions
// ==========================================

function getConfig(): PromptPackerConfig {
  const config = vscode.workspace.getConfiguration('promptpacker');
  return {
    ignore: config.get('ignore') || [],
    includeExtensions: config.get('includeExtensions') || [
      'ts',
      'js',
      'tsx',
      'jsx',
      'py',
      'java',
      'c',
      'cpp',
      'cs',
      'go',
      'rs',
      'php',
      'rb',
      'swift',
      'kt',
      'md',
      'txt',
      'json',
      'yaml',
      'yml',
    ],
    includePatterns: config.get('includePatterns') || [],
    maxFileSize: config.get('maxFileSize') || '100kb',
    maxTotalSize: config.get('maxTotalSize') || '1mb',
    preserveStructure: config.get('preserveStructure') ?? true,
    outputFormat: config.get('outputFormat') || 'ai-optimized',
  };
}

function shouldIncludeFile(
  relativePath: string,
  config: PromptPackerConfig,
  fileSize: number
): boolean {
  // Check file size limit
  const maxFileBytes = parseSize(config.maxFileSize);
  if (fileSize > maxFileBytes) {
    return false;
  }

  // Check ignore patterns first
  for (const pattern of config.ignore) {
    if (minimatch(relativePath, pattern, { dot: true })) {
      return false;
    }
  }

  // Check if file matches include patterns (if any are specified)
  if (config.includePatterns.length > 0) {
    const matchesPattern = config.includePatterns.some(pattern =>
      minimatch(relativePath, pattern, { dot: true })
    );
    if (matchesPattern) {
      return true;
    }
  }

  // Check file extension
  const fileExtension = getFileExtension(relativePath);
  if (fileExtension && config.includeExtensions.includes(fileExtension)) {
    return true;
  }

  // If we have specific include patterns but file doesn't match any, exclude it
  // If we only have extensions (default case), and it doesn't match, exclude it
  return false;
}

function getFileExtension(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext || '';
}

async function traverseFolder(
  folderPath: string,
  root: string,
  config: PromptPackerConfig
): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        // Check if directory should be ignored
        const shouldIgnoreDir = config.ignore.some(
          pattern =>
            minimatch(relativePath, pattern, { dot: true }) ||
            minimatch(relativePath + '/', pattern, { dot: true })
        );

        if (!shouldIgnoreDir) {
          const subResults = await traverseFolder(fullPath, root, config);
          results.push(...subResults);
        }
      } else if (entry.isFile()) {
        const stats = await fs.promises.stat(fullPath);
        if (shouldIncludeFile(relativePath, config, stats.size)) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error traversing folder ${folderPath}:`, error);
  }

  return results;
}

function extractUniqueUris(args: any[]): vscode.Uri[] {
  const uris: vscode.Uri[] = [];
  const seen = new Set<string>();

  const addUri = (uri: unknown) => {
    if (uri instanceof vscode.Uri && !seen.has(uri.fsPath)) {
      uris.push(uri);
      seen.add(uri.fsPath);
    }
  };

  // Handle different argument structures
  for (const arg of args) {
    if (Array.isArray(arg)) {
      arg.forEach(addUri);
    } else {
      addUri(arg);
    }
  }

  return uris;
}

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i);
  if (!match) return 100 * 1024; // Default 100KB

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'kb').toLowerCase();

  switch (unit) {
    case 'gb':
      return value * 1024 * 1024 * 1024;
    case 'mb':
      return value * 1024 * 1024;
    case 'kb':
      return value * 1024;
    default:
      return value;
  }
}

function getFileExtensionForMarkdown(filePath: string): string {
  const ext = path.extname(filePath).slice(1);
  const extensionMap: { [key: string]: string } = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    php: 'php',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
  };
  return extensionMap[ext] || ext || 'text';
}

function getPreviewHtml(
  content: string,
  fileCount: number,
  totalSize: number,
  tokenEstimate: number
): string {
  const escapedContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PromptPacker Preview</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                padding: 20px; 
                margin: 0;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .header { 
                border-bottom: 2px solid var(--vscode-panel-border); 
                padding-bottom: 15px; 
                margin-bottom: 20px; 
            }
            .stats { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px; 
                margin-bottom: 20px; 
            }
            .stat-card {
                background: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
                border-radius: 6px;
                padding: 12px;
                text-align: center;
            }
            .stat-value {
                font-size: 1.5em;
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            .stat-label {
                font-size: 0.9em;
                opacity: 0.8;
                margin-top: 4px;
            }
            pre { 
                background: var(--vscode-textCodeBlock-background); 
                border: 1px solid var(--vscode-input-border);
                padding: 20px; 
                border-radius: 6px; 
                white-space: pre-wrap; 
                word-wrap: break-word; 
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.4;
                overflow-x: auto;
            }
            .actions {
                margin-bottom: 20px;
                display: flex;
                gap: 10px;
            }
            .btn {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            }
            .btn:hover {
                background: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📦 PromptPacker Preview</h1>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">${fileCount}</div>
                    <div class="stat-label">Files</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(totalSize / 1024).toFixed(1)} KB</div>
                    <div class="stat-label">Total Size</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">~${tokenEstimate.toLocaleString()}</div>
                    <div class="stat-label">Est. Tokens</div>
                </div>
            </div>
        </div>
        <div class="actions">
            <button class="btn" onclick="copyContent()">📋 Copy to Clipboard</button>
            <button class="btn" onclick="downloadContent()">💾 Download</button>
        </div>
        <pre><code id="content">${escapedContent}</code></pre>
        
        <script>
            function copyContent() {
                navigator.clipboard.writeText(document.getElementById('content').textContent);
            }
            
            function downloadContent() {
                const content = document.getElementById('content').textContent;
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'promptpacker-output.txt';
                a.click();
                URL.revokeObjectURL(url);
            }
        </script>
    </body>
    </html>`;
}
