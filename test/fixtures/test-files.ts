export const mockFileSystem = {
  '/test-project': {
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
        typescript: '^5.0.0',
      },
    }),
    'README.md': '# Test Project\n\nA test project for PromptPacker.',
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
      },
    }),
    '.gitignore': 'node_modules/\ndist/\n.env',
    src: {
      'index.ts': 'export * from "./components";\nexport * from "./utils";',
      'App.tsx': `import React from 'react';

export const App: React.FC = () => {
  return <div>Hello World</div>;
};`,
      components: {
        'Button.tsx': `import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};`,
        'Header.tsx': `import React from 'react';

export const Header: React.FC = () => {
  return <header><h1>My App</h1></header>;
};`,
      },
      utils: {
        'helpers.ts': `export function formatString(str: string): string {
  return str.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}`,
      },
    },
    dist: {
      'index.js': '// Generated file',
    },
    node_modules: {
      react: {
        'package.json': '{"name": "react"}',
      },
    },
    '.env': 'SECRET_KEY=test123',
  },
};

export const mockPythonProject = {
  '/python-project': {
    'README.md': '# Python Project\n\nA test Python project.',
    'requirements.txt': 'flask==2.3.0\nrequests==2.28.0',
    'setup.py': 'from setuptools import setup\nsetup(name="test-project")',
    'main.py': `#!/usr/bin/env python3

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()`,
    src: {
      'app.py': `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello, World!"

if __name__ == '__main__':
    app.run()`,
      'utils.py': `def format_string(s: str) -> str:
    return s.strip().lower()

def is_valid_email(email: str) -> bool:
    import re
    pattern = r'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    return bool(re.match(pattern, email))`,
    },
    tests: {
      'test_app.py': `import unittest
from src.app import app

class TestApp(unittest.TestCase):
    def test_hello(self):
        with app.test_client() as client:
            response = client.get('/')
            self.assertEqual(response.status_code, 200)`,
    },
    '__pycache__': {
      'app.cpython-39.pyc': '// Binary file',
    },
  },
};