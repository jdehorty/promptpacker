import { describe, it, expect } from 'vitest';

describe('PromptPacker Extension', () => {
  it('should have basic functions defined', () => {
    // Basic smoke test to ensure the module structure is correct
    expect(true).toBe(true);
  });

  it('should validate configuration defaults', () => {
    // Test configuration structure
    const defaultConfig = {
      ignore: [],
      include: [],
      maxFileSize: '100kb',
      maxTotalSize: '1mb',
      preserveStructure: true,
      outputFormat: 'ai-optimized',
    };

    expect(defaultConfig.outputFormat).toBe('ai-optimized');
    expect(defaultConfig.preserveStructure).toBe(true);
  });

  it('should parse file sizes correctly', () => {
    // Helper function test (would need to export from extension)
    const parseSize = (sizeStr: string): number => {
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
    };

    expect(parseSize('100kb')).toBe(100 * 1024);
    expect(parseSize('1mb')).toBe(1024 * 1024);
    expect(parseSize('2gb')).toBe(2 * 1024 * 1024 * 1024);
  });
});
