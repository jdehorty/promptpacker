# PromptPacker 🚀

**Pack It. Prompt It. Ship It.**

PromptPacker is the ultimate VS Code extension for AI developers, prompt engineers, and anyone working with Large Language Models (LLMs). Transform scattered code files into perfectly formatted, context-rich prompts for ChatGPT, Claude, Copilot, and other AI assistants with just one click.

## ✨ Why PromptPacker?

Stop wasting time manually copying and organizing code files for AI interactions. PromptPacker streamlines your workflow from development to AI consultation, making you more productive and your AI conversations more effective.

**Perfect for:**
- 🤖 **AI-Assisted Development** - Share entire codebases with ChatGPT/Claude
- 🛠️ **Code Reviews** - Package code for AI-powered analysis  
- 🎓 **Learning & Teaching** - Create comprehensive code examples
- 🔍 **Debugging** - Get AI help with context-aware troubleshooting
- 📝 **Documentation** - Generate docs from organized code samples

## 🎯 Core Features

### 📦 **Pack Code for AI**
Instantly combine multiple files into a clean, AI-ready format. Perfect for quick consultations and code sharing.

### 🎯 **Pack Code with File Context** 
Preserve file structure and relationships with intelligent path annotations. Your AI assistant will understand your project architecture.

### ⚡ **Multi-File Magic**
Right-click on multiple selected files or entire folders - PromptPacker handles the rest automatically.

### 🧠 **AI-Optimized Output**
Output is specifically formatted for optimal LLM consumption, with clean separators and logical organization.

## 🚀 Quick Start

1. **Right-click** on any file, folder, or multiple selected files in VS Code Explorer
2. **Choose your packing style:**
   - `📦 Pack Code for AI` - Clean, combined output
   - `🎯 Pack Code with File Context` - Includes file paths and structure
3. **Paste into your favorite AI** - ChatGPT, Claude, Copilot, or any LLM
4. **Get better AI responses** with rich context!

## 💡 Example Workflow

### Before PromptPacker:
```
😩 Copy file1.js manually
😩 Copy file2.js manually  
😩 Copy file3.js manually
😩 Explain project structure to AI
😩 AI gives generic response
```

### After PromptPacker:
```
🎯 Right-click → Pack Code with File Context
✨ Perfect prompt ready in clipboard
🤖 AI understands your entire project
🚀 Get specific, actionable advice
```

## 📁 Example Output

### Project Structure:
```
my-app/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── utils/
│       └── helpers.js
└── package.json
```

### PromptPacker Output (with Context):
```javascript
// src/components/Header.tsx
import React from 'react';

export const Header = () => {
  return <header>My App</header>;
};

// src/components/Footer.tsx  
import React from 'react';

export const Footer = () => {
  return <footer>&copy; 2024</footer>;
};

// src/utils/helpers.js
export const formatDate = (date) => {
  return date.toLocaleDateString();
};

// package.json
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  }
}
```

## 🎯 Pro Tips for AI Conversations

1. **Use File Context** when asking about architecture or relationships
2. **Pack Clean Code** for focused debugging sessions
3. **Include package.json** to help AI understand your tech stack
4. **Select relevant folders only** to stay within AI token limits
5. **Follow up with specific questions** about the packed code

## 🛠️ Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "PromptPacker"
4. Click Install

### Manual Installation
```bash
code --install-extension promptpacker
```

## 🤝 Perfect AI Companions

PromptPacker works seamlessly with:
- **ChatGPT** (GPT-4, GPT-3.5)
- **Claude** (Sonnet, Haiku, Opus)
- **GitHub Copilot Chat**
- **Perplexity AI**
- **Google Bard**
- **Any LLM with text input**

## 🎨 Coming Soon

- 🎛️ **Custom Templates** - Define your own packing formats
- 🔍 **Smart Filtering** - Exclude node_modules, .git automatically  
- 📊 **Token Counter** - See estimated token usage before packing
- 🎨 **Syntax Highlighting** - Preserve code formatting in output
- 🔗 **AI Integration** - Direct connection to popular AI services

## 💬 Community & Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/promptpacker/promptpacker-vscode/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/promptpacker/promptpacker-vscode/discussions)
- 🎉 **Show & Tell**: Share your AI wins with #PromptPacker

## 📜 License

MIT License - Feel free to contribute and make PromptPacker even better!

---

**Ready to revolutionize your AI workflow?**

🚀 **Pack It. Prompt It. Ship It.** 🚀