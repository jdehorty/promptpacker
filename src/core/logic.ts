import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import type {
  PromptPackerConfig,
  ProcessedFiles,
  FileFilterDebugInfo,
  DirectoryNode,
} from '../types';

export async function packCodeFromWorkspace(
  workspaceRoot: string,
  config: PromptPackerConfig
): Promise<ProcessedFiles> {
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

  // Read gitignore patterns and merge with config
  const gitignorePatterns = await readGitignorePatterns(workspaceRoot);
  const enhancedConfig = {
    ...config,
    ignore: [...config.ignore, ...gitignorePatterns],
  };

  try {
    const folderResult = await traverseFolderWithDebug(
      workspaceRoot,
      workspaceRoot,
      enhancedConfig,
      debugInfo
    );
    allFilePaths.push(...folderResult.files);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    debugInfo.errors.push({ path: workspaceRoot, error: errorMsg });
    console.error(`Error processing workspace ${workspaceRoot}:`, error);
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
      } else {
        const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
        debugInfo.sizeExceededFiles.push({
          path: relativePath,
          size: stats.size,
          maxSize: maxTotalBytes - currentSize,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      debugInfo.errors.push({ path: filePath, error: errorMsg });
      console.error(`Error checking file size for ${filePath}:`, error);
    }
  }

  return {
    allFilePaths: filteredPaths,
    totalSize,
    totalFiles: filteredPaths.length,
    debugInfo,
    fileTree: buildFileTree(filteredPaths, workspaceRoot),
  };
}

export async function generateCombinedCode(
  filePaths: string[],
  workspaceRoot: string,
  config: PromptPackerConfig,
  includeContext: boolean = true
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

export async function countTokens(text: string, model: string): Promise<number> {
  try {
    // Import gpt-tokenizer dynamically to handle potential import issues
    const { countTokens: gptCountTokens } = await import('gpt-tokenizer');

    // Use gpt-tokenizer for accurate counting on supported OpenAI models
    // For non-OpenAI models, use GPT tokenization as estimation baseline
    const baseTokenCount = gptCountTokens(text);

    // Apply model-specific adjustments based on 2025 research and benchmarks
    switch (model) {
      case 'gpt-4o':
      case 'o3':
      case 'o3-mini':
        return baseTokenCount; // Direct accurate count for OpenAI models
      case 'claude-3.7-sonnet':
      case 'claude-4':
        // Claude uses BPE with 65K vocab, produces ~16% more tokens than GPT-4o
        return Math.ceil(baseTokenCount * 1.16);
      case 'gemini-2.5-pro':
      case 'gemini-2.0-pro':
        // Gemini uses SentencePiece tokenizer, tends to be more efficient
        return Math.ceil(baseTokenCount * 0.9);
      case 'deepseek-r1':
        // DeepSeek models estimated to use slightly more tokens
        return Math.ceil(baseTokenCount * 1.05);
      case 'estimate':
        return baseTokenCount; // Use GPT tokenization as universal baseline
      default:
        return baseTokenCount; // Fallback to GPT tokenization
    }
  } catch (error) {
    console.warn('gpt-tokenizer failed, falling back to simple estimation:', error);
    return estimateTokensSimple(text);
  }
}

export function shouldIncludeFile(
  relativePath: string,
  config: PromptPackerConfig,
  fileSize: number
): { include: boolean; reason: string } {
  // 1. Check ignore patterns first - this is a hard "no"
  for (const pattern of config.ignore) {
    if (minimatch(relativePath, pattern, { dot: true })) {
      return {
        include: false,
        reason: `Ignored by pattern: "${pattern}"`,
      };
    }
  }

  // 2. Check for high-priority files - these override size limits
  for (const pattern of config.highPriorityPatterns) {
    if (minimatch(relativePath, pattern, { dot: true })) {
      return {
        include: true,
        reason: `High-priority match: "${pattern}"`,
      };
    }
  }

  // 3. Check file size limit after high-priority check
  const maxFileBytes = parseSize(config.maxFileSize);
  if (fileSize > maxFileBytes) {
    return {
      include: false,
      reason: `File size (${(fileSize / 1024).toFixed(1)} KB) exceeds max size (${config.maxFileSize})`,
    };
  }

  // 4. Check if file matches user-defined include patterns
  if (config.includePatterns.length > 0) {
    for (const pattern of config.includePatterns) {
      if (minimatch(relativePath, pattern, { dot: true })) {
        return {
          include: true,
          reason: `Matched include pattern: "${pattern}"`,
        };
      }
    }
  }

  // 5. Check file extension as a fallback
  const fileExtension = getFileExtension(relativePath);
  if (fileExtension && config.includeExtensions.includes(fileExtension)) {
    return {
      include: true,
      reason: `Extension ".${fileExtension}" is in include list`,
    };
  }

  // 6. If none of the inclusion criteria are met, exclude the file
  return {
    include: false,
    reason: `No matching criteria (extension: .${fileExtension || 'none'}, include patterns: ${config.includePatterns.length}, extensions: ${config.includeExtensions.length})`,
  };
}

export function buildFileTree(filePaths: string[], root: string): DirectoryNode {
  const rootNode: DirectoryNode = {
    name: path.basename(root),
    type: 'directory',
    path: '',
    children: [],
  };

  for (const filePath of filePaths) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
    const parts = relativePath.split('/').filter(Boolean); // Remove empty parts
    let currentNode = rootNode;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue; // Skip empty parts

      const isFile = i === parts.length - 1;

      // Ensure children array exists
      currentNode.children ??= [];

      let childNode = currentNode.children.find(c => c.name === part);

      if (!childNode) {
        childNode = {
          name: part,
          type: isFile ? 'file' : 'directory',
          path: parts.slice(0, i + 1).join('/'),
        };
        if (!isFile) {
          childNode.children = [];
        }
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    }
  }

  // Sort children at each level: directories first, then alphabetically
  const sortChildren = (node: DirectoryNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  };

  sortChildren(rootNode);
  return rootNode;
}

// Helper functions

function getDefaultGitignorePatterns(): string[] {
  // Comprehensive default patterns that gitignore would typically ignore
  return [
    // Version control
    '**/.git/**',
    '**/.svn/**',
    '**/.hg/**',

    // Dependencies
    '**/node_modules/**',
    '**/bower_components/**',
    '**/vendor/**',
    '**/.bundle/**',

    // Build outputs
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/target/**',
    '**/*.egg-info/**',
    '**/__pycache__/**',
    '**/.pytest_cache/**',
    '**/coverage/**',
    '**/.nyc_output/**',

    // Compiled files
    '**/*.pyc',
    '**/*.pyo',
    '**/*.pyd',
    '**/*.class',
    '**/*.o',
    '**/*.obj',
    '**/*.exe',
    '**/*.dll',
    '**/*.so',
    '**/*.dylib',

    // Logs and temporary files
    '**/*.log',
    '**/.logs/**',
    '**/tmp/**',
    '**/temp/**',
    '**/.tmp/**',
    '**/.temp/**',

    // OS generated files
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/desktop.ini',

    // Editor/IDE files
    '**/.vscode/**',
    '**/.idea/**',
    '**/.sublime-*',
    '**/*.swp',
    '**/*.swo',
    '**/*~',

    // Environment files
    '**/.env',
    '**/.env.local',
    '**/.env.*.local',

    // Lock files (but keep package-lock.json, yarn.lock for documentation)
    '**/bun.lockb',

    // Cache directories
    '**/.cache/**',
    '**/.parcel-cache/**',
    '**/.next/**',
    '**/.nuxt/**',

    // Testing
    '**/test-results/**',
    '**/playwright-report/**',

    // Claude specific
    '**/.claude/**',
  ];
}

async function readGitignorePatterns(workspaceRoot: string): Promise<string[]> {
  // Always start with robust default patterns
  const defaultPatterns = getDefaultGitignorePatterns();

  const gitignorePath = path.join(workspaceRoot, '.gitignore');

  try {
    const gitignoreContent = await fs.promises.readFile(gitignorePath, 'utf8');
    const filePatterns = gitignoreContent
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith('#')) // Remove empty lines and comments
      .filter((line: string) => !line.startsWith('!')) // Skip negation patterns for now (TODO: implement properly)
      .map((pattern: string) => {
        // Convert gitignore patterns to minimatch patterns
        if (pattern.endsWith('/')) {
          // Directory pattern - match directory and its contents
          const dirPattern = pattern.slice(0, -1); // Remove trailing slash
          return [`**/${dirPattern}/**`, `${dirPattern}/**`];
        } else if (pattern.includes('/')) {
          // Path pattern - use as is
          return pattern;
        } else {
          // File pattern - match anywhere
          return `**/${pattern}`;
        }
      })
      .flat(); // Flatten array since directories create multiple patterns

    // Combine defaults with file patterns (file patterns can override defaults)
    return [...defaultPatterns, ...filePatterns];
  } catch {
    // No gitignore file or can't read it - still use defaults
    return defaultPatterns;
  }
}

function getFileExtension(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext ?? '';
}

async function traverseFolderWithDebug(
  folderPath: string,
  root: string,
  config: PromptPackerConfig,
  debugInfo: FileFilterDebugInfo
): Promise<{ files: string[] }> {
  const results: string[] = [];

  try {
    const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        // Check if directory should be ignored
        let shouldIgnoreDir = false;
        let ignoreReason = '';

        for (const pattern of config.ignore) {
          if (
            minimatch(relativePath, pattern, { dot: true }) ||
            minimatch(relativePath + '/', pattern, { dot: true })
          ) {
            shouldIgnoreDir = true;
            ignoreReason = pattern;
            break;
          }
        }

        if (shouldIgnoreDir) {
          // Count all files in ignored directory for debug info
          const ignoredCount = await countFilesInDirectory(fullPath);
          debugInfo.excludedFiles.push({
            path: relativePath + '/',
            reason: `Directory ignored by pattern: "${ignoreReason}" (${ignoredCount} files skipped)`,
          });
        } else {
          const subResult = await traverseFolderWithDebug(fullPath, root, config, debugInfo);
          results.push(...subResult.files);
        }
      } else if (entry.isFile()) {
        debugInfo.totalFilesScanned++;
        try {
          const stats = await fs.promises.stat(fullPath);
          const decision = shouldIncludeFile(relativePath, config, stats.size);

          if (decision.include) {
            results.push(fullPath);
            debugInfo.includedFiles.push({ path: relativePath, reason: decision.reason });
          } else {
            debugInfo.excludedFiles.push({ path: relativePath, reason: decision.reason });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          debugInfo.errors.push({ path: relativePath, error: errorMsg });
        }
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    debugInfo.errors.push({ path: folderPath, error: `Failed to read directory: ${errorMsg}` });
    console.error(`Error traversing folder ${folderPath}:`, error);
  }

  return { files: results };
}

async function countFilesInDirectory(dirPath: string): Promise<number> {
  let count = 0;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        count++;
      } else if (entry.isDirectory()) {
        count += await countFilesInDirectory(path.join(dirPath, entry.name));
      }
    }
  } catch {
    // Ignore errors when counting
  }
  return count;
}

function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i);
  if (!match?.[1]) return 100 * 1024; // Default 100KB

  const value = parseFloat(match[1]);
  const unit = (match[2] ?? 'kb').toLowerCase();

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
  return extensionMap[ext] ?? ext ?? 'text';
}

function estimateTokensSimple(text: string): number {
  // Fallback estimation when gpt-tokenizer is unavailable
  // Based on empirical analysis: ~3.5 characters per token on average
  return Math.ceil(text.length / 3.5);
}

