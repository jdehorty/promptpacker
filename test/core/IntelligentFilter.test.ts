import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntelligentFilter } from '../../src/core/IntelligentFilter';
import { FilterConfig } from '../../src/types';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
  promises: {
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}));

vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    relative: vi.fn((from, to) => to.replace(from + '/', '')),
    extname: vi.fn((p) => {
      const parts = p.split('.');
      return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
    }),
    basename: vi.fn((p) => p.split('/').pop() || ''),
    sep: '/',
  };
});

describe('IntelligentFilter', () => {
  let filter: IntelligentFilter;
  let config: FilterConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      root: '/test-project',
      ignore: ['**/*.test.ts', '**/coverage/**'],
      include: ['src/**/*.ts', '**/*.md', 'package.json'],
      maxFileSize: '100kb',
      respectGitignore: true,
    };

    // Mock .gitignore existence and content
    vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
      return filePath === '/test-project/.gitignore';
    });

    vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
      if (filePath === '/test-project/.gitignore') {
        return 'node_modules/\\ndist/\\n.env';
      }
      return '';
    });

    filter = new IntelligentFilter(config);
  });

  describe('shouldIncludeFile', () => {
    beforeEach(() => {
      vi.mocked(fs.statSync).mockReturnValue({
        size: 1024, // 1KB
      } as any);
    });

    it('should include TypeScript files in src directory', () => {
      const result = filter.shouldIncludeFile('/test-project/src/index.ts');
      expect(result.include).toBe(true);
      expect(result.priority).toBeGreaterThan(50);
    });

    it('should exclude binary files', () => {
      const result = filter.shouldIncludeFile('/test-project/image.png');
      expect(result.include).toBe(false);
      expect(result.reason).toBe('Binary file');
    });

    it('should exclude files in node_modules', () => {
      const result = filter.shouldIncludeFile('/test-project/node_modules/react/index.js');
      expect(result.include).toBe(false);
      expect(result.reason).toContain('default exclusion');
    });

    it('should exclude files matching gitignore patterns', () => {
      const result = filter.shouldIncludeFile('/test-project/dist/bundle.js');
      expect(result.include).toBe(false);
      expect(result.reason).toBe('Matched .gitignore pattern');
    });

    it('should exclude test files by default', () => {
      const result = filter.shouldIncludeFile('/test-project/src/component.test.ts');
      expect(result.include).toBe(false);
      expect(result.reason).toContain('default exclusion');
    });

    it('should exclude files not matching include patterns', () => {
      const configWithInclude = {
        ...config,
        include: ['src/**/*.ts'],
      };
      const filterWithInclude = new IntelligentFilter(configWithInclude);
      
      const result = filterWithInclude.shouldIncludeFile('/test-project/docs/readme.txt');
      expect(result.include).toBe(false);
      expect(result.reason).toBe('Did not match include patterns');
    });

    it('should exclude files that are too large', () => {
      vi.mocked(fs.statSync).mockReturnValue({
        size: 200 * 1024, // 200KB (larger than 100KB limit)
      } as any);

      const result = filter.shouldIncludeFile('/test-project/large-file.ts');
      expect(result.include).toBe(false);
      expect(result.reason).toContain('File too large');
    });

    it('should give higher priority to README files', () => {
      const result = filter.shouldIncludeFile('/test-project/README.md');
      expect(result.include).toBe(true);
      expect(result.priority).toBeGreaterThan(80);
    });

    it('should give higher priority to package.json', () => {
      const result = filter.shouldIncludeFile('/test-project/package.json');
      expect(result.include).toBe(true);
      expect(result.priority).toBeGreaterThan(80);
    });

    it('should give higher priority to TypeScript files', () => {
      const result = filter.shouldIncludeFile('/test-project/src/app.ts');
      expect(result.include).toBe(true);
      expect(result.priority).toBeGreaterThan(70);
    });

    it('should give higher priority to Python files', () => {
      const result = filter.shouldIncludeFile('/test-project/src/main.py');
      expect(result.include).toBe(true);
      expect(result.priority).toBeGreaterThan(70);
    });
  });

  describe('analyzeDirectory', () => {
    beforeEach(() => {
      vi.mocked(fs.promises.readdir).mockResolvedValue([
        { name: 'package.json', isFile: () => true, isDirectory: () => false },
        { name: 'README.md', isFile: () => true, isDirectory: () => false },
        { name: 'src', isFile: () => false, isDirectory: () => true },
        { name: 'node_modules', isFile: () => false, isDirectory: () => true },
        { name: '.git', isFile: () => false, isDirectory: () => true },
      ] as any);

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: 1024,
      } as any);
    });

    it('should analyze directory and return file metadata', async () => {
      const files = await filter.analyzeDirectory('/test-project');
      
      expect(files).toHaveLength(2); // package.json and README.md
      expect(files[0].relativePath).toBe('package.json');
      expect(files[0].isIncluded).toBe(true);
      expect(files[1].relativePath).toBe('README.md');
      expect(files[1].isIncluded).toBe(true);
    });

    it('should respect maxDepth configuration', async () => {
      const configWithDepth = { ...config, maxDepth: 0 };
      const filterWithDepth = new IntelligentFilter(configWithDepth);
      
      const files = await filterWithDepth.analyzeDirectory('/test-project');
      expect(files).toHaveLength(0); // No files should be included at depth 0
    });
  });

  describe('parseSize', () => {
    it('should parse size strings correctly', () => {
      // Access private method through type assertion for testing
      const parseSize = (filter as any).parseSize.bind(filter);
      
      expect(parseSize('100b')).toBe(100);
      expect(parseSize('100kb')).toBe(102400);
      expect(parseSize('1mb')).toBe(1048576);
      expect(parseSize('1gb')).toBe(1073741824);
      expect(parseSize('1.5kb')).toBe(1536);
    });

    it('should throw error for invalid size format', () => {
      const parseSize = (filter as any).parseSize.bind(filter);
      
      expect(() => parseSize('invalid')).toThrow('Invalid size format');
      expect(() => parseSize('')).toThrow('Invalid size format');
    });
  });

  describe('calculateFilePriority', () => {
    it('should calculate priority correctly for different file types', () => {
      const calculatePriority = (filter as any).calculateFilePriority.bind(filter);
      
      // High-signal TypeScript file in src
      expect(calculatePriority('.ts', 'app.ts', 'src/app.ts')).toBeGreaterThan(90);
      
      // README file
      expect(calculatePriority('.md', 'readme.md', 'README.md')).toBeGreaterThan(90);
      
      // Package.json
      expect(calculatePriority('.json', 'package.json', 'package.json')).toBeGreaterThan(90);
      
      // Regular markdown file
      expect(calculatePriority('.md', 'docs.md', 'docs/docs.md')).toBeLessThan(90);
      
      // File not in high-signal directory
      expect(calculatePriority('.ts', 'test.ts', 'test/test.ts')).toBeLessThan(90);
    });
  });
});