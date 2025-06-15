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
  include: string[];
  maxFileSize: string;
  maxTotalSize: string;
  preserveStructure: boolean;
  outputFormat: 'claude-optimized' | 'standard' | 'markdown';
}

export interface FileMetadata {
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  content?: string;
  informationDensity?: number;
  relevanceScore?: number;
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
