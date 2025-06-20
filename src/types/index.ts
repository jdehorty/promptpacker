export interface FilterConfig {
  root: string;
  ignore: string[];
  include: string[];
  maxDepth?: number;
  followSymlinks?: boolean;
  respectGitignore?: boolean;
  maxFileSize?: string;
  maxTotalSize?: string;
}

export interface PromptPackerConfig {
  ignore: string[];
  highPriorityPatterns: string[];
  includeExtensions: string[];
  includePatterns: string[];
  maxFileSize: string;
  maxTotalSize: string;
  preserveStructure: boolean;
  outputFormat: 'ai-optimized' | 'standard' | 'markdown';
  tokenModel:
    | 'gpt-4o'
    | 'o3'
    | 'o3-mini'
    | 'claude-3.7-sonnet'
    | 'claude-4'
    | 'gemini-2.5-pro'
    | 'deepseek-r1'
    | 'estimate';
}

export interface FileMetadata {
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  content?: string;
  informationDensity?: number;
  relevanceScore?: number;
  priority?: number;
  isIncluded: boolean;
  exclusionReason?: string;
}

export interface DirectoryNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  metadata?: FileMetadata;
}

export interface ImportRelationship {
  source: string;
  target: string;
  type: 'import' | 'export' | 'require';
}

export interface ContextMap {
  projectStructure: DirectoryNode[];
  entryPoints: string[];
  importGraph: ImportRelationship[];
  coreFiles: FileMetadata[];
  configFiles: FileMetadata[];
}

export interface ProjectOverview {
  name: string;
  type: string;
  techStack: string[];
  entryPoints: string[];
}

export interface ProcessingResult {
  overview: ProjectOverview;
  contextMap: ContextMap;
  files: FileMetadata[];
  totalSize: number;
  tokenEstimate: number;
  formattedOutput: string;
}

export interface ProcessedFiles {
  allFilePaths: string[];
  totalSize: number;
  totalFiles: number;
  debugInfo?: FileFilterDebugInfo;
  fileTree?: DirectoryNode;
}

export interface FileFilterDebugInfo {
  totalFilesScanned: number;
  includedFiles: Array<{ path: string; reason: string }>;
  excludedFiles: Array<{ path: string; reason: string }>;
  sizeExceededFiles: Array<{ path: string; size: number; maxSize: number }>;
  errors: Array<{ path: string; error: string }>;
}
