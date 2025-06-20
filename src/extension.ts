import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  packCodeFromWorkspace,
  generateCombinedCode,
  countTokens,
  shouldIncludeFile,
  buildFileTree,
} from './core/logic';

// ==========================================
// Types & Interfaces
// ==========================================

import type {
  PromptPackerConfig,
  ProcessedFiles,
  FileFilterDebugInfo,
  DirectoryNode,
} from './types';

let lastFilterDebugInfo: FileFilterDebugInfo | undefined;

// ==========================================
// Main Activation
// ==========================================

export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 PromptPacker is now active!');

  const register = (command: string, handler: (...args: any[]) => Promise<void> | void) => {
    context.subscriptions.push(vscode.commands.registerCommand(command, handler));
  };

  // Core functionality commands
  register('promptpacker.combineFiles', (...args) => runPackCode(args, true));
  register('promptpacker.previewOutput', (...args) => runPreview(args));
  register('promptpacker.openSettings', handleConfigure);

  // Diagnostic commands
  register('promptpacker.runDiagnostics', handleDiagnose);
  register('promptpacker.viewLogs', handleShowLogs);
  register('promptpacker.exportDebugInfo', handleDebugInfo);
  register('promptpacker.testExtension', handleTest);
  register('promptpacker.viewLastFilterReport', handleShowLastFilterReport);

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
      // Show detailed debug information
      showDetailedFilteringReport(processed.debugInfo, workspaceRoot);
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
      // Show detailed debug information
      showDetailedFilteringReport(processed.debugInfo, workspaceRoot);
      return;
    }

    const config = getConfig();

    // Generate both formats for the preview
    const aiOptimizedCode = await generateCombinedCode(
      processed.allFilePaths,
      workspaceRoot,
      { ...config, outputFormat: 'ai-optimized' },
      true
    );

    const markdownCode = await generateCombinedCode(
      processed.allFilePaths,
      workspaceRoot,
      { ...config, outputFormat: 'markdown' },
      true
    );

    const tokenEstimate = await countTokens(aiOptimizedCode, config.tokenModel);

    const panel = vscode.window.createWebviewPanel(
      'promptPackerPreview',
      '📦 PromptPacker Preview',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'showInfo':
            vscode.window.showInformationMessage(message.text);
            return;
        }
      },
      undefined,
      undefined
    );

    panel.webview.html = getPreviewHtml(
      aiOptimizedCode,
      markdownCode,
      processed.totalFiles,
      processed.totalSize,
      tokenEstimate,
      processed.fileTree
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
    `  - High Priority Patterns: ${config.highPriorityPatterns.length} patterns`,
    `  - Include Extensions: ${config.includeExtensions.length} extensions`,
    `  - Include Patterns: ${config.includePatterns.length} patterns`,
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

function handleShowLastFilterReport() {
  const workspaceRoot = getWorkspaceRoot() || 'N/A';
  if (!lastFilterDebugInfo) {
    vscode.window.showInformationMessage(
      'No filter report available. Please run a "Pack" or "Preview" command first.'
    );
    return;
  }
  showDetailedFilteringReport(lastFilterDebugInfo, workspaceRoot);
}

// ==========================================
// Core Processing Logic
// ==========================================

async function processUris(args: any[], workspaceRoot: string): Promise<ProcessedFiles> {
  const uris = extractUniqueUris(args);
  const config = getConfig();

  // If no specific URIs provided, process the entire workspace
  if (uris.length === 0) {
    const result = await packCodeFromWorkspace(workspaceRoot, config);
    lastFilterDebugInfo = result.debugInfo;
    return result;
  }

  // Process specific URIs using the original logic but with improved file filtering
  const allFilePaths: string[] = [];
  let totalSize = 0;

  // Initialize debug info
  const debugInfo: FileFilterDebugInfo = {
    totalFilesScanned: 0,
    includedFiles: [],
    excludedFiles: [],
    sizeExceededFiles: [],
    errors: [],
  };

  for (const uri of uris) {
    try {
      const stats = await fs.promises.stat(uri.fsPath);
      if (stats.isDirectory()) {
        // Use the robust core logic for directory processing
        const folderResult = await packCodeFromWorkspace(uri.fsPath, config);
        allFilePaths.push(...folderResult.allFilePaths);

        // Merge debug info
        debugInfo.totalFilesScanned += folderResult.debugInfo?.totalFilesScanned || 0;
        debugInfo.includedFiles.push(...(folderResult.debugInfo?.includedFiles || []));
        debugInfo.excludedFiles.push(...(folderResult.debugInfo?.excludedFiles || []));
        debugInfo.sizeExceededFiles.push(...(folderResult.debugInfo?.sizeExceededFiles || []));
        debugInfo.errors.push(...(folderResult.debugInfo?.errors || []));
      } else {
        debugInfo.totalFilesScanned++;
        const relativePath = path.relative(workspaceRoot, uri.fsPath).replace(/\\/g, '/');
        const decision = shouldIncludeFile(relativePath, config, stats.size);

        if (decision.include) {
          allFilePaths.push(uri.fsPath);
          debugInfo.includedFiles.push({ path: relativePath, reason: decision.reason });
        } else {
          debugInfo.excludedFiles.push({ path: relativePath, reason: decision.reason });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      debugInfo.errors.push({ path: uri.fsPath, error: errorMsg });
      console.error(`Error processing ${uri.fsPath}:`, error);
    }
  }

  // Calculate total size for final result
  for (const filePath of allFilePaths) {
    try {
      const stats = await fs.promises.stat(filePath);
      totalSize += stats.size;
    } catch (error) {
      console.error(`Error getting file size for ${filePath}:`, error);
    }
  }

  // Store the debug info for later retrieval
  lastFilterDebugInfo = debugInfo;

  return {
    allFilePaths,
    totalSize,
    totalFiles: allFilePaths.length,
    debugInfo,
    fileTree: buildFileTree(allFilePaths, workspaceRoot),
  };
}

// ==========================================
// Utility Functions
// ==========================================

function getConfig(): PromptPackerConfig {
  const config = vscode.workspace.getConfiguration('promptpacker');
  return {
    ignore: config.get('ignore') || [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.git/**',
      '**/*.log',
      '**/*.lock',
      '**/coverage/**',
      '**/.env*',
    ],
    highPriorityPatterns: config.get('highPriorityPatterns') || [
      'package.json',
      '**/package.json',
      'tsconfig.json',
      '**/tsconfig.json',
      'vite.config.ts',
      'vite.config.js',
      'vitest.config.ts',
      'vitest.config.js',
      'webpack.config.js',
      'webpack.config.ts',
      'rollup.config.js',
      'rollup.config.ts',
      '**/*config.js',
      '**/*config.ts',
      'README.md',
      '**/README.md',
      '.gitignore',
      '.prettierrc*',
      '.eslintrc*',
      'eslint.config.js',
      'eslint.config.ts',
      'requirements.txt',
      '**/requirements.txt',
      'setup.py',
      'setup.cfg',
      'pyproject.toml',
      'Pipfile',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle',
      '**/Dockerfile',
      '**/docker-compose.yml',
      '.dockerignore',
      'Makefile',
      '**/Makefile',
    ],
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
    tokenModel: config.get('tokenModel') || 'estimate',
  };
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

function showDetailedFilteringReport(
  debugInfo: FileFilterDebugInfo | undefined,
  workspaceRoot: string
) {
  if (!debugInfo) {
    vscode.window.showErrorMessage('No files found to pack. Debug information unavailable.');
    return;
  }

  const output = vscode.window.createOutputChannel('PromptPacker File Filter Report');
  output.clear();
  output.show();

  output.appendLine('🔍 PromptPacker File Filtering Report');
  output.appendLine('=====================================');
  output.appendLine('');
  output.appendLine(`📁 Workspace: ${workspaceRoot}`);
  output.appendLine(`📊 Total files scanned: ${debugInfo.totalFilesScanned}`);
  output.appendLine(`✅ Files included: ${debugInfo.includedFiles.length}`);
  output.appendLine(`❌ Files excluded: ${debugInfo.excludedFiles.length}`);
  output.appendLine(`📏 Files too large: ${debugInfo.sizeExceededFiles.length}`);
  output.appendLine(`⚠️  Errors encountered: ${debugInfo.errors.length}`);
  output.appendLine('');

  // Show excluded files with reasons
  if (debugInfo.excludedFiles.length > 0) {
    output.appendLine('❌ EXCLUDED FILES:');
    output.appendLine('------------------');

    // Group by reason for better readability
    const excludedByReason = new Map<string, string[]>();
    debugInfo.excludedFiles.forEach(file => {
      const files = excludedByReason.get(file.reason) || [];
      files.push(file.path);
      excludedByReason.set(file.reason, files);
    });

    excludedByReason.forEach((files, reason) => {
      output.appendLine(`\n📌 ${reason}`);
      files.slice(0, 10).forEach(file => {
        output.appendLine(`   - ${file}`);
      });
      if (files.length > 10) {
        output.appendLine(`   ... and ${files.length - 10} more`);
      }
    });
  }

  // Show included files
  if (debugInfo.includedFiles.length > 0) {
    output.appendLine('\n✅ INCLUDED FILES:');
    output.appendLine('------------------');
    debugInfo.includedFiles.forEach(file => {
      output.appendLine(`   ✓ ${file.path} (${file.reason})`);
    });
  }

  // Show size exceeded files
  if (debugInfo.sizeExceededFiles.length > 0) {
    output.appendLine('\n📏 FILES EXCEEDING SIZE LIMIT:');
    output.appendLine('------------------------------');
    debugInfo.sizeExceededFiles.forEach(file => {
      output.appendLine(`   - ${file.path} (${(file.size / 1024).toFixed(1)} KB)`);
    });
  }

  // Show errors
  if (debugInfo.errors.length > 0) {
    output.appendLine('\n⚠️  ERRORS:');
    output.appendLine('-----------');
    debugInfo.errors.forEach(error => {
      output.appendLine(`   ! ${error.path}: ${error.error}`);
    });
  }

  // Show helpful configuration info
  output.appendLine('\n💡 CONFIGURATION TIP:');
  output.appendLine('--------------------');
  output.appendLine('To include more files, you can:');
  output.appendLine('1. Open VS Code Settings (Cmd/Ctrl + ,)');
  output.appendLine('2. Search for "PromptPacker"');
  output.appendLine('3. Modify:');
  output.appendLine('   - "Include Extensions" to add more file types');
  output.appendLine('   - "Include Patterns" to add custom glob patterns');
  output.appendLine('   - "Ignore" patterns to exclude fewer files');
  output.appendLine('   - "Max File Size" to allow larger files');
  output.appendLine('');
  output.appendLine('Or use the command: "⚙️ Open PromptPacker Settings"');

  // Show error dialog with summary
  const selection = vscode.window.showErrorMessage(
    `No files to pack! Scanned ${debugInfo.totalFilesScanned} files: ${debugInfo.excludedFiles.length} excluded, ${debugInfo.errors.length} errors. See Output panel for details.`,
    'View Details',
    'Open Settings'
  );

  selection.then(choice => {
    if (choice === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:ai-edge.promptpacker');
    }
  });
}

function getPreviewHtml(
  aiOptimizedContent: string,
  markdownContent: string,
  fileCount: number,
  totalSize: number,
  tokenEstimate: number,
  fileTree?: DirectoryNode
): string {
  const webviewData = {
    aiOptimizedContent,
    markdownContent,
    fileCount,
    totalSize,
    tokenEstimate,
    fileTree,
  };

  // Generate a nonce for CSP
  const nonce = Math.random().toString(36).substring(2, 15);

  // Properly escape the JSON data for HTML context
  const escapedJsonData = JSON.stringify(webviewData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' https://cdnjs.cloudflare.com; style-src 'unsafe-inline' https://cdnjs.cloudflare.com;">
    <title>PromptPacker Preview</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/xml.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/markdown.min.js"></script>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 20px; 
            margin: 0;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .main-container {
            display: flex;
            gap: 20px;
            height: calc(100vh - 230px);
        }
        .header { 
            border-bottom: 2px solid var(--vscode-panel-border); 
            padding-bottom: 15px; 
            margin-bottom: 20px;
            position: sticky;
            top: 0;
            background: var(--vscode-editor-background);
            z-index: 10;
        }
        .header h1 {
            margin-top: 0;
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
        .content-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
        }
        pre { 
            border: 1px solid var(--vscode-input-border);
            margin: 0;
            border-radius: 6px; 
            flex: 1;
            overflow: auto;
            background: var(--vscode-textCodeBlock-background);
        }
        pre code.hljs {
            padding: 20px;
            white-space: pre-wrap; 
            word-wrap: break-word; 
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
            display: block;
            min-height: 100%;
            box-sizing: border-box;
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
        .format-toggle {
            display: flex;
            gap: 5px;
            margin-bottom: 15px;
            background: var(--vscode-input-background);
            padding: 4px;
            border-radius: 6px;
            border: 1px solid var(--vscode-input-border);
        }
        .format-toggle .btn {
            flex-grow: 1;
            background: transparent;
            border: 1px solid transparent;
            margin: 0;
            padding: 8px 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .format-toggle .btn.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .format-toggle .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .file-tree-container {
            width: 300px;
            border-right: 1px solid var(--vscode-panel-border);
            padding-right: 20px;
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
        }
        .file-tree-container h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: var(--vscode-textLink-foreground);
            font-size: 1.1em;
        }
        .file-tree ul {
            list-style-type: none;
            padding-left: 16px;
            margin: 0;
        }
        .file-tree li {
            position: relative;
            padding-left: 20px;
            line-height: 1.6;
            margin: 2px 0;
            color: var(--vscode-editor-foreground);
        }
        .file-tree li::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            border-left: 1px solid var(--vscode-input-border);
        }
        .file-tree li:last-child::before {
            height: 0.8em;
        }
        .file-tree li::after {
            content: '';
            position: absolute;
            left: 0;
            top: 0.8em;
            width: 15px;
            border-top: 1px solid var(--vscode-input-border);
        }
        .file-tree .icon {
            margin-right: 5px;
        }
        .file-tree .file-name {
            color: var(--vscode-editor-foreground);
        }
        .file-tree .directory-name {
            color: var(--vscode-textLink-foreground);
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="header" id="header">
        <h1>📦 PromptPacker Preview</h1>
        <div class="actions" id="actions-bar">
            <button class="btn" onclick="copyContent()">📋 Copy Current View</button>
            <button class="btn" onclick="downloadContent()">💾 Download Current View</button>
        </div>
        <div class="format-toggle" id="format-toggle">
            <button id="btn-ai" class="btn active" onclick="setContent('ai-optimized')">
                🤖 AI-Optimized (XML)
            </button>
            <button id="btn-md" class="btn" onclick="setContent('markdown')">
                📝 Markdown
            </button>
        </div>
        <div class="stats" id="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="stat-files">Loading...</div>
                <div class="stat-label">Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-size">Loading...</div>
                <div class="stat-label">Total Size</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-tokens">Loading...</div>
                <div class="stat-label">Est. Tokens</div>
            </div>
        </div>
    </div>
    
    <div class="main-container">
        <div class="file-tree-container" id="file-tree-root">
            <h3 id="file-tree-title">📁 Included Files</h3>
            <div class="file-tree"></div>
        </div>
        
        <div class="content-area">
            <pre><code id="content" class="language-xml">Loading content...</code></pre>
        </div>
    </div>
    
    <!-- Data is stored here as JSON to avoid template literal issues -->
    <script id="webview-data" type="application/json">
${escapedJsonData}
    </script>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // Parse data from the safe JSON script tag
        const data = JSON.parse(document.getElementById('webview-data').textContent);

        const contentEl = document.getElementById('content');
        const btnAi = document.getElementById('btn-ai');
        const btnMd = document.getElementById('btn-md');
        const treeRootEl = document.querySelector('.file-tree');

        function setContent(format) {
            const content = (format === 'ai-optimized') ? data.aiOptimizedContent : data.markdownContent;
            contentEl.textContent = content;
            contentEl.className = 'hljs language-' + (format === 'markdown' ? 'markdown' : 'xml');
            hljs.highlightElement(contentEl);
            btnAi.classList.toggle('active', format === 'ai-optimized');
            btnMd.classList.toggle('active', format === 'markdown');
        }

        function copyContent() {
            const currentFormat = btnAi.classList.contains('active') ? 'ai-optimized' : 'markdown';
            const content = (currentFormat === 'ai-optimized') ? data.aiOptimizedContent : data.markdownContent;
            navigator.clipboard.writeText(content).then(() => {
                vscode.postMessage({ command: 'showInfo', text: 'Copied to clipboard!' });
            });
        }
        
        function downloadContent() {
            const currentFormat = btnAi.classList.contains('active') ? 'ai-optimized' : 'markdown';
            const content = (currentFormat === 'ai-optimized') ? data.aiOptimizedContent : data.markdownContent;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'promptpacker-output.' + (currentFormat === 'markdown' ? 'md' : 'txt');
            a.click();
            URL.revokeObjectURL(url);
        }

        function buildTree(node, parentElement) {
            if (!node?.children || node.children.length === 0) return;
            
            const ul = document.createElement('ul');
            for (const child of node.children) {
                const li = document.createElement('li');
                const icon = child.type === 'directory' ? '📁' : '📄';
                const nameClass = child.type === 'directory' ? 'directory-name' : 'file-name';
                li.innerHTML = \`<span class="icon">\${icon}</span><span class="\${nameClass}">\${child.name}</span>\`;
                
                if (child.children && child.children.length > 0) {
                    buildTree(child, li);
                }
                ul.appendChild(li);
            }
            parentElement.appendChild(ul);
        }

        // Initialize the page
        document.getElementById('stat-files').textContent = data.fileCount;
        document.getElementById('stat-size').textContent = (data.totalSize / 1024).toFixed(1) + ' KB';
        document.getElementById('stat-tokens').textContent = '~' + data.tokenEstimate.toLocaleString();
        
        // Build file tree if data is available
        if (data.fileTree && data.fileTree.children && data.fileTree.children.length > 0) {
            buildTree(data.fileTree, treeRootEl);
        } else {
            treeRootEl.innerHTML = '<p style="opacity: 0.7; font-style: italic;">No files selected.</p>';
        }
        
        // Set initial content
        setContent('ai-optimized');
    </script>
</body>
</html>`;
}
