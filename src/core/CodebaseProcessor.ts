import * as path from 'path';
import * as vscode from 'vscode';
import {
  ProcessingResult,
  FileMetadata,
  DirectoryNode,
  ContextMap,
  ProjectOverview,
  PromptPackerConfig,
} from '../types';
import { IntelligentFilter } from './IntelligentFilter';
import { FileClassifier } from './FileClassifier';
import { OutputFormatter } from './OutputFormatter';

export class CodebaseProcessor {
  private config: PromptPackerConfig;
  private filter: IntelligentFilter;
  private classifier: FileClassifier;
  private formatter: OutputFormatter;
  private statusBarItem: vscode.StatusBarItem;

  constructor(config: PromptPackerConfig, statusBarItem: vscode.StatusBarItem) {
    this.config = config;
    this.classifier = new FileClassifier();
    this.formatter = new OutputFormatter(config);
    this.statusBarItem = statusBarItem;
    this.filter = new IntelligentFilter({
      root: '',
      ignore: config.ignore,
      include: config.include,
      maxFileSize: config.maxFileSize,
      respectGitignore: true,
    });
  }

  public async processFiles(filePaths: string[], workspaceRoot: string): Promise<ProcessingResult> {
    this.statusBarItem.text = '$(sync~spin) PromptPacker: Analyzing files...';
    this.statusBarItem.show();

    try {
      // Update filter with correct root
      this.filter = new IntelligentFilter({
        root: workspaceRoot,
        ignore: this.config.ignore,
        include: this.config.include,
        maxFileSize: this.config.maxFileSize,
        respectGitignore: true,
      });

      // Process all files
      const allFiles: FileMetadata[] = [];

      for (const filePath of filePaths) {
        const files = await this.filter.analyzeDirectory(path.dirname(filePath));
        const targetFile = files.find(f => f.path === filePath);
        if (targetFile) {
          allFiles.push(targetFile);
        }
      }

      // Classify files
      this.statusBarItem.text = '$(sync~spin) PromptPacker: Classifying files...';
      const classifiedFiles = await Promise.all(
        allFiles.map(file => this.classifier.classifyFile(file))
      );

      // Build context map
      const contextMap = this.buildContextMap(classifiedFiles, workspaceRoot);

      // Detect project info
      const projectName = path.basename(workspaceRoot);
      const projectType = FileClassifier.detectProjectType(classifiedFiles);
      const techStack = FileClassifier.detectTechStack(classifiedFiles);
      const entryPoints = this.detectEntryPoints(classifiedFiles);

      const overview: ProjectOverview = {
        name: projectName,
        type: projectType,
        techStack,
        entryPoints,
      };

      // Calculate total size
      let totalSize = 0;
      const includedFiles = classifiedFiles.filter(f => f.isIncluded && f.content);
      includedFiles.forEach(f => {
        totalSize += f.size;
      });

      // Check total size limit
      const maxTotalBytes = this.parseSize(this.config.maxTotalSize);
      if (totalSize > maxTotalBytes) {
        // Sort by relevance and trim
        includedFiles.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

        let currentSize = 0;
        const trimmedFiles = includedFiles.filter(file => {
          if (currentSize + file.size <= maxTotalBytes) {
            currentSize += file.size;
            return true;
          }
          return false;
        });

        const result: ProcessingResult = {
          overview,
          contextMap,
          files: trimmedFiles,
          totalSize: currentSize,
          tokenEstimate: 0,
          formattedOutput: '',
        };

        // Format output
        result.formattedOutput = this.formatter.format(result);
        result.tokenEstimate = this.formatter.estimateTokens(result.formattedOutput);

        return result;
      }

      const result: ProcessingResult = {
        overview,
        contextMap,
        files: includedFiles,
        totalSize,
        tokenEstimate: 0,
        formattedOutput: '',
      };

      // Format output
      this.statusBarItem.text = '$(sync~spin) PromptPacker: Formatting output...';
      result.formattedOutput = this.formatter.format(result);
      result.tokenEstimate = this.formatter.estimateTokens(result.formattedOutput);

      this.statusBarItem.text = `$(check) PromptPacker: ${includedFiles.length} files packed (~${result.tokenEstimate} tokens)`;
      setTimeout(() => this.statusBarItem.hide(), 3000);

      return result;
    } catch (error) {
      this.statusBarItem.text = '$(error) PromptPacker: Processing failed';
      setTimeout(() => this.statusBarItem.hide(), 3000);
      throw error;
    }
  }

  public async processDirectory(dirPath: string, workspaceRoot: string): Promise<ProcessingResult> {
    this.statusBarItem.text = '$(sync~spin) PromptPacker: Scanning directory...';
    this.statusBarItem.show();

    try {
      // Update filter with correct root
      this.filter = new IntelligentFilter({
        root: workspaceRoot,
        ignore: this.config.ignore,
        include: this.config.include,
        maxFileSize: this.config.maxFileSize,
        respectGitignore: true,
      });

      // Analyze directory
      const files = await this.filter.analyzeDirectory(dirPath);

      // Classify files
      this.statusBarItem.text = '$(sync~spin) PromptPacker: Classifying files...';
      const classifiedFiles = await Promise.all(
        files.map(file => this.classifier.classifyFile(file))
      );

      // Continue with same logic as processFiles
      return this.processClassifiedFiles(classifiedFiles, workspaceRoot);
    } catch (error) {
      this.statusBarItem.text = '$(error) PromptPacker: Processing failed';
      setTimeout(() => this.statusBarItem.hide(), 3000);
      throw error;
    }
  }

  private async processClassifiedFiles(
    classifiedFiles: FileMetadata[],
    workspaceRoot: string
  ): Promise<ProcessingResult> {
    // Build context map
    const contextMap = this.buildContextMap(classifiedFiles, workspaceRoot);

    // Detect project info
    const projectName = path.basename(workspaceRoot);
    const projectType = FileClassifier.detectProjectType(classifiedFiles);
    const techStack = FileClassifier.detectTechStack(classifiedFiles);
    const entryPoints = this.detectEntryPoints(classifiedFiles);

    const overview: ProjectOverview = {
      name: projectName,
      type: projectType,
      techStack,
      entryPoints,
    };

    // Calculate total size and filter
    let totalSize = 0;
    const includedFiles = classifiedFiles.filter(f => f.isIncluded && f.content);
    includedFiles.forEach(f => {
      totalSize += f.size;
    });

    // Check total size limit
    const maxTotalBytes = this.parseSize(this.config.maxTotalSize);
    if (totalSize > maxTotalBytes) {
      // Sort by relevance and trim
      includedFiles.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      let currentSize = 0;
      const trimmedFiles = includedFiles.filter(file => {
        if (currentSize + file.size <= maxTotalBytes) {
          currentSize += file.size;
          return true;
        }
        return false;
      });

      totalSize = currentSize;
    }

    const result: ProcessingResult = {
      overview,
      contextMap,
      files: includedFiles,
      totalSize,
      tokenEstimate: 0,
      formattedOutput: '',
    };

    // Format output
    this.statusBarItem.text = '$(sync~spin) PromptPacker: Formatting output...';
    result.formattedOutput = this.formatter.format(result);
    result.tokenEstimate = this.formatter.estimateTokens(result.formattedOutput);

    this.statusBarItem.text = `$(check) PromptPacker: ${includedFiles.length} files packed (~${result.tokenEstimate} tokens)`;
    setTimeout(() => this.statusBarItem.hide(), 3000);

    return result;
  }

  private buildContextMap(files: FileMetadata[], workspaceRoot: string): ContextMap {
    const projectStructure = this.buildDirectoryTree(files, workspaceRoot);
    const configFiles = files.filter(
      f =>
        f.isIncluded &&
        (f.relativePath.includes('config') ||
          f.relativePath === 'package.json' ||
          f.relativePath === 'tsconfig.json' ||
          f.relativePath.endsWith('.json'))
    );

    const coreFiles = files
      .filter(f => f.isIncluded && f.relevanceScore && f.relevanceScore > 0.7)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 10);

    return {
      projectStructure,
      entryPoints: this.detectEntryPoints(files),
      importGraph: [], // Could be enhanced to analyze imports
      coreFiles,
      configFiles,
    };
  }

  private buildDirectoryTree(files: FileMetadata[], rootPath: string): DirectoryNode[] {
    const root: { [key: string]: DirectoryNode } = {};

    files
      .filter(f => f.isIncluded)
      .forEach(file => {
        const parts = file.relativePath.split(path.sep);
        let current = root;

        parts.forEach((part, index) => {
          if (index === parts.length - 1) {
            // File
            current[part] = {
              name: part,
              path: file.path,
              type: 'file',
              metadata: file,
            };
          } else {
            // Directory
            if (!current[part]) {
              current[part] = {
                name: part,
                path: path.join(rootPath, ...parts.slice(0, index + 1)),
                type: 'directory',
                children: [],
              };
            }
            if (!current[part].children) {
              current[part].children = [];
            }
            current = current[part].children as any;
          }
        });
      });

    return this.treeToArray(root);
  }

  private treeToArray(tree: { [key: string]: DirectoryNode }): DirectoryNode[] {
    return Object.values(tree).sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private detectEntryPoints(files: FileMetadata[]): string[] {
    return files
      .filter(
        f =>
          f.isIncluded &&
          f.relativePath.match(
            /^(index|main|app|server|extension|background|content|popup|cli)\.[jt]sx?$/
          )
      )
      .map(f => f.relativePath);
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase() || 'b';

    const multipliers: { [key: string]: number } = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };

    return value * (multipliers[unit] || 1);
  }
}
