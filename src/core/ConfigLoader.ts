import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { PromptPackerConfig } from '../types';

export class ConfigLoader {
  private static readonly CONFIG_FILE_NAME = '.promptpackerrc';
  private static readonly DEFAULT_CONFIG: PromptPackerConfig = {
    ignore: [
      '**/*.test.{js,ts,jsx,tsx}',
      '**/*.spec.{js,ts,jsx,tsx}',
      '**/coverage/**',
      '**/.env*',
    ],
    include: ['src/**/*.{js,ts,jsx,tsx}', '**/*.md', 'package.json', '*.config.{js,ts,json}'],
    maxFileSize: '100kb',
    maxTotalSize: '1mb',
    preserveStructure: true,
    outputFormat: 'claude-optimized',
  };

  public static async loadConfig(workspaceRoot: string): Promise<PromptPackerConfig> {
    // First, try to load from .promptpackerrc file
    const configPath = path.join(workspaceRoot, ConfigLoader.CONFIG_FILE_NAME);
    let fileConfig: Partial<PromptPackerConfig> = {};

    if (fs.existsSync(configPath)) {
      try {
        const content = await fs.promises.readFile(configPath, 'utf-8');
        fileConfig = JSON.parse(content);
      } catch (error) {
        vscode.window.showWarningMessage(
          `Failed to parse ${ConfigLoader.CONFIG_FILE_NAME}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Then, load VS Code settings
    const vscodeConfig = vscode.workspace.getConfiguration('promptpacker');

    // Merge configurations: VS Code settings override file config, which overrides defaults
    const config: PromptPackerConfig = {
      ...ConfigLoader.DEFAULT_CONFIG,
      ...fileConfig,
      ignore:
        vscodeConfig.get<string[]>('ignore') ||
        fileConfig.ignore ||
        ConfigLoader.DEFAULT_CONFIG.ignore,
      include:
        vscodeConfig.get<string[]>('include') ||
        fileConfig.include ||
        ConfigLoader.DEFAULT_CONFIG.include,
      maxFileSize:
        vscodeConfig.get<string>('maxFileSize') ||
        fileConfig.maxFileSize ||
        ConfigLoader.DEFAULT_CONFIG.maxFileSize,
      maxTotalSize:
        vscodeConfig.get<string>('maxTotalSize') ||
        fileConfig.maxTotalSize ||
        ConfigLoader.DEFAULT_CONFIG.maxTotalSize,
      preserveStructure:
        vscodeConfig.get<boolean>('preserveStructure') ??
        fileConfig.preserveStructure ??
        ConfigLoader.DEFAULT_CONFIG.preserveStructure,
      outputFormat:
        vscodeConfig.get<'claude-optimized' | 'standard' | 'markdown'>('outputFormat') ||
        fileConfig.outputFormat ||
        ConfigLoader.DEFAULT_CONFIG.outputFormat,
    };

    return config;
  }

  public static async saveConfig(workspaceRoot: string, config: PromptPackerConfig): Promise<void> {
    const configPath = path.join(workspaceRoot, ConfigLoader.CONFIG_FILE_NAME);
    const content = JSON.stringify(config, null, 2);
    await fs.promises.writeFile(configPath, content, 'utf-8');
  }

  public static validateConfig(config: PromptPackerConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate size formats
    const sizeRegex = /^\d+(?:\.\d+)?\s*(?:b|kb|mb|gb)?$/i;
    if (!sizeRegex.test(config.maxFileSize)) {
      errors.push(`Invalid maxFileSize format: ${config.maxFileSize}`);
    }
    if (!sizeRegex.test(config.maxTotalSize)) {
      errors.push(`Invalid maxTotalSize format: ${config.maxTotalSize}`);
    }

    // Validate output format
    const validFormats = ['claude-optimized', 'standard', 'markdown'];
    if (!validFormats.includes(config.outputFormat)) {
      errors.push(
        `Invalid outputFormat: ${config.outputFormat}. Must be one of: ${validFormats.join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
