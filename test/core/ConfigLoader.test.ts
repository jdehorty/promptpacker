import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigLoader } from '../../src/core/ConfigLoader';
import * as fs from 'fs';
import * as path from 'path';

// Mock modules
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
  };
});

// Mock VS Code workspace
const mockVSCodeConfig = {
  get: vi.fn(),
};

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(() => mockVSCodeConfig),
  },
  window: {
    showWarningMessage: vi.fn(),
  },
}), { virtual: true });

describe('ConfigLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVSCodeConfig.get.mockReturnValue(undefined);
  });

  describe('loadConfig', () => {
    it('should load default config when no .promptpackerrc exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = await ConfigLoader.loadConfig('/test-workspace');

      expect(config).toEqual(ConfigLoader.DEFAULT_CONFIG);
      expect(fs.existsSync).toHaveBeenCalledWith('/test-workspace/.promptpackerrc');
    });

    it('should load and merge .promptpackerrc config', async () => {
      const customConfig = {
        ignore: ['**/*.custom.ts'],
        maxFileSize: '200kb',
        outputFormat: 'markdown' as const,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(customConfig));

      const config = await ConfigLoader.loadConfig('/test-workspace');

      expect(config.ignore).toEqual(customConfig.ignore);
      expect(config.maxFileSize).toBe(customConfig.maxFileSize);
      expect(config.outputFormat).toBe(customConfig.outputFormat);
      // Should merge with defaults for unspecified values
      expect(config.include).toEqual(ConfigLoader.DEFAULT_CONFIG.include);
    });

    it('should override with VS Code settings', async () => {
      const customConfig = {
        maxFileSize: '200kb',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(customConfig));
      
      // Mock VS Code settings
      mockVSCodeConfig.get.mockImplementation((key: string) => {
        switch (key) {
          case 'maxFileSize':
            return '500kb';
          case 'outputFormat':
            return 'standard';
          default:
            return undefined;
        }
      });

      const config = await ConfigLoader.loadConfig('/test-workspace');

      // VS Code settings should override file and defaults
      expect(config.maxFileSize).toBe('500kb');
      expect(config.outputFormat).toBe('standard');
    });

    it('should handle malformed .promptpackerrc file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('invalid json');

      const config = await ConfigLoader.loadConfig('/test-workspace');

      // Should fall back to defaults
      expect(config).toEqual(ConfigLoader.DEFAULT_CONFIG);
    });

    it('should handle file read errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('Permission denied'));

      const config = await ConfigLoader.loadConfig('/test-workspace');

      // Should fall back to defaults
      expect(config).toEqual(ConfigLoader.DEFAULT_CONFIG);
    });

    it('should use correct config file path', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await ConfigLoader.loadConfig('/custom/workspace/path');

      expect(path.join).toHaveBeenCalledWith('/custom/workspace/path', '.promptpackerrc');
    });
  });

  describe('saveConfig', () => {
    it('should save config to .promptpackerrc file', async () => {
      const config = {
        ignore: ['**/*.test.ts'],
        include: ['src/**/*.ts'],
        maxFileSize: '100kb',
        maxTotalSize: '1mb',
        preserveStructure: true,
        outputFormat: 'ai-optimized' as const,
      };

      await ConfigLoader.saveConfig('/test-workspace', config);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        '/test-workspace/.promptpackerrc',
        JSON.stringify(config, null, 2),
        'utf-8'
      );
    });

    it('should handle write errors gracefully', async () => {
      const config = ConfigLoader.DEFAULT_CONFIG;
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(ConfigLoader.saveConfig('/test-workspace', config)).rejects.toThrow('Permission denied');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const config = ConfigLoader.DEFAULT_CONFIG;
      const result = ConfigLoader.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid maxFileSize format', () => {
      const config = {
        ...ConfigLoader.DEFAULT_CONFIG,
        maxFileSize: 'invalid-size',
      };

      const result = ConfigLoader.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid maxFileSize format: invalid-size');
    });

    it('should reject invalid maxTotalSize format', () => {
      const config = {
        ...ConfigLoader.DEFAULT_CONFIG,
        maxTotalSize: '100xyz',
      };

      const result = ConfigLoader.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid maxTotalSize format: 100xyz');
    });

    it('should reject invalid outputFormat', () => {
      const config = {
        ...ConfigLoader.DEFAULT_CONFIG,
        outputFormat: 'invalid-format' as any,
      };

      const result = ConfigLoader.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid outputFormat: invalid-format. Must be one of: ai-optimized, standard, markdown');
    });

    it('should accept valid size formats', () => {
      const validSizes = ['100b', '50kb', '1mb', '2gb', '1.5mb', '0.5gb'];
      
      for (const size of validSizes) {
        const config = {
          ...ConfigLoader.DEFAULT_CONFIG,
          maxFileSize: size,
          maxTotalSize: size,
        };

        const result = ConfigLoader.validateConfig(config);
        expect(result.valid).toBe(true);
      }
    });

    it('should accumulate multiple validation errors', () => {
      const config = {
        ...ConfigLoader.DEFAULT_CONFIG,
        maxFileSize: 'invalid',
        maxTotalSize: 'also-invalid',
        outputFormat: 'wrong' as any,
      };

      const result = ConfigLoader.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values', () => {
      expect(ConfigLoader.DEFAULT_CONFIG).toEqual({
        ignore: [
          '**/*.test.{js,ts,jsx,tsx}',
          '**/*.spec.{js,ts,jsx,tsx}',
          '**/coverage/**',
          '**/.env*',
        ],
        include: [
          'src/**/*.{js,ts,jsx,tsx}',
          '**/*.md',
          'package.json',
          '*.config.{js,ts,json}',
        ],
        maxFileSize: '100kb',
        maxTotalSize: '1mb',
        preserveStructure: true,
        outputFormat: 'ai-optimized',
      });
    });

    it('should be a valid configuration', () => {
      const result = ConfigLoader.validateConfig(ConfigLoader.DEFAULT_CONFIG);
      expect(result.valid).toBe(true);
    });
  });
});