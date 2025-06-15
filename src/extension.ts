import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  let packCodeDisposable = vscode.commands.registerCommand('promptpacker.packCode', (...args: any[]) => {
    const uris: vscode.Uri[] = extractUniqueUris(args);

    if (uris.length > 0) {
      const filePaths: string[] = [];

      uris.forEach(uri => {
        if (uri instanceof vscode.Uri) {
          const isDirectory = fs.statSync(uri.fsPath).isDirectory();
          if (isDirectory) {
            const files = traverseFolder(uri.fsPath);
            filePaths.push(...files);
          } else {
            filePaths.push(uri.fsPath);
          }
        }
      });

      if (filePaths.length > 0) {
        packCodeFiles(filePaths);
      } else {
        vscode.window.showErrorMessage('No files found in the selected folders to pack.');
      }
    } else {
      vscode.window.showErrorMessage('Please select one or more files or folders to pack for AI prompts.');
    }
  });

  let packCodeWithContextDisposable = vscode.commands.registerCommand('promptpacker.packCodeWithContext', (...args: any[]) => {
    const uris: vscode.Uri[] = extractUniqueUris(args);

    if (uris.length > 0) {
      const filePaths: string[] = [];

      uris.forEach(uri => {
        if (uri instanceof vscode.Uri) {
          const isDirectory = fs.statSync(uri.fsPath).isDirectory();
          if (isDirectory) {
            const files = traverseFolder(uri.fsPath);
            filePaths.push(...files);
          } else {
            filePaths.push(uri.fsPath);
          }
        }
      });

      if (filePaths.length > 0) {
        packCodeFiles(filePaths, true);
      } else {
        vscode.window.showErrorMessage('No files found in the selected folders to pack with context.');
      }
    } else {
      vscode.window.showErrorMessage('Please select one or more files or folders to pack with file context for AI prompts.');
    }
  });

  context.subscriptions.push(packCodeDisposable, packCodeWithContextDisposable);
}

function extractUniqueUris(args: any[]): vscode.Uri[] {
  const flatArgs = flattenArray(args);

  // Object to keep track of URIs by their paths
  const uriMap: { [path: string]: vscode.Uri } = {};

  flatArgs.forEach(arg => {
    if (arg instanceof vscode.Uri) {
      const path = arg.fsPath;
      // Add URI to map if it's not already overridden by a parent directory
      if (!isOverriddenByParent(path, uriMap)) {
        uriMap[path] = arg;
      }
    }
  });

  // Filter out any URIs that are children of existing URIs
  const uniqueUris = Object.values(uriMap);

  return uniqueUris;
}

function flattenArray(arr: any[]): any[] {
  return arr.reduce((acc: any[], item: any) => {
    return Array.isArray(item)
      ? acc.concat(flattenArray(item))
      : acc.concat(item);
  }, []);
}

function isOverriddenByParent(path: string, uriMap: { [path: string]: vscode.Uri }): boolean {
  for (const existingPath in uriMap) {
    if (path.startsWith(existingPath) && path !== existingPath) {
      return true; // Path is a child of an existing path
    }
  }
  return false;
}

function packCodeFiles(filePaths: string[], includeFileContext: boolean = false) {
  let packedCode = '';

  filePaths.forEach((filePath) => {
    const relativePath = getRelativePath(filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const codeSnippet = includeFileContext ? `// ${relativePath}\n${fileContent.trim()}` : fileContent.trim();
    packedCode += `${codeSnippet}\n\n`;
  });

  const codePreview = packedCode.substr(0, 100);

  vscode.env.clipboard.writeText(packedCode)
    .then(() => {
      const fileCount = filePaths.length;
      const contextText = includeFileContext ? ' with file context' : '';
      const message = `🚀 PromptPacker: ${fileCount} file${fileCount > 1 ? 's' : ''} packed${contextText} and copied to clipboard!\n\nReady for AI prompting:\n${codePreview}...`;
      vscode.window.showInformationMessage(message);
    })
    .then(undefined, (error: any) => {
      vscode.window.showErrorMessage('PromptPacker failed to pack code to clipboard: ' + error);
    });
}

function getRelativePath(filePath: string): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath;
      if (filePath.startsWith(folderPath)) {
        const relativePath = path.relative(folderPath, filePath).replace(/\\/g, '/');
        return relativePath;
      }
    }
  }

  return filePath;
}

function traverseFolder(folderPath: string): string[] {
  let result: string[] = [];

  const files = fs.readdirSync(folderPath);

  files.forEach((file: any) => {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      result.push(filePath);
    } else if (stat.isDirectory()) {
      const nestedFiles = traverseFolder(filePath);
      result.push(...nestedFiles);
    }
  });

  return result;
}

export function deactivate() { }
