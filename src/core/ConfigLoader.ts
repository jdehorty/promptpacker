import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { PromptPackerConfig } from '../types';
import { logger } from './Logger';

export class ConfigLoader {
  private static readonly CONFIG_FILE_NAME = '.promptpackerrc';
  public static readonly DEFAULT_CONFIG: PromptPackerConfig = {
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
    outputFormat: 'ai-optimized',
  };

  public static async loadConfig(workspaceRoot: string): Promise<PromptPackerConfig> {
    logger.debug('ConfigLoader', 'Loading configuration', { workspaceRoot });

    // First, try to load from .promptpackerrc file
    const configPath = path.join(workspaceRoot, ConfigLoader.CONFIG_FILE_NAME);
    let fileConfig: Partial<PromptPackerConfig> = {};

    if (fs.existsSync(configPath)) {
      try {
        logger.debug('ConfigLoader', 'Found config file, parsing', { configPath });
        const content = await fs.promises.readFile(configPath, 'utf-8');
        fileConfig = JSON.parse(content);
        logger.info('ConfigLoader', 'Config file loaded successfully', {
          configPath,
          hasIgnore: !!fileConfig.ignore,
          hasInclude: !!fileConfig.include,
        });
      } catch (error) {
        logger.error('ConfigLoader', 'Failed to parse config file', error as Error, { configPath });
        vscode.window.showWarningMessage(
          `Failed to parse ${ConfigLoader.CONFIG_FILE_NAME}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } else {
      logger.debug('ConfigLoader', 'No config file found, using defaults', { configPath });
    }

    // Then, load VS Code settings
    const vscodeConfig = vscode.workspace.getConfiguration('promptpacker');
    logger.debug('ConfigLoader', 'Loading VS Code configuration settings');

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
        vscodeConfig.get<'ai-optimized' | 'standard' | 'markdown'>('outputFormat') ||
        fileConfig.outputFormat ||
        ConfigLoader.DEFAULT_CONFIG.outputFormat,
    };

    logger.info('ConfigLoader', 'Configuration loaded successfully', {
      outputFormat: config.outputFormat,
      ignoreCount: config.ignore.length,
      includeCount: config.include.length,
      maxFileSize: config.maxFileSize,
      maxTotalSize: config.maxTotalSize,
    });

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
    const validFormats = ['ai-optimized', 'standard', 'markdown'];
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
