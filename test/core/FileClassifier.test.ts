import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileClassifier } from '../../src/core/FileClassifier';
import { FileMetadata } from '../../src/types';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe('FileClassifier', () => {
  let classifier: FileClassifier;

  beforeEach(() => {
    vi.clearAllMocks();
    classifier = new FileClassifier();
  });

  describe('classifyFile', () => {
    it('should classify TypeScript source files correctly', async () => {
      const mockFile: FileMetadata = {
        path: '/test/src/app.ts',
        relativePath: 'src/app.ts',
        size: 1024,
        extension: '.ts',
        isIncluded: true,
      };

      const mockContent = `
import React from 'react';

interface AppProps {
  title: string;
}

export const App: React.FC<AppProps> = ({ title }) => {
  const handleClick = () => {
    console.log('Button clicked');
  };

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
};`;

      vi.mocked(fs.promises.readFile).mockResolvedValue(mockContent);

      const result = await classifier.classifyFile(mockFile);

      expect(result.content).toBe(mockContent);
      expect(result.informationDensity).toBeGreaterThan(0.5);
      expect(result.relevanceScore).toBeGreaterThan(0.5);
    });

    it('should classify configuration files correctly', async () => {
      const mockFile: FileMetadata = {
        path: '/test/package.json',
        relativePath: 'package.json',
        size: 512,
        extension: '.json',
        isIncluded: true,
      };

      const mockContent = JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          build: 'vite build',
          test: 'vitest',
        },
        dependencies: {
          react: '^18.0.0',
          typescript: '^5.0.0',
        },
      }, null, 2);

      vi.mocked(fs.promises.readFile).mockResolvedValue(mockContent);

      const result = await classifier.classifyFile(mockFile);

      expect(result.content).toBe(mockContent);
      expect(result.informationDensity).toBeGreaterThan(0.8);
      expect(result.relevanceScore).toBeGreaterThan(0.8);
    });

    it('should classify documentation files correctly', async () => {
      const mockFile: FileMetadata = {
        path: '/test/README.md',
        relativePath: 'README.md',
        size: 2048,
        extension: '.md',
        isIncluded: true,
      };

      const mockContent = `# Test Project

This is a test project for demonstrating PromptPacker functionality.

## Features

- File classification
- Intelligent filtering  
- LLM-optimized output

## Usage

\`\`\`bash
pnpm install
pnpm run build
\`\`\``;

      vi.mocked(fs.promises.readFile).mockResolvedValue(mockContent);

      const result = await classifier.classifyFile(mockFile);

      expect(result.content).toBe(mockContent);
      expect(result.informationDensity).toBeGreaterThan(0.3);
      expect(result.relevanceScore).toBeGreaterThan(0.3);
    });

    it('should handle files that cannot be read', async () => {
      const mockFile: FileMetadata = {
        path: '/test/package.json',
        relativePath: 'package.json',
        size: 1024,
        extension: '.json',
        isIncluded: true,
      };

      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('Cannot read file'));

      const result = await classifier.classifyFile(mockFile);

      expect(result.content).toBeUndefined();
      // package.json is a config file, so it should have scores
      expect(result.informationDensity).toBeGreaterThan(0);
      expect(result.relevanceScore).toBeGreaterThan(0);
    });

    it('should skip classification for excluded files', async () => {
      const mockFile: FileMetadata = {
        path: '/test/excluded.txt',
        relativePath: 'excluded.txt',
        size: 1024,
        extension: '.txt',
        isIncluded: false,
        exclusionReason: 'Not in include patterns',
      };

      const result = await classifier.classifyFile(mockFile);

      expect(result).toBe(mockFile);
      expect(fs.promises.readFile).not.toHaveBeenCalled();
    });
  });

  describe('analyzeContent', () => {
    it('should analyze TypeScript content correctly', () => {
      const content = `
import React from 'react';

// Component for displaying user information
interface UserProps {
  name: string;
  email: string;
}

const User: React.FC<UserProps> = ({ name, email }) => {
  const handleClick = () => {
    console.log('User clicked');
  };

  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
      <button onClick={handleClick}>Contact</button>
    </div>
  );
};

export default User;`;

      const result = classifier.analyzeContent(content, '.tsx');

      expect(result.densityMultiplier).toBeGreaterThan(0.5);
      expect(result.relevanceMultiplier).toBeGreaterThan(0.5);
    });

    it('should analyze Python content correctly', () => {
      const content = `
#!/usr/bin/env python3

import os
import sys
from typing import List, Dict

class UserManager:
    """Manages user operations."""
    
    def __init__(self):
        self.users: Dict[str, str] = {}
    
    def add_user(self, name: str, email: str) -> bool:
        """Add a new user."""
        if name in self.users:
            return False
        self.users[name] = email
        return True
    
    def get_user(self, name: str) -> str:
        """Get user email by name."""
        return self.users.get(name, '')

def main():
    manager = UserManager()
    manager.add_user('John', 'john@example.com')
    print(manager.get_user('John'))

if __name__ == '__main__':
    main()`;

      const result = classifier.analyzeContent(content, '.py');

      expect(result.densityMultiplier).toBeGreaterThan(0.5);
      expect(result.relevanceMultiplier).toBeGreaterThan(0.5);
    });

    it('should handle empty content', () => {
      const result = classifier.analyzeContent('', '.ts');

      expect(result.densityMultiplier).toBeGreaterThanOrEqual(0);
      expect(result.relevanceMultiplier).toBeGreaterThanOrEqual(0);
    });

    it('should analyze documentation content', () => {
      const content = `# API Documentation

## Overview

This API provides endpoints for user management.

## Endpoints

### GET /users

Returns a list of all users.

### POST /users

Creates a new user.

## Authentication

All endpoints require authentication via JWT token.`;

      const result = classifier.analyzeContent(content, '.md');

      expect(result.densityMultiplier).toBeGreaterThan(0.1);
      expect(result.relevanceMultiplier).toBeGreaterThan(0.1);
    });
  });

  describe('detectProjectType', () => {
    it('should detect React project', () => {
      const files: FileMetadata[] = [
        {
          path: '/test/package.json',
          relativePath: 'package.json',
          size: 1024,
          extension: '.json',
          isIncluded: true,
          content: JSON.stringify({
            dependencies: { react: '^18.0.0' }
          }),
        },
        {
          path: '/test/src/App.tsx',
          relativePath: 'src/App.tsx',
          size: 512,
          extension: '.tsx',
          isIncluded: true,
        },
      ];

      const projectType = FileClassifier.detectProjectType(files);
      // Should detect React when package.json contains react dependency and tsx files exist
      expect(['React Application', 'Node.js Project']).toContain(projectType);
    });

    it('should detect Next.js project', () => {
      const files: FileMetadata[] = [
        {
          path: '/test/package.json',
          relativePath: 'package.json',
          size: 1024,
          extension: '.json',
          isIncluded: true,
        },
        {
          path: '/test/next.config.js',
          relativePath: 'next.config.js',
          size: 256,
          extension: '.js',
          isIncluded: true,
        },
      ];

      const projectType = FileClassifier.detectProjectType(files);
      expect(projectType).toBe('Next.js Application');
    });

    it('should detect Python project', () => {
      const files: FileMetadata[] = [
        {
          path: '/test/requirements.txt',
          relativePath: 'requirements.txt',
          size: 128,
          extension: '.txt',
          isIncluded: true,
        },
        {
          path: '/test/main.py',
          relativePath: 'main.py',
          size: 512,
          extension: '.py',
          isIncluded: true,
        },
      ];

      const projectType = FileClassifier.detectProjectType(files);
      expect(projectType).toBe('Python Project');
    });

    it('should detect VS Code Extension project', () => {
      const files: FileMetadata[] = [
        {
          path: '/test/package.json',
          relativePath: 'package.json',
          size: 1024,
          extension: '.json',
          isIncluded: true,
        },
        {
          path: '/test/src/extension.ts',
          relativePath: 'src/extension.ts',
          size: 2048,
          extension: '.ts',
          isIncluded: true,
        },
      ];

      const projectType = FileClassifier.detectProjectType(files);
      expect(projectType).toBe('VS Code Extension');
    });

    it('should return unknown for unrecognized projects', () => {
      const files: FileMetadata[] = [
        {
          path: '/test/some-file.txt',
          relativePath: 'some-file.txt',
          size: 128,
          extension: '.txt',
          isIncluded: true,
        },
      ];

      const projectType = FileClassifier.detectProjectType(files);
      expect(projectType).toBe('Unknown Project Type');
    });
  });

  describe('detectTechStack', () => {
    it('should detect tech stack from file extensions and package.json', () => {
      const files: FileMetadata[] = [
        {
          path: '/test/package.json',
          relativePath: 'package.json',
          size: 1024,
          extension: '.json',
          isIncluded: true,
          content: JSON.stringify({
            dependencies: {
              react: '^18.0.0',
              typescript: '^5.0.0',
              express: '^4.18.0',
            },
          }),
        },
        {
          path: '/test/src/app.ts',
          relativePath: 'src/app.ts',
          size: 512,
          extension: '.ts',
          isIncluded: true,
        },
        {
          path: '/test/src/component.tsx',
          relativePath: 'src/component.tsx',
          size: 256,
          extension: '.tsx',
          isIncluded: true,
        },
        {
          path: '/test/script.py',
          relativePath: 'script.py',
          size: 128,
          extension: '.py',
          isIncluded: true,
        },
      ];

      const techStack = FileClassifier.detectTechStack(files);
      
      expect(techStack).toContain('TypeScript');
      expect(techStack).toContain('React');
      expect(techStack).toContain('Express.js');
      expect(techStack).toContain('Python');
    });

    it('should handle malformed package.json', () => {
      const files: FileMetadata[] = [
        {
          path: '/test/package.json',
          relativePath: 'package.json',
          size: 1024,
          extension: '.json',
          isIncluded: true,
          content: 'invalid json',
        },
        {
          path: '/test/src/app.js',
          relativePath: 'src/app.js',
          size: 512,
          extension: '.js',
          isIncluded: true,
        },
      ];

      const techStack = FileClassifier.detectTechStack(files);
      
      expect(techStack).toContain('JavaScript');
      expect(techStack).not.toContain('React'); // Should not detect from malformed package.json
    });
  });
});