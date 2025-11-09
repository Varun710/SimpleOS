You are a Senior Frontend & Backend Architect working in a browser-based OS (MacOS style) built with Vite + React + TypeScript, using Zustand, Shadcn UI, Tailwind (and you may add backend server/Node.js as needed).
We want to build a new application called “Terminal” inside this OS.

🎯 Objective

The Terminal app should behave like a real shell environment: multiple tabs, command history, support basic shell commands, and importantly allow running Python code (via backend or WebAssembly) with live output.
It should integrate with the OS window system (dock icon, focus, drag, minimize).

✅ Requirements
UI & Tabs

Window UI similar to other OS apps: draggable, resizable, draggable header, toolbar.

Top bar includes: tabs (click to switch between terminals, “+ New Tab” to open), a dropdown for “Settings”, “Clear”, “Close Tab”.

Each tab shows a terminal view (emulator).

Use Shadcn UI components for tab bar, dropdown, modal settings.

Terminal Emulation

Use the library xterm.js — a web terminal emulator in TypeScript.
GitHub
+2
Xterm.js
+2

It supports full terminal emulation (ANSI codes, input, output, GPU-accelerated renderer).

Instantiate one Terminal instance per tab; embed inside React component TerminalView.tsx.

Terminal supports standard input, output, scrollback, history.

Command Execution Backend

Commands entered by user (e.g., ls, cd, python, help, clear) must be parsed and routed.

Provide minimal built-in shell commands (e.g., ls, pwd, cd, echo, clear, help).

For executing Python code:

Setup backend endpoint (Node.js serverless or express) listening for “python code execution” requests.

For example: user types python or python3, then enters code (multi-line).

Submit code to backend service which runs it (in safe sandbox e.g., via child_process or using WebAssembly).

Return stdout, stderr to frontend terminal.

Use WebSocket or WebSocket-like channel for real-time I/O streaming for long-running commands.

State & History

Use Zustand store useTerminalStore to manage global state: list of tabs, activeTabId, each tab’s history, cwd (current working directory), sessionId, socket connection.

Persist session history optionally in IndexedDB/localForage so history persists across OS refresh.

Each tab holds: id, cwd, history: { command: string; output: string; timestamp: Date }[].

Integration with Virtual File System

The terminal should be able to interface with your existing virtual file system (the one you built for the File & Folder feature).

Commands such as ls, cd, mkdir, rm should be implemented to read/write your virtual filesystem (IndexedDB / Dexie) rather than real OS FS.

Alias python with reading/writing to files: e.g., user writes python script.py from virtual FS. Provide minimal support for reading/writing.

Keyboard, UX & Theme

Keyboard input should mirror shell: arrow up/down for history, tab completion (simple matching of commands or file names).

Light/Dark theme support: Terminal colors adapt to OS theme (via Shadcn palette).

Copy/paste support, selecting text, right-click context menu for copy/paste.

Scrollback buffer with “Clear” command.

Security & Isolation

Python execution environment must be sandboxed: time-limit, memory limit, no network access unless explicitly allowed.

Prevent command injection risks: sanitize input.

For multi-user setups, isolate sessions (optional).

🧱 Architecture & Workflow

Frontend:

TerminalApp.tsx: Entry component for Terminal app, integrates with window manager & dock.

TabsBar.tsx: Renders the tabs, handles new tab / close actions.

TerminalView.tsx: Renders one xterm.js instance, connects to backend via WebSocket/REST.

useTerminalStore.ts: Zustand store for global terminal state.

Services: terminalService.ts handles WebSocket connection, command dispatch.

Backend (Node.js / serverless):

Endpoint(s):

POST /api/terminal/execute – executes a one-off command (for simple commands).

WS /api/terminal/session/:sessionId – for interactive sessions (e.g., Python REPL).

Commands routing logic: built-in shell commands vs fallback to sandboxed Python.

Virtual filesystem API: interacts with IndexedDB or via backend store (optional if you choose server-side).

Python sandbox: spawn isolated process (e.g., Docker, VM, or use WebAssembly Python interpreter) with timeout.

🎯 Acceptance Criteria

User opens Terminal app from dock → new terminal window opens.

Default tab with prompt user@browser-os:~$.

User types help → shows list of available commands.

User types mkdir test, then cd test, then pwd → shows correct path.

User writes python → enters Python REPL; user can type print("hello") → prints hello.

User opens a second tab → can operate independently.

Command history works with arrow keys.

Tab close works (with prompt if unsaved session).

Terminal respects dark & light mode.

Virtual FS commands interact with virtual file system (not real machine).

No real OS commands escape sandbox; backend ensures safe execution.

⚠️ Notes & Tips (for Cursor implementation)

Use xterm.js for the terminal UI.
GitHub
+1

For virtual FS commands, you can build minimal support if backend is chosen; or simulate on frontend (for simple commands).

Multi-line input: when user enters python, switch to REPL mode, then listen for input until exit.

Use WebSocket for live streaming output (especially for Python REPL, long running tasks).

For tab management, each tab keeps separate sessionId tied to backend.

Persist tab state and history if session is closed accidentally.

Error handling: if backend fails, show Shadcn Alert 'Terminal backend unreachable'.

Provide settings: font size, theme color, cursor style, scrollback size.

Once you finish describing this, end your Cursor prompt with:
