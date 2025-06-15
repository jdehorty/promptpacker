import * as fs from 'fs';
import * as path from 'path';
import { FileMetadata } from '../types';

export class FileClassifier {
  private static readonly SOURCE_CODE_EXTENSIONS = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.mjs',
    '.cjs',
    '.py',
    '.java',
    '.c',
    '.cpp',
    '.cs',
    '.rb',
    '.go',
    '.php',
    '.swift',
    '.kt',
    '.rs',
    '.dart',
    '.scala',
    '.r',
    '.m',
    '.h',
    '.hpp',
    '.cc',
    '.cxx',
  ];

  private static readonly CONFIG_FILES = [
    'package.json',
    'tsconfig.json',
    'jsconfig.json',
    'babel.config.js',
    '.eslintrc',
    '.prettierrc',
    'webpack.config.js',
    'vite.config.js',
    'rollup.config.js',
    'next.config.js',
    'nuxt.config.js',
    'vue.config.js',
    'angular.json',
    '.env.example',
    'docker-compose.yml',
    'Dockerfile',
    'Makefile',
    'requirements.txt',
    'Gemfile',
    'Cargo.toml',
    'go.mod',
    'composer.json',
    'pom.xml',
    'build.gradle',
    '.gitignore',
  ];

  private static readonly DOCUMENTATION_PATTERNS = [
    /^README/i,
    /^CHANGELOG/i,
    /^CONTRIBUTING/i,
    /^LICENSE/i,
    /^AUTHORS/i,
    /^CONTRIBUTORS/i,
    /^TODO/i,
    /\.md$/i,
  ];

  private static readonly ENTRY_POINT_PATTERNS = [
    /^index\.[jt]sx?$/,
    /^main\.[jt]sx?$/,
    /^app\.[jt]sx?$/,
    /^server\.[jt]sx?$/,
    /^extension\.[jt]sx?$/,
    /^background\.[jt]sx?$/,
    /^content\.[jt]sx?$/,
    /^popup\.[jt]sx?$/,
    /^cli\.[jt]sx?$/,
  ];

  public async classifyFile(metadata: FileMetadata): Promise<FileMetadata> {
    if (!metadata.isIncluded) {
      return metadata;
    }

    const fileName = path.basename(metadata.path);
    const extension = metadata.extension;

    // Determine file type and importance
    let informationDensity = 0;
    let relevanceScore = 0;

    // Check if it's a source code file
    if (FileClassifier.SOURCE_CODE_EXTENSIONS.includes(extension)) {
      informationDensity += 0.7;
      relevanceScore += 0.8;

      // Check if it's an entry point
      if (FileClassifier.ENTRY_POINT_PATTERNS.some(pattern => pattern.test(fileName))) {
        relevanceScore += 0.2;
      }
    }

    // Check if it's a configuration file
    if (FileClassifier.CONFIG_FILES.includes(fileName)) {
      informationDensity += 0.9;
      relevanceScore += 0.9;
    }

    // Check if it's documentation
    if (FileClassifier.DOCUMENTATION_PATTERNS.some(pattern => pattern.test(fileName))) {
      informationDensity += 0.5;
      relevanceScore += 0.6;
    }

    // Analyze file content for better scoring
    if (informationDensity > 0) {
      try {
        const content = await fs.promises.readFile(metadata.path, 'utf-8');
        const analysis = this.analyzeContent(content, extension);

        metadata.content = content;
        metadata.informationDensity = Math.min(1, informationDensity * analysis.densityMultiplier);
        metadata.relevanceScore = Math.min(1, relevanceScore * analysis.relevanceMultiplier);
      } catch (error) {
        // If we can't read the file, use default scores
        metadata.informationDensity = informationDensity;
        metadata.relevanceScore = relevanceScore;
      }
    }

    return metadata;
  }

  private analyzeContent(
    content: string,
    extension: string
  ): { densityMultiplier: number; relevanceMultiplier: number } {
    const lines = content.split('\n');
    const totalLines = lines.length;

    if (totalLines === 0) {
      return { densityMultiplier: 0, relevanceMultiplier: 0 };
    }

    let codeLines = 0;
    let commentLines = 0;
    let emptyLines = 0;
    let importLines = 0;
    let functionCount = 0;
    let classCount = 0;

    const isSourceCode = FileClassifier.SOURCE_CODE_EXTENSIONS.includes(extension);

    lines.forEach(line => {
      const trimmed = line.trim();

      if (!trimmed) {
        emptyLines++;
      } else if (isSourceCode) {
        if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
          commentLines++;
        } else if (trimmed.match(/^(import|from|require|use|include)/)) {
          importLines++;
        } else {
          codeLines++;

          // Count functions and classes (simple heuristic)
          if (trimmed.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{|def\s+\w+|fun\s+\w+/)) {
            functionCount++;
          }
          if (trimmed.match(/class\s+\w+|interface\s+\w+|struct\s+\w+/)) {
            classCount++;
          }
        }
      } else {
        codeLines++;
      }
    });

    // Calculate density multiplier
    const meaningfulLines = codeLines + commentLines;
    const densityRatio = meaningfulLines / totalLines;
    const complexityScore = (functionCount + classCount * 2) / Math.max(1, meaningfulLines / 100);

    let densityMultiplier = densityRatio;
    if (complexityScore > 0.5) {
      densityMultiplier *= 1.2;
    }

    // Calculate relevance multiplier
    let relevanceMultiplier = 1.0;

    // High import count suggests architectural importance
    if (importLines > 5) {
      relevanceMultiplier *= 1.1;
    }

    // Many functions/classes suggest core business logic
    if (functionCount > 3 || classCount > 0) {
      relevanceMultiplier *= 1.2;
    }

    // Very large files might be less relevant (generated code)
    if (totalLines > 1000) {
      relevanceMultiplier *= 0.8;
    }

    // Files with mostly comments might be important documentation
    if (commentLines / meaningfulLines > 0.3) {
      relevanceMultiplier *= 1.1;
    }

    return {
      densityMultiplier: Math.max(0.1, Math.min(1.5, densityMultiplier)),
      relevanceMultiplier: Math.max(0.1, Math.min(1.5, relevanceMultiplier)),
    };
  }

  public static detectProjectType(files: FileMetadata[]): string {
    const hasFile = (name: string) => files.some(f => path.basename(f.path) === name);
    const hasPattern = (pattern: RegExp) => files.some(f => pattern.test(f.path));

    if (hasFile('package.json')) {
      if (hasFile('next.config.js')) return 'Next.js Application';
      if (hasFile('nuxt.config.js')) return 'Nuxt.js Application';
      if (hasFile('angular.json')) return 'Angular Application';
      if (hasFile('vue.config.js') || hasPattern(/\.vue$/)) return 'Vue.js Application';
      if (hasPattern(/\.tsx$/) && hasPattern(/react/i)) return 'React Application';
      if (hasFile('extension.ts') || hasFile('extension.js')) return 'VS Code Extension';
      return 'Node.js Project';
    }

    if (hasFile('requirements.txt') || hasFile('setup.py')) return 'Python Project';
    if (hasFile('Cargo.toml')) return 'Rust Project';
    if (hasFile('go.mod')) return 'Go Project';
    if (hasFile('pom.xml')) return 'Java Maven Project';
    if (hasFile('build.gradle')) return 'Java Gradle Project';
    if (hasFile('composer.json')) return 'PHP Project';
    if (hasFile('Gemfile')) return 'Ruby Project';

    return 'Unknown Project Type';
  }

  public static detectTechStack(files: FileMetadata[]): string[] {
    const techStack: Set<string> = new Set();

    files.forEach(file => {
      const fileName = path.basename(file.path);
      const ext = file.extension;

      // Languages
      if (ext === '.ts' || ext === '.tsx') techStack.add('TypeScript');
      if (ext === '.js' || ext === '.jsx' || ext === '.mjs') techStack.add('JavaScript');
      if (ext === '.py') techStack.add('Python');
      if (ext === '.java') techStack.add('Java');
      if (ext === '.go') techStack.add('Go');
      if (ext === '.rs') techStack.add('Rust');
      if (ext === '.rb') techStack.add('Ruby');
      if (ext === '.php') techStack.add('PHP');

      // Frameworks and tools
      if (fileName === 'package.json' && file.content) {
        try {
          const pkg = JSON.parse(file.content);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };

          if (deps.react) techStack.add('React');
          if (deps.vue) techStack.add('Vue.js');
          if (deps['@angular/core']) techStack.add('Angular');
          if (deps.next) techStack.add('Next.js');
          if (deps.nuxt) techStack.add('Nuxt.js');
          if (deps.express) techStack.add('Express.js');
          if (deps.fastify) techStack.add('Fastify');
          if (deps.nestjs) techStack.add('NestJS');
          if (deps.vscode) techStack.add('VS Code Extension API');
          if (deps.electron) techStack.add('Electron');
          if (deps.jest || deps.mocha || deps.vitest) techStack.add('Testing Framework');
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    return Array.from(techStack);
  }
}
