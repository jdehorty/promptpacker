# PromptPacker 🚀

**Pack It. Prompt It. Ship It.**

PromptPacker is the ultimate VS Code extension for AI developers, prompt engineers, and anyone working with Large Language Models (LLMs). Transform scattered code files into perfectly formatted, context-rich prompts for modern AI models with intelligent filtering and LLM-optimized output.

<div align="center">
  <img src="images/logo.png" alt="PromptPacker Logo" width="80%">
</div>

## ✨ What Makes PromptPacker Special?

Stop wasting time manually copying and organizing code files for AI interactions. PromptPacker uses intelligent filtering and context preservation to create perfectly curated prompts that help AI models understand your codebase architecture and provide better responses.

### 🎯 **Intelligent Content Curation**
- **Smart Filtering**: Automatically excludes binaries, build artifacts, and noise
- **Relevance Scoring**: Prioritizes files based on architectural importance
- **Size Management**: Respects token limits with intelligent truncation
- **Context Preservation**: Maintains file relationships without clutter

### 🧠 **LLM-Optimized Output Formats**
- **AI-Optimized**: XML structure designed for advanced reasoning models
- **Standard Format**: Clean concatenation for quick consultations with any LLM
- **Markdown Format**: Documentation-friendly output with syntax highlighting

### ⚙️ **Configurable Intelligence**
- **`.promptpackerrc`**: Project-specific filtering and preferences
- **VS Code Settings**: Global configuration integration
- **Glob Patterns**: Flexible include/exclude rules
- **Size Limits**: Configurable file and total size restrictions

## 🚀 Quick Start

### 📦 **Basic Usage**
1. **Right-click** on files/folders in VS Code Explorer
2. **Choose your command:**
   - `📦 Pack Code for AI Analysis` - Intelligent LLM-optimized output
   - `👁️ Preview Packed Output` - See what will be included
   - `⚙️ Configure PromptPacker` - Set up project preferences

### 🎯 **Advanced Features**
- **Multi-file Selection**: Process entire folders or specific file selections
- **Real-time Preview**: HTML preview panel with statistics and formatting
- **Token Estimation**: Rough token count to stay within LLM limits
- **Status Bar Integration**: Real-time feedback during processing

## 📊 **Output Example**

### AI-Optimized Format:
```xml
<codebase_analysis>
  <project_overview>
    <name>my-react-app</name>
    <type>React Application</type>
    <tech_stack>TypeScript, React, Node.js</tech_stack>
    <entry_points>src/index.tsx, src/App.tsx</entry_points>
  </project_overview>
  
  <architecture>
    <directory_structure>
      src/
      ├── components/
      │   ├── Header.tsx
      │   └── UserProfile.tsx
      ├── hooks/
      │   └── useUserData.ts
      └── types/
          └── User.ts
    </directory_structure>
  </architecture>
  
  <source_files>
    <file path="src/components/UserProfile.tsx">
      <!-- Relevance: 95% -->
      import { User } from '../types/User';
      import { useUserData } from '../hooks/useUserData';
      
      export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
        const { user, loading, error } = useUserData(userId);
        // ... component logic
      };
    </file>
  </source_files>
</codebase_analysis>
```

## ⚙️ **Configuration**

### Project Configuration (`.promptpackerrc`)
```json
{
  "ignore": [
    "**/*.test.{js,ts,jsx,tsx}",
    "**/*.spec.{js,ts,jsx,tsx}",
    "**/coverage/**",
    "**/.env*"
  ],
  "include": [
    "src/**/*.{js,ts,jsx,tsx}",
    "**/*.md",
    "package.json"
  ],
  "maxFileSize": "100kb",
  "maxTotalSize": "1mb",
      "outputFormat": "ai-optimized"
}
```

### VS Code Settings
```json
{
  "promptpacker.outputFormat": "ai-optimized",
  "promptpacker.maxFileSize": "100kb",
  "promptpacker.preserveStructure": true
}
```

## 🛠️ **Installation**

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"PromptPacker"**
4. Click **Install**

### Command Line
```bash
code --install-extension promptpacker.promptpacker
```

## 🤖 **Perfect AI Companions**

**Optimized for:**
- **Advanced reasoning models** - Native XML format support
- **Code-specialized models** - Optimized for code analysis  
- **Multimodal models** - Rich context understanding
- **In-editor AI assistants** - Seamless integration
- **Research-focused AI** - Comprehensive analysis
- **Modern LLMs** - Flexible output formats

## 🎯 **Use Cases**

### 🤖 **AI-Assisted Development**
Get better code reviews, architectural advice, and implementation suggestions by providing well-structured codebase context.

### 🔍 **Debugging & Troubleshooting**
Share relevant code sections with AI assistants for faster problem diagnosis and solution recommendations.

### 📚 **Learning & Teaching**
Create comprehensive code examples that preserve project structure and relationships for educational content.

### 📝 **Documentation Generation**
Generate technical documentation by providing AI models with organized, contextual code samples.

## 📈 **Performance & Intelligence**

- **80%+ Noise Reduction**: Smart filtering eliminates irrelevant files
- **Relevance-Based Prioritization**: Important files surface first
- **Token-Aware Processing**: Respects LLM context limits
- **45% Smaller Bundles**: Optimized with Bun for faster processing
- **Project Type Detection**: Automatically identifies frameworks and patterns

## 🔧 **Development & Contributing**

Built with modern technologies:
- **Pure Bun Runtime**: 25x faster package management and building
- **TypeScript**: Full type safety with strict mode
- **Native ES Modules**: Modern JavaScript with optimal bundling
- **VS Code API**: Following modern best practices

### Local Development
```bash
# Clone and setup
git clone https://github.com/jdehorty/promptpacker
cd promptpacker
bun install

# Development workflow
bun run dev          # Start development build
bun run build        # Production build
bun run test         # Run tests
bun run vscode:package # Create VSIX package
```

## 🆕 **Latest Features**

- 🧠 **Intelligent Filtering**: Advanced file classification and relevance scoring
- 🎯 **LLM-Optimized Formats**: AI-optimized XML output for better understanding
- ⚡ **Performance**: 45% smaller bundles with pure Bun runtime
- 🔧 **Configuration**: Flexible `.promptpackerrc` and VS Code settings integration
- 👁️ **Preview Panel**: Real-time HTML preview with statistics
- 📊 **Token Estimation**: Rough token counting for LLM planning

## 🌟 **Community & Support**

- 🐛 **Issues**: [GitHub Issues](https://github.com/jdehorty/promptpacker/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/jdehorty/promptpacker/discussions)
- 📖 **Documentation**: [Full Documentation](https://github.com/jdehorty/promptpacker)
- 🎉 **Show & Tell**: Share your AI wins with `#PromptPacker`

## 📜 **License**

MIT License - See [LICENSE](LICENSE) for details.

---

**Ready to revolutionize your AI workflow?**

🚀 **Pack It. Prompt It. Ship It.** 🚀

*Transform your scattered code into AI-ready insights with one click.*