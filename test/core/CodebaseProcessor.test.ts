import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodebaseProcessor } from '../../src/core/CodebaseProcessor';
import { PromptPackerConfig } from '../../src/types';

// Mock all dependencies
vi.mock('../../src/core/IntelligentFilter');
vi.mock('../../src/core/FileClassifier');
vi.mock('../../src/core/OutputFormatter');

// Mock VS Code status bar
const mockStatusBarItem = {
  text: '',
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
};

describe('CodebaseProcessor', () => {
  let processor: CodebaseProcessor;
  let config: PromptPackerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      ignore: ['**/*.test.ts'],
      include: ['src/**/*.ts'],
      maxFileSize: '100kb',
      maxTotalSize: '1mb',
      preserveStructure: true,
      outputFormat: 'ai-optimized',
    };

    processor = new CodebaseProcessor(config, mockStatusBarItem as any);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(processor).toBeDefined();
      expect(processor['config']).toEqual(config);
      expect(processor['statusBarItem']).toBe(mockStatusBarItem);
    });
  });

  describe('parseSize', () => {
    it('should parse size strings correctly', () => {
      const parseSize = (processor as any).parseSize.bind(processor);
      
      expect(parseSize('100b')).toBe(100);
      expect(parseSize('100kb')).toBe(102400);
      expect(parseSize('1mb')).toBe(1048576);
      expect(parseSize('1gb')).toBe(1073741824);
      expect(parseSize('1.5kb')).toBe(1536);
    });

    it('should throw error for invalid size format', () => {
      const parseSize = (processor as any).parseSize.bind(processor);
      
      expect(() => parseSize('invalid')).toThrow('Invalid size format');
      expect(() => parseSize('')).toThrow('Invalid size format');
      expect(() => parseSize('100xyz')).toThrow('Invalid size format');
    });

    it('should handle case insensitive units', () => {
      const parseSize = (processor as any).parseSize.bind(processor);
      
      expect(parseSize('100KB')).toBe(102400);
      expect(parseSize('1MB')).toBe(1048576);
      expect(parseSize('1GB')).toBe(1073741824);
    });

    it('should default to bytes when no unit specified', () => {
      const parseSize = (processor as any).parseSize.bind(processor);
      
      expect(parseSize('1024')).toBe(1024);
    });
  });

  describe('detectEntryPoints', () => {
    it('should detect common entry point patterns', () => {
      const detectEntryPoints = (processor as any).detectEntryPoints.bind(processor);
      
      const mockFiles = [
        { isIncluded: true, relativePath: 'index.ts' },
        { isIncluded: true, relativePath: 'main.js' },
        { isIncluded: true, relativePath: 'app.tsx' },
        { isIncluded: true, relativePath: 'server.ts' },
        { isIncluded: true, relativePath: 'extension.ts' },
        { isIncluded: true, relativePath: 'background.js' },
        { isIncluded: true, relativePath: 'content.ts' },
        { isIncluded: true, relativePath: 'popup.tsx' },
        { isIncluded: true, relativePath: 'cli.js' },
        { isIncluded: true, relativePath: 'src/helper.ts' }, // Should not match
        { isIncluded: false, relativePath: 'main.ts' }, // Excluded
      ];
      
      const entryPoints = detectEntryPoints(mockFiles);
      
      expect(entryPoints).toContain('index.ts');
      expect(entryPoints).toContain('main.js');
      expect(entryPoints).toContain('app.tsx');
      expect(entryPoints).toContain('server.ts');
      expect(entryPoints).toContain('extension.ts');
      expect(entryPoints).toContain('background.js');
      expect(entryPoints).toContain('content.ts');
      expect(entryPoints).toContain('popup.tsx');
      expect(entryPoints).toContain('cli.js');
      expect(entryPoints).not.toContain('src/helper.ts');
      expect(entryPoints).not.toContain('main.ts'); // Excluded
    });

    it('should return empty array when no entry points found', () => {
      const detectEntryPoints = (processor as any).detectEntryPoints.bind(processor);
      
      const mockFiles = [
        { isIncluded: true, relativePath: 'src/utils.ts' },
        { isIncluded: true, relativePath: 'src/components/Button.tsx' },
      ];
      
      const entryPoints = detectEntryPoints(mockFiles);
      expect(entryPoints).toEqual([]);
    });
  });

  describe('buildContextMap', () => {
    it('should build context map with project structure', () => {
      const buildContextMap = (processor as any).buildContextMap.bind(processor);
      
      const mockFiles = [
        {
          isIncluded: true,
          relativePath: 'index.ts',
          path: '/test/index.ts',
          relevanceScore: 0.9,
        },
        {
          isIncluded: true,
          relativePath: 'package.json',
          path: '/test/package.json',
          relevanceScore: 0.9,
        },
        {
          isIncluded: true,
          relativePath: 'tsconfig.json',
          path: '/test/tsconfig.json',
          relevanceScore: 0.7,
        },
        {
          isIncluded: true,
          relativePath: 'src/utils.ts',
          path: '/test/src/utils.ts',
          relevanceScore: 0.5,
        },
      ];
      
      const contextMap = buildContextMap(mockFiles, '/test');
      
      expect(contextMap.projectStructure).toBeDefined();
      expect(contextMap.entryPoints).toContain('index.ts');
      expect(contextMap.configFiles).toHaveLength(2); // package.json, tsconfig.json
      expect(contextMap.coreFiles).toHaveLength(2); // Files with relevance > 0.7
      expect(contextMap.importGraph).toEqual([]); // Empty for now
    });

    it('should identify config files correctly', () => {
      const buildContextMap = (processor as any).buildContextMap.bind(processor);
      
      const mockFiles = [
        {
          isIncluded: true,
          relativePath: 'package.json',
          path: '/test/package.json',
        },
        {
          isIncluded: true,
          relativePath: 'tsconfig.json',
          path: '/test/tsconfig.json',
        },
        {
          isIncluded: true,
          relativePath: 'src/config.ts',
          path: '/test/src/config.ts',
        },
        {
          isIncluded: true,
          relativePath: 'vite.config.ts',
          path: '/test/vite.config.ts',
        },
        {
          isIncluded: true,
          relativePath: 'src/app.ts',
          path: '/test/src/app.ts',
        },
      ];
      
      const contextMap = buildContextMap(mockFiles, '/test');
      
      expect(contextMap.configFiles).toHaveLength(4);
      expect(contextMap.configFiles.map(f => f.relativePath)).toContain('package.json');
      expect(contextMap.configFiles.map(f => f.relativePath)).toContain('tsconfig.json');
      expect(contextMap.configFiles.map(f => f.relativePath)).toContain('src/config.ts');
      expect(contextMap.configFiles.map(f => f.relativePath)).toContain('vite.config.ts');
      expect(contextMap.configFiles.map(f => f.relativePath)).not.toContain('src/app.ts');
    });

    it('should limit core files to top 10 by relevance', () => {
      const buildContextMap = (processor as any).buildContextMap.bind(processor);
      
      // Create 15 files with high relevance
      const mockFiles = Array.from({ length: 15 }, (_, i) => ({
        isIncluded: true,
        relativePath: `src/file${i}.ts`,
        path: `/test/src/file${i}.ts`,
        relevanceScore: 0.8 + (i * 0.01), // Varying relevance scores
      }));
      
      const contextMap = buildContextMap(mockFiles, '/test');
      
      expect(contextMap.coreFiles).toHaveLength(10);
      // Should be sorted by relevance (highest first)
      expect(contextMap.coreFiles[0].relevanceScore).toBeGreaterThan(contextMap.coreFiles[9].relevanceScore);
    });
  });

  describe('buildDirectoryTree', () => {
    it('should build directory tree structure', () => {
      const buildDirectoryTree = (processor as any).buildDirectoryTree.bind(processor);
      
      const mockFiles = [
        {
          isIncluded: true,
          relativePath: 'src/index.ts',
          path: '/test/src/index.ts',
        },
        {
          isIncluded: true,
          relativePath: 'src/components/Button.tsx',
          path: '/test/src/components/Button.tsx',
        },
        {
          isIncluded: true,
          relativePath: 'README.md',
          path: '/test/README.md',
        },
        {
          isIncluded: false,
          relativePath: 'dist/bundle.js',
          path: '/test/dist/bundle.js',
        },
      ];
      
      const tree = buildDirectoryTree(mockFiles, '/test');
      
      // Should exclude non-included files
      expect(tree).toHaveLength(2); // src directory and README.md file
      
      // Find src directory
      const srcDir = tree.find(node => node.name === 'src');
      expect(srcDir).toBeDefined();
      expect(srcDir?.type).toBe('directory');
      expect(srcDir?.children).toBeDefined();
      
      // Find README file
      const readmeFile = tree.find(node => node.name === 'README.md');
      expect(readmeFile).toBeDefined();
      expect(readmeFile?.type).toBe('file');
    });

    it('should sort directories before files', () => {
      const treeToArray = (processor as any).treeToArray.bind(processor);
      
      const mockTree = {
        'file.txt': { name: 'file.txt', type: 'file' },
        'directory': { name: 'directory', type: 'directory' },
        'another-file.js': { name: 'another-file.js', type: 'file' },
        'another-dir': { name: 'another-dir', type: 'directory' },
      };
      
      const sorted = treeToArray(mockTree);
      
      expect(sorted[0].type).toBe('directory');
      expect(sorted[1].type).toBe('directory');
      expect(sorted[2].type).toBe('file');
      expect(sorted[3].type).toBe('file');
    });

    it('should sort alphabetically within same type', () => {
      const treeToArray = (processor as any).treeToArray.bind(processor);
      
      const mockTree = {
        'z-file.txt': { name: 'z-file.txt', type: 'file' },
        'a-file.txt': { name: 'a-file.txt', type: 'file' },
        'b-dir': { name: 'b-dir', type: 'directory' },
        'a-dir': { name: 'a-dir', type: 'directory' },
      };
      
      const sorted = treeToArray(mockTree);
      
      expect(sorted[0].name).toBe('a-dir');
      expect(sorted[1].name).toBe('b-dir');
      expect(sorted[2].name).toBe('a-file.txt');
      expect(sorted[3].name).toBe('z-file.txt');
    });
  });

  describe('status bar updates', () => {
    it('should update status bar during processing', () => {
      expect(mockStatusBarItem.text).toBe('');
      expect(mockStatusBarItem.show).not.toHaveBeenCalled();
      expect(mockStatusBarItem.hide).not.toHaveBeenCalled();
    });
  });
});