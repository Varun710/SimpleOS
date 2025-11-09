# 🖥️ SimpleOS — Browser-Based Operating System

> **A fully functional browser-based OS prototype built with AI assistance**  
> Demonstrating the power of AI-assisted development using Cursor (Composer 1, Plan mode + Agent mode)

## 📖 Overview

SimpleOS is a **browser-based operating system prototype** that provides a complete desktop-like experience running entirely in your web browser. Built as a hackathon project and refined with AI assistance, it showcases how modern web technologies can create immersive, OS-like interfaces.

The project demonstrates rapid development capabilities when AI tools like Cursor are used as collaborative coding partners, enabling the creation of complex, feature-rich applications in record time.

### 🎯 Project Goals

- **Demonstrate AI-assisted development** — Showcase how AI can accelerate complex UI/UX development
- **Create a functional OS experience** — Provide a complete desktop environment with multiple apps
- **Explore modern web technologies** — Leverage React, TypeScript, and modern tooling
- **Rapid prototyping** — Build and iterate quickly with AI assistance

---

## ✨ Features

### 🎨 Core OS Features

- **Window Management** — Drag, resize, minimize, maximize, and close windows
- **Dock & Taskbar** — macOS-inspired dock with running apps and quick access
- **Start Menu** — Launch apps from a searchable application menu
- **Spotlight Search** — Quick app launcher with fuzzy search (⌘+Space)
- **Desktop Icons** — Organize and access apps from the desktop
- **Theme Support** — Light and dark mode with system preference detection
- **Customizable Wallpaper** — Multiple built-in wallpapers and settings

### 📱 Built-in Applications

| Application        | Description                   | Key Features                                                                      |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------- |
| **🤖 AI Chat**     | OpenAI-powered chat interface | Real-time conversations, no data storage, user-provided API key                   |
| **🌐 Web Browser** | Full-featured browser         | Navigate any URL, supports localhost within localhost, tabbed browsing            |
| **✨ App Creator** | AI-powered app generator      | Generate functional apps from natural language prompts                            |
| **💻 Terminal**    | Shell-like terminal emulator  | Multiple tabs, command history, Python execution, virtual file system integration |
| **📷 Camera**      | Webcam capture                | Take photos using device webcam, macOS-style UI                                   |
| **📅 Calendar**    | Event and task management     | Create events, tasks, widget support for desktop                                  |
| **📝 Notes**       | Note-taking app               | Rich text editing, folder organization, file system integration                   |
| **📁 Files**       | File manager                  | Virtual file system, folder navigation, file operations                           |
| **⚙️ Settings**    | System preferences            | Wallpaper selection, theme toggle, system configuration                           |

### 🎯 Widgets & Extras

- **Weather Widget** — Real-time weather for current location (API-based)
- **Calendar Widget** — Desktop calendar with upcoming events
- **Drag & Drop** — Full drag-and-drop support throughout the OS
- **Keyboard Shortcuts** — Power user shortcuts for navigation
- **Persistent Storage** — LocalForage/IndexedDB for app state persistence

---

## 🛠️ Tech Stack

### Frontend

- **React 19.1** — Modern React with latest features
- **TypeScript 5.9** — Type-safe development
- **Vite 7.1** — Lightning-fast build tool and dev server
- **Tailwind CSS 4.1** — Utility-first CSS framework
- **Framer Motion** — Smooth animations and transitions
- **Zustand** — Lightweight state management
- **Shadcn UI** — High-quality component library
- **Radix UI** — Accessible component primitives
- **xterm.js** — Terminal emulator for Terminal app
- **LocalForage** — Offline storage with IndexedDB fallback

### Backend (Optional)

- **Express.js** — Node.js server for API endpoints
- **WebSocket (ws)** — Real-time communication for Terminal
- **OpenAI API** — AI chat and app generation features

### Development Tools

- **ESLint** — Code linting and quality
- **TypeScript ESLint** — TypeScript-specific linting rules
- **pnpm** — Fast, disk-efficient package manager

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **pnpm** 9+ ([Install pnpm](https://pnpm.io/installation))

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/<your-username>/simpleos.git
   cd simpleos
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start the development server**

   ```bash
   pnpm dev
   ```

4. **Open your browser**
   ```
   Navigate to http://localhost:5173
   ```

### Building for Production

```bash
# Build the project
pnpm build

# Preview the production build
pnpm preview
```

### Running with Backend Services

Some features (Terminal, AI Chat, App Creator) require backend services:

```bash
# Start the backend server (if available)
node server.js

# Or run both frontend and backend concurrently
pnpm dev
```

**Note:** For AI Chat and App Creator features, you'll need to provide your OpenAI API key when prompted. The key is stored locally and never sent to any server except OpenAI.

---

## 📁 Project Structure

```
browser-os/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── chat/           # Chat app components
│   │   ├── terminal/       # Terminal app components
│   │   ├── ui/             # Shadcn UI components
│   │   └── widgets/        # Desktop widgets
│   ├── os/
│   │   ├── apps/           # Application components
│   │   ├── os-core.ts      # Core OS functionality
│   │   └── window-manager.ts # Window management logic
│   ├── services/           # API service layers
│   ├── stores/             # Zustand state stores
│   └── WebOS.tsx           # Main OS component
├── public/                 # Static assets
├── server.js               # Backend server (optional)
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies and scripts
```

---

## 🧠 Development Philosophy

This project was built using Cursor, demonstrating a new paradigm of human-AI collaboration:

### Development Workflow

1. **Planning** — Use Cursor's Plan mode to break down features
2. **Generation** — Let Cursor generate code in Agent mode
3. **Iteration** — Refine with natural language feedback
4. **Polish** — UI tweaks, bug fixes, and enhancements

---

## ⚠️ Important Notes

### Not Production Ready

This is a **prototype and demonstration project**. It is **not intended for production use** and does **not** include:

- ❌ User authentication or authorization
- ❌ Security hardening or input sanitization
- ❌ Multi-user support
- ❌ Data persistence across devices
- ❌ Protected API endpoints
- ❌ Error recovery or resilience features

### Data & Privacy

- **All data is stored locally** in your browser (IndexedDB/LocalStorage)
- **No backend data storage** — everything runs client-side
- **OpenAI API keys** are stored locally and only sent to OpenAI
- **No telemetry or analytics** — completely private

---

## 🎨 Customization

### Changing the Wallpaper

1. Open **Settings** app
2. Navigate to **Appearance**
3. Select from available wallpapers or add your own

### Adding Custom Apps

Apps are registered in `src/WebOS.tsx`. To add a new app:

1. Create your app component in `src/os/apps/`
2. Register it in the `apps` array
3. Add an icon and description
4. Optionally add a desktop icon

### Theming

The project uses Tailwind CSS with CSS variables for theming. Customize colors in:

- `src/index.css` — CSS variables
- `tailwind.config.js` — Tailwind theme configuration

---

## 🙏 Acknowledgments

- Built with [Cursor](https://cursor.com/) — AI-powered code editor
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Terminal emulation via [xterm.js](https://xtermjs.org/)
- Icons from [Lucide React](https://lucide.dev/)
- Animations powered by [Framer Motion](https://www.framer.com/motion/)

---

**Built with ❤️ and AI assistance**

_This project showcases the potential of AI-assisted development. While not production-ready, it demonstrates how quickly complex, polished applications can be built when humans and AI work together._
