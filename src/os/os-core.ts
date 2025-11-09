// Event Bus for pub/sub communication
type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) return;
    const callbacks = this.events.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events.has(event)) return;
    this.events.get(event)!.forEach((callback) => callback(...args));
  }
}

// Virtual File System using localStorage
export interface FileMetadata {
  name: string;
  path: string; // full path including folder
  content: string;
  size: number;
  modified: number;
  created: number;
  isFolder: boolean;
}

class VirtualFileSystem {
  private storageKey = "browser-os-filesystem";

  private getStorage(): Map<string, FileMetadata> {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return new Map();
    try {
      return new Map(JSON.parse(data));
    } catch {
      return new Map();
    }
  }

  private setStorage(files: Map<string, FileMetadata>): void {
    localStorage.setItem(this.storageKey, JSON.stringify([...files]));
  }

  private normalizePath(path: string): string {
    // Handle undefined/null paths
    if (!path) return '';
    // Remove leading/trailing slashes and normalize
    return path.replace(/^\/+|\/+$/g, '');
  }

  writeFile(filename: string, content: string, folder: string = ""): void {
    const files = this.getStorage();
    const fullPath = folder ? `${this.normalizePath(folder)}/${filename}` : filename;
    const existing = files.get(fullPath);
    const now = Date.now();
    
    files.set(fullPath, {
      name: filename,
      path: fullPath,
      content,
      size: content.length,
      modified: now,
      created: existing?.created || now,
      isFolder: false,
    });
    
    this.setStorage(files);
  }

  createFolder(folderName: string, parentFolder: string = ""): void {
    const files = this.getStorage();
    const fullPath = parentFolder ? `${this.normalizePath(parentFolder)}/${folderName}` : folderName;
    
    if (files.has(fullPath)) {
      throw new Error("Folder already exists");
    }

    const now = Date.now();
    files.set(fullPath, {
      name: folderName,
      path: fullPath,
      content: "",
      size: 0,
      modified: now,
      created: now,
      isFolder: true,
    });
    
    this.setStorage(files);
  }

  readFile(path: string): string | null {
    const files = this.getStorage();
    const normalizedPath = this.normalizePath(path);
    
    // Try exact match first
    let file = files.get(normalizedPath);
    
    // If not found, try to find by iterating through all files
    if (!file) {
      for (const [filePath, fileData] of files) {
        const normalizedFilePath = this.normalizePath(filePath);
        // Match normalized paths or exact path
        if (normalizedFilePath === normalizedPath || filePath === normalizedPath || filePath === path) {
          file = fileData;
          break;
        }
      }
    }
    
    if (file && !file.isFolder) {
      return file.content;
    }
    return null;
  }

  deleteFile(path: string): boolean {
    const files = this.getStorage();
    const normalizedPath = this.normalizePath(path);
    
    // Try to find the file - check both normalized and original path
    let file: FileMetadata | undefined = undefined;
    let actualPath: string | null = null;
    
    // First try exact match with normalized path
    if (files.has(normalizedPath)) {
      file = files.get(normalizedPath);
      actualPath = normalizedPath;
    } else {
      // Try to find by iterating through all files
      for (const [filePath, fileData] of files) {
        const normalizedFilePath = this.normalizePath(filePath);
        // Match normalized paths or exact path
        if (normalizedFilePath === normalizedPath || filePath === normalizedPath || filePath === path) {
          file = fileData;
          actualPath = filePath; // Use the actual stored path
          break;
        }
      }
    }
    
    if (!file || !actualPath) {
      console.warn(`File not found at path: "${path}" (normalized: "${normalizedPath}")`);
      console.log('Available paths:', Array.from(files.keys()));
      return false;
    }

    // Delete the file or folder
    if (file.isFolder) {
      // Delete folder and all its contents
      const toDelete: string[] = [];
      for (const [filePath] of files) {
        // Match exact path or paths that start with folder path + "/"
        if (filePath === actualPath || filePath.startsWith(actualPath + "/")) {
          toDelete.push(filePath);
        }
      }
      toDelete.forEach(p => files.delete(p));
    } else {
      // Delete single file
      files.delete(actualPath);
    }
    
    this.setStorage(files);
    return true;
  }

  moveFile(sourcePath: string, targetFolder: string): boolean {
    const files = this.getStorage();
    const normalizedSource = this.normalizePath(sourcePath);
    const normalizedTarget = this.normalizePath(targetFolder);
    
    const sourceFile = files.get(normalizedSource);
    if (!sourceFile) {
      return false;
    }

    // Calculate new path
    const newPath = normalizedTarget 
      ? `${normalizedTarget}/${sourceFile.name}`
      : sourceFile.name;

    // Check if target already exists
    if (files.has(newPath)) {
      return false;
    }

    // If it's a folder, move all children
    if (sourceFile.isFolder) {
      const toMove: Array<{ oldPath: string; newPath: string; metadata: FileMetadata }> = [];
      
      // Collect all files to move
      for (const [path, metadata] of files) {
        if (path === normalizedSource || path.startsWith(normalizedSource + "/")) {
          const relativePath = path === normalizedSource 
            ? "" 
            : path.substring(normalizedSource.length + 1);
          const newFilePath = relativePath 
            ? `${newPath}/${relativePath}`
            : newPath;
          toMove.push({ oldPath: path, newPath: newFilePath, metadata });
        }
      }

      // Move all files
      toMove.forEach(({ oldPath }) => {
        files.delete(oldPath);
      });
      toMove.forEach(({ newPath, metadata }) => {
        files.set(newPath, { ...metadata, path: newPath });
      });
    } else {
      // Move single file
      files.delete(normalizedSource);
      files.set(newPath, { ...sourceFile, path: newPath });
    }

    this.setStorage(files);
    return true;
  }

  renameFile(path: string, newName: string): boolean {
    const files = this.getStorage();
    const normalizedPath = this.normalizePath(path);
    const file = files.get(normalizedPath);
    
    if (!file) {
      return false;
    }

    // Calculate new path
    const pathParts = normalizedPath.split("/");
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join("/");

    // Check if new name already exists
    if (files.has(newPath)) {
      return false;
    }

    // If it's a folder, rename all children paths
    if (file.isFolder) {
      const toRename: Array<{ oldPath: string; newPath: string; metadata: FileMetadata }> = [];
      
      for (const [filePath, metadata] of files) {
        if (filePath === normalizedPath || filePath.startsWith(normalizedPath + "/")) {
          const relativePath = filePath === normalizedPath 
            ? "" 
            : filePath.substring(normalizedPath.length + 1);
          const newFilePath = relativePath 
            ? `${newPath}/${relativePath}`
            : newPath;
          toRename.push({ oldPath: filePath, newPath: newFilePath, metadata });
        }
      }

      // Rename all files
      toRename.forEach(({ oldPath }) => {
        files.delete(oldPath);
      });
      toRename.forEach(({ newPath: np, metadata }) => {
        files.set(np, { ...metadata, path: np, name: np === newPath ? newName : metadata.name });
      });
    } else {
      // Rename single file
      files.delete(normalizedPath);
      files.set(newPath, { ...file, path: newPath, name: newName });
    }

    this.setStorage(files);
    return true;
  }

  exists(path: string): boolean {
    const files = this.getStorage();
    return files.has(this.normalizePath(path));
  }

  list(folder: string = ""): FileMetadata[] {
    const files = this.getStorage();
    const normalizedFolder = this.normalizePath(folder);
    const result: FileMetadata[] = [];

    for (const [path, metadata] of files) {
      if (normalizedFolder === "") {
        // Root folder: show only top-level items
        if (!path.includes("/")) {
          result.push(metadata);
        }
      } else {
        // Inside a folder: show direct children only
        const prefix = normalizedFolder + "/";
        if (path.startsWith(prefix)) {
          const relativePath = path.substring(prefix.length);
          if (!relativePath.includes("/")) {
            result.push(metadata);
          }
        }
      }
    }

    // Sort: folders first, then files, alphabetically
    return result.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  getAllFiles(): FileMetadata[] {
    const files = this.getStorage();
    return Array.from(files.values());
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}

// Settings management with theme
export type Theme = "light" | "dark";

class Settings {
  private storageKey = "browser-os-settings";
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  private getSettings(): Record<string, any> {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private setSettings(settings: Record<string, any>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }

  getTheme(): Theme {
    return (this.getSettings().theme as Theme) || "light";
  }

  setTheme(theme: Theme): void {
    const settings = this.getSettings();
    settings.theme = theme;
    this.setSettings(settings);
    this.bus.emit("theme-changed", theme);
  }

  getWallpaper(): string | null {
    return this.getSettings().wallpaper || null;
  }

  setWallpaper(wallpaper: string | null): void {
    const settings = this.getSettings();
    settings.wallpaper = wallpaper;
    this.setSettings(settings);
    this.bus.emit("wallpaper-changed", wallpaper);
  }

  get(key: string): any {
    return this.getSettings()[key];
  }

  set(key: string, value: any): void {
    const settings = this.getSettings();
    settings[key] = value;
    this.setSettings(settings);
    this.bus.emit("settings-changed", key, value);
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}

// Create and export OS API
const bus = new EventBus();
const fs = new VirtualFileSystem();
const settings = new Settings(bus);

export const os = {
  bus,
  fs,
  settings,
};

