import { useState, useEffect } from "react";
import { os } from "../os-core";
import type { FileMetadata } from "../os-core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Trash2, Eye, RefreshCw, Folder, FolderPlus, FilePlus, ChevronRight, Save, X, Home, HardDrive, Download, Image as ImageIcon, Music, Video, File } from "lucide-react";
import { toast } from "sonner";

interface FileItemProps {
  file: FileMetadata;
  selectedFile: FileMetadata | null;
  onSelect: (file: FileMetadata) => void;
  onDoubleClick: (file: FileMetadata) => void;
  onView: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  formatBytes: (bytes: number) => string;
  formatDate: (timestamp: number) => string;
}

function FileItem({
  file,
  selectedFile,
  onSelect,
  onDoubleClick,
  onView,
  onDelete,
  formatBytes,
  formatDate,
}: FileItemProps) {
  return (
    <Card
      className={`
        p-4 cursor-pointer transition-colors border-2
        ${
          selectedFile?.path === file.path
            ? "bg-primary/10 border-primary"
            : "hover:bg-muted/50 border-transparent"
        }
      `}
      onClick={() => onSelect(file)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(file);
      }}
    >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {file.isFolder ? (
              <Folder className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            ) : file.name.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i) ? (
              <ImageIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{file.name}</div>
              {!file.isFolder && (
                <div className="text-sm text-muted-foreground mt-1">
                  <div>Size: {formatBytes(file.size)}</div>
                  <div>Modified: {formatDate(file.modified)}</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {!file.isFolder && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(file);
                }}
                title="View file"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(file);
              }}
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </Card>
  );
}

export function FilesApp() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [viewContent, setViewContent] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewNoteDialog, setShowNewNoteDialog] = useState(false);
  const [newNoteName, setNewNoteName] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  useEffect(() => {
    // Initialize default folders if they don't exist
    const defaultFolders = ["Desktop", "Documents", "Downloads", "Pictures", "Music", "Movies"];
    defaultFolders.forEach((folder) => {
      if (!os.fs.exists(folder)) {
        try {
          os.fs.createFolder(folder, "");
        } catch {
          // Folder might already exist, ignore
        }
      }
    });
    loadFiles();
  }, [currentFolder]);

  const loadFiles = () => {
    const allFiles = os.fs.list(currentFolder);
    setFiles(allFiles);
  };

  const handleDeleteFile = (file: FileMetadata) => {
    const itemType = file.isFolder ? "folder" : "file";
    if (confirm(`Delete ${itemType} "${file.name}"?`)) {
      // Use the file.path directly - it should always be set and is the actual stored path
      const filePath = file.path;
      
      if (!filePath) {
        toast.error(`Cannot delete: file path is missing`);
        return;
      }
      
      console.log("Deleting file:", {
        name: file.name,
        path: filePath,
        currentFolder,
        fullFile: file
      });
      
      const deleted = os.fs.deleteFile(filePath);
      if (deleted) {
        loadFiles();
        if (selectedFile?.path === file.path || selectedFile?.name === file.name) {
          setSelectedFile(null);
          setViewContent(false);
        }
        toast.success(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} "${file.name}" deleted`);
      } else {
        toast.error(`Failed to delete ${itemType} "${file.name}". Check console for details.`);
      }
    }
  };

  const handleViewFile = (file: FileMetadata) => {
    if (file.isFolder) {
      // Navigate into folder
      setCurrentFolder(file.path);
      setSelectedFile(null);
      setViewContent(false);
    } else {
      // Read file content and open for viewing
      const fileContent = os.fs.readFile(file.path);
      if (fileContent !== null) {
        // Create a new file object with the loaded content
        const fileWithContent: FileMetadata = {
          ...file,
          content: fileContent,
        };
        setSelectedFile(fileWithContent);
        setViewContent(true);
      } else {
        toast.error(`Failed to read file: ${file.name}`);
      }
    }
  };

  const isImageFile = (filename: string): boolean => {
    return /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(filename);
  };

  const isTextFile = (filename: string): boolean => {
    return /\.(txt|md|json|js|ts|tsx|jsx|css|html|xml)$/i.test(filename);
  };

  const handleCreateFolder = () => {
    const folderName = newFolderName.trim();
    if (!folderName) {
      toast.error("Please enter a folder name");
      return;
    }

    // Validate folder name
    if (folderName.includes("/") || folderName.includes("\\")) {
      toast.error("Folder name cannot contain / or \\");
      return;
    }

    try {
      os.fs.createFolder(folderName, currentFolder);
      loadFiles();
      setShowNewFolderDialog(false);
      setNewFolderName("");
      toast.success(`Folder "${folderName}" created`);
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to create folder");
      console.error("Create folder error:", err);
    }
  };

  const handleCreateNote = () => {
    if (!newNoteName.trim()) {
      toast.error("Please enter a note name");
      return;
    }

    const filename = newNoteName.endsWith(".txt") ? newNoteName : `${newNoteName}.txt`;
    os.fs.writeFile(filename, newNoteContent, currentFolder);
    loadFiles();
    setShowNewNoteDialog(false);
    setNewNoteName("");
    setNewNoteContent("");
    toast.success(`Note "${filename}" created`);
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentFolder(folderPath);
    setSelectedFile(null);
    setViewContent(false);
  };

  const getBreadcrumbs = () => {
    if (!currentFolder) return [];
    const parts = currentFolder.split("/");
    const breadcrumbs: { name: string; path: string }[] = [];
    let currentPath = "";
    
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      breadcrumbs.push({ name: part, path: currentPath });
    }
    
    return breadcrumbs;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };


  return (
    <div className="relative flex h-full flex-col">
      {/* Toolbar and Breadcrumbs */}
      <div className="border-b border-border bg-muted/30 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowNewFolderDialog(true)}
              size="sm"
              variant="outline"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button
              onClick={() => setShowNewNoteDialog(true)}
              size="sm"
              variant="outline"
            >
              <FilePlus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </div>
          <Button onClick={loadFiles} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Breadcrumbs */}
        {getBreadcrumbs().length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            {getBreadcrumbs().map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToFolder(crumb.path)}
                  className="h-7 px-2"
                >
                  {crumb.name}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar - macOS Finder style */}
        <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Favorites</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <button
                onClick={() => navigateToFolder("")}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                  ${currentFolder === "" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}
                `}
              >
                <Home className="w-4 h-4" />
                Home
              </button>
              <button
                onClick={() => navigateToFolder("Desktop")}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                  ${currentFolder === "Desktop" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}
                `}
              >
                <HardDrive className="w-4 h-4" />
                Desktop
              </button>
              <button
                onClick={() => navigateToFolder("Documents")}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                  ${currentFolder === "Documents" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}
                `}
              >
                <File className="w-4 h-4" />
                Documents
              </button>
              <button
                onClick={() => navigateToFolder("Downloads")}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                  ${currentFolder === "Downloads" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}
                `}
              >
                <Download className="w-4 h-4" />
                Downloads
              </button>
              <button
                onClick={() => navigateToFolder("Pictures")}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                  ${currentFolder === "Pictures" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}
                `}
              >
                <ImageIcon className="w-4 h-4" />
                Pictures
              </button>
              <button
                onClick={() => navigateToFolder("Music")}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                  ${currentFolder === "Music" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}
                `}
              >
                <Music className="w-4 h-4" />
                Music
              </button>
              <button
                onClick={() => navigateToFolder("Movies")}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                  ${currentFolder === "Movies" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}
                `}
              >
                <Video className="w-4 h-4" />
                Movies
              </button>
            </div>
          </ScrollArea>
        </div>

        {/* File List */}
        <div className="flex-1 flex flex-col p-6 min-h-0 overflow-hidden">
          <ScrollArea className="flex-1">
            {files.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No files or folders found</p>
                  <p className="text-sm mt-2">Create a new folder or note to get started</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <FileItem
                    key={file.path}
                    file={file}
                    selectedFile={selectedFile}
                    onSelect={setSelectedFile}
                    onDoubleClick={handleViewFile}
                    onView={handleViewFile}
                    onDelete={handleDeleteFile}
                    formatBytes={formatBytes}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* File Preview */}
        {viewContent && selectedFile && !selectedFile.isFolder && (
          <div className="w-96 border-l border-border bg-muted/30 p-6 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-semibold truncate">{selectedFile.name}</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setViewContent(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="mb-4 space-y-2 flex-shrink-0">
              <Badge variant="outline">{formatBytes(selectedFile.size)}</Badge>
              <div className="text-xs text-muted-foreground">
                Created: {formatDate(selectedFile.created)}
              </div>
              <div className="text-xs text-muted-foreground">
                Modified: {formatDate(selectedFile.modified)}
              </div>
            </div>

            <ScrollArea className="flex-1 bg-background rounded-lg p-4 overflow-auto">
              {isImageFile(selectedFile.name) ? (
                <div className="flex items-center justify-center min-h-[400px] w-full">
                  {selectedFile.content ? (
                    (() => {
                      // Check if content is a valid image data URL
                      const isDataUrl = selectedFile.content.startsWith('data:image');
                      const isBase64Png = selectedFile.content.startsWith('iVBORw0KGgo'); // PNG base64
                      const isBase64Jpg = selectedFile.content.startsWith('/9j/'); // JPEG base64
                      
                      // If it's base64 without data URL prefix, add it
                      let imageSrc = selectedFile.content;
                      if (!isDataUrl && (isBase64Png || isBase64Jpg || selectedFile.content.length > 100)) {
                        // Determine MIME type from file extension
                        const ext = selectedFile.name.toLowerCase().split('.').pop();
                        const mimeType = ext === 'png' ? 'image/png' : 
                                       ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                                       ext === 'gif' ? 'image/gif' :
                                       ext === 'webp' ? 'image/webp' : 'image/png';
                        // If content doesn't start with data:, assume it's base64 and add prefix
                        if (!selectedFile.content.startsWith('data:')) {
                          imageSrc = `data:${mimeType};base64,${selectedFile.content}`;
                        }
                      }
                      
                      return (
                        <div className="w-full h-full flex items-center justify-center">
                          <img 
                            src={imageSrc} 
                            alt={selectedFile.name}
                            className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
                            onError={(e) => {
                              console.error("Image load error:", e);
                              console.log("File name:", selectedFile.name);
                              console.log("Content length:", selectedFile.content.length);
                              console.log("Content starts with:", selectedFile.content.substring(0, 100));
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log("Image loaded successfully:", selectedFile.name);
                            }}
                          />
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                      <p>Image content is empty</p>
                      <p className="text-xs mt-2">File size: {formatBytes(selectedFile.size)}</p>
                    </div>
                  )}
                </div>
              ) : isTextFile(selectedFile.name) ? (
                <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                  {selectedFile.content || '(empty file)'}
                </pre>
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>Preview not available for this file type</p>
                  <p className="text-xs mt-2">File size: {formatBytes(selectedFile.size)}</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Create New Folder</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateFolder}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* New Note Dialog */}
      {showNewNoteDialog && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-[500px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Create New Note</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNewNoteDialog(false);
                  setNewNoteName("");
                  setNewNoteContent("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Note name (without .txt extension)..."
              value={newNoteName}
              onChange={(e) => setNewNoteName(e.target.value)}
              autoFocus
              className="mb-4"
            />
            <Textarea
              placeholder="Note content..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="mb-4 h-48 resize-none font-mono"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewNoteDialog(false);
                  setNewNoteName("");
                  setNewNoteContent("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateNote}>
                <Save className="w-4 h-4 mr-2" />
                Create Note
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

