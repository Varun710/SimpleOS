import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { useTerminalStore } from "@/stores/terminal-store";
import { os } from "@/os/os-core";

interface TerminalViewProps {
  tabId: string;
}

const getPrompt = (cwd: string): string => {
  const displayPath = cwd || "~";
  return `user@browser-os:${displayPath}$ `;
};


export function TerminalView({ tabId }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const [osTheme, setOsTheme] = useState<"light" | "dark">(os.settings.getTheme());

  const {
    tabs,
    updateTabHistory,
    updateCwd,
    addCommandToHistory,
    navigateHistory,
    settings,
  } = useTerminalStore();

  // Listen for OS theme changes
  useEffect(() => {
    const handleThemeChange = (newTheme: "light" | "dark") => {
      setOsTheme(newTheme);
    };
    os.bus.on("theme-changed", handleThemeChange);
    return () => os.bus.off("theme-changed", handleThemeChange);
  }, []);

  const tab = tabs.find((t) => t.id === tabId);

  useEffect(() => {
    if (!terminalRef.current || !tab) return;

    // Initialize terminal
    const terminal = new Terminal({
      fontSize: settings.fontSize,
      fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
      cursorStyle: settings.cursorStyle,
      scrollback: settings.scrollback,
      theme: {
        background: osTheme === "dark" ? "#1e1e1e" : "#ffffff",
        foreground: osTheme === "dark" ? "#d4d4d4" : "#000000",
        cursor: osTheme === "dark" ? "#aeafad" : "#000000",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5",
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(terminalRef.current);

    // Fit terminal to container
    fitAddon.fit();

    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Write initial prompt
    const prompt = getPrompt(tab.cwd);
    terminal.writeln("Welcome to Browser-OS Terminal");
    terminal.write(prompt);

    // Define handleCommand function inside useEffect so it's accessible to handleInput
    const handleCommand = async (command: string) => {
      // Get the latest tab from store to ensure we have current state
      const currentTab = useTerminalStore.getState().tabs.find((t) => t.id === tabId);
      if (!currentTab) return;

      if (!command) {
        const prompt = getPrompt(currentTab.cwd);
        terminalInstanceRef.current?.write(prompt);
        return;
      }

      isProcessingRef.current = true;
      addCommandToHistory(tabId, command);

      // Handle built-in commands
      if (command === "clear") {
        terminalInstanceRef.current?.clear();
        const prompt = getPrompt(currentTab.cwd);
        terminalInstanceRef.current?.write(prompt);
        isProcessingRef.current = false;
        return;
      }

      if (command === "help") {
        const helpText = `
Available commands:
  ls          - List files and directories
  cd <dir>    - Change directory
  pwd         - Print working directory
  mkdir <dir> - Create directory
  rm <file>   - Remove file or directory
  echo <text> - Echo text
  clear       - Clear terminal
  help        - Show this help
`;
        terminalInstanceRef.current?.write(helpText);
        updateTabHistory(tabId, command, helpText);
        const prompt = getPrompt(currentTab.cwd);
        terminalInstanceRef.current?.write(prompt);
        isProcessingRef.current = false;
        return;
      }

      // Handle built-in shell commands with virtual FS
      if (command === "pwd") {
        const output = currentTab.cwd || "~\r\n";
        terminalInstanceRef.current?.write(output);
        updateTabHistory(tabId, command, output);
        const prompt = getPrompt(currentTab.cwd);
        terminalInstanceRef.current?.write(prompt);
        isProcessingRef.current = false;
        return;
      }

      if (command.startsWith("ls")) {
        try {
          const files = os.fs.list(currentTab.cwd);
          const output =
            files.length === 0
              ? "\r\n"
              : files
                  .map((f) => f.name + (f.isFolder ? "/" : ""))
                  .join("  ") + "\r\n";
          terminalInstanceRef.current?.write(output);
          updateTabHistory(tabId, command, output);
        } catch (error) {
          const errorMsg = `\r\nls: ${error instanceof Error ? error.message : "Unknown error"}\r\n`;
          terminalInstanceRef.current?.write(errorMsg);
          updateTabHistory(tabId, command, errorMsg);
        }
        const prompt = getPrompt(currentTab.cwd);
        terminalInstanceRef.current?.write(prompt);
        isProcessingRef.current = false;
        return;
      }

      if (command.startsWith("cd ")) {
        const newDir = command.substring(3).trim();
        let newCwd = currentTab.cwd;

        if (newDir === "..") {
          // Go up one directory
          if (currentTab.cwd === "") {
            // Already at root, stay at root
            newCwd = "";
          } else {
            const parts = currentTab.cwd.split("/").filter(Boolean);
            parts.pop();
            newCwd = parts.join("/");
          }
        } else if (newDir === "~" || newDir === "") {
          newCwd = "";
        } else if (!newDir.startsWith("/")) {
          // Relative path
          newCwd = currentTab.cwd ? `${currentTab.cwd}/${newDir}` : newDir;
        } else {
          // Absolute path
          newCwd = newDir.replace(/^\//, "");
        }

        // Validate directory exists (root "" always exists)
        if (newCwd === "" || os.fs.exists(newCwd)) {
          updateCwd(tabId, newCwd);
          // Use newCwd for prompt since tab.cwd hasn't updated yet
          const prompt = getPrompt(newCwd);
          terminalInstanceRef.current?.write(prompt);
        } else {
          terminalInstanceRef.current?.write(
            `\r\ncd: ${newDir}: No such file or directory\r\n`
          );
          const prompt = getPrompt(currentTab.cwd);
          terminalInstanceRef.current?.write(prompt);
        }
        isProcessingRef.current = false;
        return;
      }

      if (command.startsWith("mkdir ")) {
        const dirName = command.substring(6).trim();
        if (!dirName) {
          terminalInstanceRef.current?.write("\r\nmkdir: missing operand\r\n");
        } else {
          try {
            os.fs.createFolder(dirName, currentTab.cwd);
            updateTabHistory(tabId, command, "");
          } catch (error) {
            const errorMsg = `\r\nmkdir: ${error instanceof Error ? error.message : "Unknown error"}\r\n`;
            terminalInstanceRef.current?.write(errorMsg);
            updateTabHistory(tabId, command, errorMsg);
          }
        }
        const prompt = getPrompt(currentTab.cwd);
        terminalInstanceRef.current?.write(prompt);
        isProcessingRef.current = false;
        return;
      }

      if (command.startsWith("rm ")) {
        const fileName = command.substring(3).trim();
        if (!fileName) {
          terminalInstanceRef.current?.write("\r\nrm: missing operand\r\n");
        } else {
          try {
            const fullPath = currentTab.cwd ? `${currentTab.cwd}/${fileName}` : fileName;
            const deleted = os.fs.deleteFile(fullPath);
            if (!deleted) {
              terminalInstanceRef.current?.write(
                `\r\nrm: ${fileName}: No such file or directory\r\n`
              );
              updateTabHistory(tabId, command, `Error: ${fileName} not found`);
            } else {
              updateTabHistory(tabId, command, "");
            }
          } catch (error) {
            const errorMsg = `\r\nrm: ${error instanceof Error ? error.message : "Unknown error"}\r\n`;
            terminalInstanceRef.current?.write(errorMsg);
            updateTabHistory(tabId, command, errorMsg);
          }
        }
        const prompt = getPrompt(currentTab.cwd);
        terminalInstanceRef.current?.write(prompt);
        isProcessingRef.current = false;
        return;
      }

      if (command.startsWith("echo ")) {
        const text = command.substring(5);
        const output = text + "\r\n";
        terminalInstanceRef.current?.write(output);
        updateTabHistory(tabId, command, output);
        const prompt = getPrompt(currentTab.cwd);
        terminalInstanceRef.current?.write(prompt);
        isProcessingRef.current = false;
        return;
      }

      // Handle unknown commands - show "command not found"
      const commandName = command.split(" ")[0];
      const errorMsg = `\r\n${commandName}: command not found\r\n`;
      terminalInstanceRef.current?.write(errorMsg);
      updateTabHistory(tabId, command, errorMsg);

      // Get latest tab again in case cwd changed
      const latestTab = useTerminalStore.getState().tabs.find((t) => t.id === tabId);
      const prompt = getPrompt(latestTab?.cwd || "");
      terminalInstanceRef.current?.write(prompt);
      isProcessingRef.current = false;
    };

    // Handle terminal input
    let currentInput = "";
    let cursorPosition = 0;

    const handleInput = (data: string) => {
      // Get the latest tab from store to ensure we have current cwd
      const currentTab = useTerminalStore.getState().tabs.find((t) => t.id === tabId);
      const currentCwd = currentTab?.cwd || "";

      // Normal mode handling
      if (isProcessingRef.current) return;

      // Handle special keys
      if (data === "\r" || data === "\n") {
        // Enter key
        terminal.write("\r\n");
        handleCommand(currentInput.trim());
        currentInput = "";
        cursorPosition = 0;
        return;
      }

      if (data === "\x7f" || data === "\b") {
        // Backspace
        if (currentInput.length > 0 && cursorPosition > 0) {
          currentInput =
            currentInput.slice(0, cursorPosition - 1) +
            currentInput.slice(cursorPosition);
          cursorPosition--;
          terminal.write("\b \b");
        }
        return;
      }

      if (data === "\x1b[A") {
        // Arrow up - history
        const prevCommand = navigateHistory(tabId, "up");
        if (prevCommand !== null) {
          // Clear current line
          terminal.write("\r" + " ".repeat(currentInput.length + getPrompt(currentCwd).length));
          terminal.write("\r" + getPrompt(currentCwd));
          currentInput = prevCommand;
          cursorPosition = currentInput.length;
          terminal.write(currentInput);
        }
        return;
      }

      if (data === "\x1b[B") {
        // Arrow down - history
        const prevCommand = navigateHistory(tabId, "down");
        if (prevCommand !== null) {
          terminal.write("\r" + " ".repeat(currentInput.length + getPrompt(currentCwd).length));
          terminal.write("\r" + getPrompt(currentCwd));
          currentInput = prevCommand;
          cursorPosition = currentInput.length;
          terminal.write(currentInput);
        } else {
          // Clear line
          terminal.write("\r" + " ".repeat(currentInput.length + getPrompt(currentCwd).length));
          terminal.write("\r" + getPrompt(currentCwd));
          currentInput = "";
          cursorPosition = 0;
        }
        return;
      }

      if (data === "\t") {
        // Tab completion (simple implementation)
        // TODO: Implement tab completion
        return;
      }

      // Regular character input
      if (data.length === 1 && data.charCodeAt(0) >= 32) {
        currentInput =
          currentInput.slice(0, cursorPosition) +
          data +
          currentInput.slice(cursorPosition);
        cursorPosition++;
        terminal.write(data);
      }
    };

    terminal.onData(handleInput);

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
    };
  }, [tabId, settings, osTheme]);

  // Update terminal when settings change
  useEffect(() => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.options.fontSize = settings.fontSize;
      terminalInstanceRef.current.options.cursorStyle = settings.cursorStyle;
      terminalInstanceRef.current.options.scrollback = settings.scrollback;
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }
  }, [settings]);

  // Update terminal theme when OS theme changes
  useEffect(() => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.options.theme = {
        background: osTheme === "dark" ? "#1e1e1e" : "#ffffff",
        foreground: osTheme === "dark" ? "#d4d4d4" : "#000000",
        cursor: osTheme === "dark" ? "#aeafad" : "#000000",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5",
      };
    }
  }, [osTheme]);


  if (!tab) {
    return <div>Tab not found</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div ref={terminalRef} className="flex-1 w-full h-full" />
    </div>
  );
}

