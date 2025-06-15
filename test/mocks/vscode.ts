// Mock VS Code API for testing
export const vscode = {
  window: {
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    createStatusBarItem: vi.fn(() => ({
      text: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    })),
    createWebviewPanel: vi.fn(() => ({
      webview: {
        html: '',
      },
    })),
  },
  workspace: {
    workspaceFolders: [],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
    })),
    openTextDocument: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  env: {
    clipboard: {
      writeText: vi.fn(),
    },
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ViewColumn: {
    One: 1,
    Two: 2,
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
  },
};

vi.mock('vscode', () => vscode);