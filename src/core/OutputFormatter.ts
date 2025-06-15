import { ProcessingResult, DirectoryNode, PromptPackerConfig } from '../types';

export class OutputFormatter {
  private config: PromptPackerConfig;

  constructor(config: PromptPackerConfig) {
    this.config = config;
  }

  public format(result: ProcessingResult): string {
    switch (this.config.outputFormat) {
      case 'ai-optimized':
        return this.formatAiOptimized(result);
      case 'markdown':
        return this.formatMarkdown(result);
      case 'standard':
      default:
        return this.formatStandard(result);
    }
  }

  private formatAiOptimized(result: ProcessingResult): string {
    const output: string[] = [];

    output.push('<codebase_analysis>');

    // Project Overview
    output.push('  <project_overview>');
    output.push(`    <name>${this.escapeXml(result.overview.name)}</name>`);
    output.push(`    <type>${this.escapeXml(result.overview.type)}</type>`);
    output.push(
      `    <tech_stack>${result.overview.techStack.map(t => this.escapeXml(t)).join(', ')}</tech_stack>`
    );
    output.push(
      `    <entry_points>${result.overview.entryPoints.map(e => this.escapeXml(e)).join(', ')}</entry_points>`
    );
    output.push('  </project_overview>');
    output.push('');

    // Architecture
    output.push('  <architecture>');
    output.push('    <directory_structure>');
    output.push(this.formatDirectoryTree(result.contextMap.projectStructure, 3));
    output.push('    </directory_structure>');
    output.push('');

    if (result.contextMap.importGraph.length > 0) {
      output.push('    <key_relationships>');
      result.contextMap.importGraph.forEach(rel => {
        output.push(
          `      <import from="${this.escapeXml(rel.source)}" to="${this.escapeXml(rel.target)}" type="${rel.type}" />`
        );
      });
      output.push('    </key_relationships>');
    }

    output.push('  </architecture>');
    output.push('');

    // Source Files
    output.push('  <source_files>');

    // Sort files by relevance score
    const sortedFiles = result.files
      .filter(f => f.isIncluded && f.content)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    sortedFiles.forEach(file => {
      output.push(`    <file path="${this.escapeXml(file.relativePath)}">`);

      // Add file metadata as comments
      if (file.relevanceScore !== undefined) {
        output.push(`      <!-- Relevance: ${(file.relevanceScore * 100).toFixed(0)}% -->`);
      }

      // Format content with proper indentation
      const content = file.content || '';
      const lines = content.split('\n');
      lines.forEach(line => {
        output.push('      ' + this.escapeXml(line));
      });

      output.push('    </file>');
      output.push('');
    });

    output.push('  </source_files>');

    // Configuration Files
    const configFiles = result.contextMap.configFiles.filter(f => f.content);
    if (configFiles.length > 0) {
      output.push('');
      output.push('  <configuration>');

      configFiles.forEach(file => {
        output.push(`    <file path="${this.escapeXml(file.relativePath)}">`);
        const content = file.content || '';
        const lines = content.split('\n');
        lines.forEach(line => {
          output.push('      ' + this.escapeXml(line));
        });
        output.push('    </file>');
      });

      output.push('  </configuration>');
    }

    output.push('</codebase_analysis>');

    return output.join('\n');
  }

  private formatMarkdown(result: ProcessingResult): string {
    const output: string[] = [];

    output.push(`# ${result.overview.name}`);
    output.push('');
    output.push(`**Project Type:** ${result.overview.type}`);
    output.push(`**Technology Stack:** ${result.overview.techStack.join(', ')}`);
    output.push(`**Entry Points:** ${result.overview.entryPoints.join(', ')}`);
    output.push('');

    output.push('## Project Structure');
    output.push('');
    output.push('```');
    output.push(this.formatDirectoryTree(result.contextMap.projectStructure, 0));
    output.push('```');
    output.push('');

    output.push('## Source Files');
    output.push('');

    const sortedFiles = result.files
      .filter(f => f.isIncluded && f.content)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    sortedFiles.forEach(file => {
      const lang = this.getLanguageFromExtension(file.extension);
      output.push(`### ${file.relativePath}`);
      if (file.relevanceScore !== undefined) {
        output.push(`*Relevance: ${(file.relevanceScore * 100).toFixed(0)}%*`);
      }
      output.push('');
      output.push(`\`\`\`${lang}`);
      output.push(file.content || '');
      output.push('```');
      output.push('');
    });

    return output.join('\n');
  }

  private formatStandard(result: ProcessingResult): string {
    const output: string[] = [];

    const sortedFiles = result.files
      .filter(f => f.isIncluded && f.content)
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    sortedFiles.forEach(file => {
      if (this.config.preserveStructure) {
        output.push(`// ${file.relativePath}`);
      }
      output.push(file.content || '');
      output.push('');
      output.push('');
    });

    return output.join('\n').trim();
  }

  private formatDirectoryTree(nodes: DirectoryNode[], indent: number): string {
    const output: string[] = [];
    const prefix = ' '.repeat(indent * 2);

    nodes.forEach(node => {
      const marker = node.type === 'directory' ? '├── ' : '├── ';

      output.push(`${prefix}${marker}${node.name}`);

      if (node.children && node.children.length > 0) {
        output.push(this.formatDirectoryTree(node.children, indent + 1));
      }
    });

    return output.join('\n');
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private getLanguageFromExtension(ext: string): string {
    const langMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.go': 'go',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.rs': 'rust',
      '.dart': 'dart',
      '.scala': 'scala',
      '.r': 'r',
      '.m': 'objc',
      '.json': 'json',
      '.xml': 'xml',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.md': 'markdown',
      '.sh': 'bash',
      '.sql': 'sql',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
    };

    return langMap[ext] || '';
  }

  public estimateTokens(content: string): number {
    // Rough estimation: ~4 characters per token for code
    // This is a simplified estimation and can be improved
    return Math.ceil(content.length / 4);
  }
}
