import { describe, it, expect, beforeEach } from 'vitest';
import { OutputFormatter } from '../../src/core/OutputFormatter';
import { ProcessingResult, PromptPackerConfig, FileMetadata } from '../../src/types';

describe('OutputFormatter', () => {
  let formatter: OutputFormatter;
  let config: PromptPackerConfig;
  let mockResult: ProcessingResult;

  beforeEach(() => {
    config = {
      ignore: ['**/*.test.ts'],
      include: ['src/**/*.ts', '**/*.md'],
      maxFileSize: '100kb',
      maxTotalSize: '1mb',
      preserveStructure: true,
      outputFormat: 'ai-optimized',
    };

    formatter = new OutputFormatter(config);

    const mockFiles: FileMetadata[] = [
      {
        path: '/test/src/app.ts',
        relativePath: 'src/app.ts',
        size: 1024,
        extension: '.ts',
        isIncluded: true,
        relevanceScore: 0.9,
        content: `import React from 'react';

export const App: React.FC = () => {
  return <div>Hello World</div>;
};`,
      },
      {
        path: '/test/README.md',
        relativePath: 'README.md',
        size: 512,
        extension: '.md',
        isIncluded: true,
        relevanceScore: 0.8,
        content: '# Test Project\n\nThis is a test project.',
      },
      {
        path: '/test/package.json',
        relativePath: 'package.json',
        size: 256,
        extension: '.json',
        isIncluded: true,
        relevanceScore: 0.9,
        content: JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        }, null, 2),
      },
    ];

    mockResult = {
      overview: {
        name: 'test-project',
        type: 'React Application',
        techStack: ['TypeScript', 'React'],
        entryPoints: ['src/app.ts'],
      },
      contextMap: {
        projectStructure: [
          {
            name: 'src',
            path: '/test/src',
            type: 'directory',
            children: [
              {
                name: 'app.ts',
                path: '/test/src/app.ts',
                type: 'file',
                metadata: mockFiles[0],
              },
            ],
          },
          {
            name: 'README.md',
            path: '/test/README.md',
            type: 'file',
            metadata: mockFiles[1],
          },
        ],
        entryPoints: ['src/app.ts'],
        importGraph: [],
        coreFiles: [mockFiles[0]],
        configFiles: [mockFiles[2]],
      },
      files: mockFiles,
      totalSize: 1792,
      tokenEstimate: 0,
      formattedOutput: '',
    };
  });

  describe('format', () => {
    it('should format output in AI-optimized format by default', () => {
      const result = formatter.format(mockResult);

      expect(result).toContain('<codebase_analysis>');
      expect(result).toContain('<project_overview>');
      expect(result).toContain('<name>test-project</name>');
      expect(result).toContain('<type>React Application</type>');
      expect(result).toContain('<tech_stack>TypeScript, React</tech_stack>');
      expect(result).toContain('<architecture>');
      expect(result).toContain('<source_files>');
      expect(result).toContain('src/app.ts');
      expect(result).toContain('<!-- Relevance: 90% -->');
      expect(result).toContain('</codebase_analysis>');
    });

    it('should format output in markdown format', () => {
      config.outputFormat = 'markdown';
      formatter = new OutputFormatter(config);
      
      const result = formatter.format(mockResult);

      expect(result).toContain('# test-project');
      expect(result).toContain('**Project Type:** React Application');
      expect(result).toContain('**Technology Stack:** TypeScript, React');
      expect(result).toContain('## Project Structure');
      expect(result).toContain('## Source Files');
      expect(result).toContain('### src/app.ts');
      expect(result).toContain('*Relevance: 90%*');
      expect(result).toContain('```typescript');
    });

    it('should format output in standard format', () => {
      config.outputFormat = 'standard';
      formatter = new OutputFormatter(config);
      
      const result = formatter.format(mockResult);

      expect(result).toContain('// src/app.ts');
      expect(result).toContain('import React from \'react\';');
      expect(result).toContain('// README.md');
      expect(result).toContain('# Test Project');
      expect(result).not.toContain('<codebase_analysis>');
      expect(result).not.toContain('## Project Structure');
    });

    it('should exclude structure when preserveStructure is false', () => {
      config.outputFormat = 'standard';
      config.preserveStructure = false;
      formatter = new OutputFormatter(config);
      
      const result = formatter.format(mockResult);

      expect(result).not.toContain('// src/app.ts');
      expect(result).toContain('import React from \'react\';');
      expect(result).toContain('# Test Project');
    });
  });

  describe('formatAiOptimized', () => {
    it('should include configuration section when config files exist', () => {
      const result = formatter.formatAiOptimized(mockResult);

      expect(result).toContain('<configuration>');
      expect(result).toContain('package.json');
      // Should contain escaped JSON content
      expect(result).toContain('&quot;name&quot;: &quot;test-project&quot;');
    });

    it('should exclude configuration section when no config files exist', () => {
      mockResult.contextMap.configFiles = [];
      
      const result = formatter.formatAiOptimized(mockResult);

      expect(result).not.toContain('<configuration>');
    });

    it('should sort files by relevance score', () => {
      // Add a file with lower relevance
      const lowRelevanceFile: FileMetadata = {
        path: '/test/src/utils.ts',
        relativePath: 'src/utils.ts',
        size: 256,
        extension: '.ts',
        isIncluded: true,
        relevanceScore: 0.3,
        content: 'export const helper = () => {};',
      };
      
      mockResult.files = [...mockResult.files, lowRelevanceFile];
      
      const result = formatter.formatAiOptimized(mockResult);
      
      // Higher relevance file should appear first
      const appIndex = result.indexOf('src/app.ts');
      const utilsIndex = result.indexOf('src/utils.ts');
      
      expect(appIndex).toBeLessThan(utilsIndex);
    });

    it('should escape XML special characters', () => {
      const fileWithSpecialChars: FileMetadata = {
        path: '/test/special.ts',
        relativePath: 'special.ts',
        size: 128,
        extension: '.ts',
        isIncluded: true,
        content: 'const message = "Hello & <world>";',
      };
      
      mockResult.files = [fileWithSpecialChars];
      
      const result = formatter.formatAiOptimized(mockResult);
      
      expect(result).toContain('&quot;Hello &amp; &lt;world&gt;&quot;');
      expect(result).not.toContain('"Hello & <world>"');
    });
  });

  describe('formatMarkdown', () => {
    it('should detect correct language from file extension', () => {
      const result = formatter.formatMarkdown(mockResult);

      expect(result).toContain('```typescript');
      expect(result).toContain('```markdown');
      expect(result).toContain('```json');
    });

    it('should include relevance scores', () => {
      const result = formatter.formatMarkdown(mockResult);

      expect(result).toContain('*Relevance: 90%*');
      expect(result).toContain('*Relevance: 80%*');
    });

    it('should format directory tree correctly', () => {
      const result = formatter.formatMarkdown(mockResult);

      expect(result).toContain('## Project Structure');
      expect(result).toContain('```');
      expect(result).toContain('├── src');
      expect(result).toContain('├── README.md');
    });
  });

  describe('formatStandard', () => {
    it('should sort files alphabetically by relative path', () => {
      // Reverse the order of files
      mockResult.files = [
        mockResult.files[1], // README.md
        mockResult.files[0], // src/app.ts
        mockResult.files[2], // package.json
      ];
      
      const result = formatter.formatStandard(mockResult);
      
      // Should be sorted: package.json, README.md, src/app.ts
      const packageIndex = result.indexOf('// package.json');
      const readmeIndex = result.indexOf('// README.md');
      const appIndex = result.indexOf('// src/app.ts');
      
      expect(packageIndex).toBeLessThan(readmeIndex);
      expect(readmeIndex).toBeLessThan(appIndex);
    });

    it('should include file paths when preserveStructure is true', () => {
      const result = formatter.formatStandard(mockResult);

      expect(result).toContain('// src/app.ts');
      expect(result).toContain('// README.md');
      expect(result).toContain('// package.json');
    });

    it('should exclude file paths when preserveStructure is false', () => {
      config.preserveStructure = false;
      formatter = new OutputFormatter(config);
      
      const result = formatter.formatStandard(mockResult);

      expect(result).not.toContain('// src/app.ts');
      expect(result).not.toContain('// README.md');
      expect(result).not.toContain('// package.json');
      expect(result).toContain('import React from \'react\';');
      expect(result).toContain('# Test Project');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens correctly', () => {
      const text = 'This is a test string with multiple words.';
      const tokens = formatter.estimateTokens(text);
      
      // Rough estimate: 1 token per 4 characters
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });

    it('should handle empty strings', () => {
      const tokens = formatter.estimateTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle very short strings', () => {
      const tokens = formatter.estimateTokens('Hi');
      expect(tokens).toBe(1);
    });
  });

  describe('escapeXml', () => {
    it('should escape XML special characters', () => {
      const escapeXml = (formatter as any).escapeXml.bind(formatter);
      
      expect(escapeXml('Hello & <world>')).toBe('Hello &amp; &lt;world&gt;');
      expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeXml("'single'")).toBe('&apos;single&apos;');
      expect(escapeXml('No special chars')).toBe('No special chars');
    });
  });

  describe('getLanguageFromExtension', () => {
    it('should return correct language identifiers', () => {
      const getLanguage = (formatter as any).getLanguageFromExtension.bind(formatter);
      
      expect(getLanguage('.ts')).toBe('typescript');
      expect(getLanguage('.tsx')).toBe('typescript');
      expect(getLanguage('.js')).toBe('javascript');
      expect(getLanguage('.jsx')).toBe('javascript');
      expect(getLanguage('.py')).toBe('python');
      expect(getLanguage('.java')).toBe('java');
      expect(getLanguage('.md')).toBe('markdown');
      expect(getLanguage('.json')).toBe('json');
      expect(getLanguage('.unknown')).toBe('');
    });
  });
});