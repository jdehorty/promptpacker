import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { FilterConfig, FileMetadata } from '../types';

export class IntelligentFilter {
  private static readonly DEFAULT_EXCLUSIONS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/out/**',
    '**/.git/**',
    '**/.svn/**',
    '**/.hg/**',
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/.cache/**',
    '**/.tmp/**',
    '**/.temp/**',
    '**/*.log',
    '**/*.lock',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml',
    '**/composer.lock',
    '**/Gemfile.lock',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/.vscode/**',
    '**/.idea/**',
    '**/*.sublime-*',
    '**/.env*',
    '**/*.min.js',
    '**/*.min.css',
    '**/*.map',
    '**/*.chunk.*',
    '**/*.bundle.*',
  ];

  private static readonly BINARY_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.ico',
    '.svg',
    '.mp4',
    '.avi',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    '.mp3',
    '.wav',
    '.flac',
    '.aac',
    '.ogg',
    '.ttf',
    '.otf',
    '.woff',
    '.woff2',
    '.eot',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.bz2',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.dmg',
    '.pkg',
    '.deb',
    '.rpm',
    '.db',
    '.sqlite',
    '.sqlite3',
  ];

  private config: FilterConfig;
  private gitignorePatterns: string[] = [];

  constructor(config: FilterConfig) {
    this.config = config;
    if (config.respectGitignore !== false) {
      this.loadGitignorePatterns();
    }
  }

  private loadGitignorePatterns(): void {
    const gitignorePath = path.join(this.config.root, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      this.gitignorePatterns = content
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && !line.startsWith('#'))
        .map((pattern: string) => {
          // Convert gitignore patterns to glob patterns
          if (pattern.endsWith('/')) {
            return `**/${pattern}**`;
          }
          if (pattern.startsWith('/')) {
            return pattern.substring(1);
          }
          return `**/${pattern}`;
        });
    }
  }

  public shouldIncludeFile(filePath: string): { include: boolean; reason?: string } {
    const relativePath = path.relative(this.config.root, filePath);
    const extension = path.extname(filePath).toLowerCase();

    // Check if it's a binary file
    if (IntelligentFilter.BINARY_EXTENSIONS.includes(extension)) {
      return { include: false, reason: 'Binary file' };
    }

    // Check against default exclusions
    for (const pattern of IntelligentFilter.DEFAULT_EXCLUSIONS) {
      if (minimatch(relativePath, pattern)) {
        return { include: false, reason: `Matched default exclusion: ${pattern}` };
      }
    }

    // Check against gitignore patterns
    if (this.config.respectGitignore !== false) {
      for (const pattern of this.gitignorePatterns) {
        if (minimatch(relativePath, pattern)) {
          return { include: false, reason: 'Matched .gitignore pattern' };
        }
      }
    }

    // Check against user-defined ignore patterns
    for (const pattern of this.config.ignore) {
      if (minimatch(relativePath, pattern)) {
        return { include: false, reason: `Matched user ignore: ${pattern}` };
      }
    }

    // Check if file should be explicitly included
    if (this.config.include.length > 0) {
      let matchesInclude = false;
      for (const pattern of this.config.include) {
        if (minimatch(relativePath, pattern)) {
          matchesInclude = true;
          break;
        }
      }
      if (!matchesInclude) {
        return { include: false, reason: 'Did not match include patterns' };
      }
    }

    // Check file size
    const stats = fs.statSync(filePath);
    const maxSizeBytes = this.parseSize(this.config.maxFileSize || '100kb');
    if (stats.size > maxSizeBytes) {
      return { include: false, reason: `File too large: ${this.formatSize(stats.size)}` };
    }

    return { include: true };
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

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  public async analyzeDirectory(
    dirPath: string,
    currentDepth: number = 0
  ): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    if (this.config.maxDepth !== undefined && currentDepth >= this.config.maxDepth) {
      return files;
    }

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const shouldCheck = this.shouldIncludeDirectory(fullPath);
        if (shouldCheck.include) {
          const subFiles = await this.analyzeDirectory(fullPath, currentDepth + 1);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        const metadata = await this.analyzeFile(fullPath);
        files.push(metadata);
      }
    }

    return files;
  }

  private shouldIncludeDirectory(dirPath: string): { include: boolean; reason?: string } {
    const relativePath = path.relative(this.config.root, dirPath);

    // Check against default exclusions
    for (const pattern of IntelligentFilter.DEFAULT_EXCLUSIONS) {
      if (minimatch(relativePath, pattern) || minimatch(`${relativePath}/`, pattern)) {
        return { include: false, reason: `Matched default exclusion: ${pattern}` };
      }
    }

    return { include: true };
  }

  private async analyzeFile(filePath: string): Promise<FileMetadata> {
    const stats = await fs.promises.stat(filePath);
    const relativePath = path.relative(this.config.root, filePath);
    const extension = path.extname(filePath).toLowerCase();
    const shouldInclude = this.shouldIncludeFile(filePath);

    return {
      path: filePath,
      relativePath,
      size: stats.size,
      extension,
      isIncluded: shouldInclude.include,
      exclusionReason: shouldInclude.reason,
    };
  }
}
