import { useState, useEffect } from "react";
import { os } from "../os-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Save, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Note {
  name: string;
  content: string;
}

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<string>("");
  const [currentContent, setCurrentContent] = useState<string>("");
  const [isNewNote, setIsNewNote] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = () => {
    // Get all files recursively by checking the storage directly
    // For now, we'll just get files from root, but we could extend this to be recursive
    const getAllFiles = (folder: string = ""): Note[] => {
      const files = os.fs.list(folder);
      const notes: Note[] = [];
      
      for (const file of files) {
        if (file.isFolder) {
          // Recursively get files from subfolders
          notes.push(...getAllFiles(file.path));
        } else if (file.name.endsWith(".txt")) {
          notes.push({
            name: file.path, // Use full path as name for unique identification
            content: os.fs.readFile(file.path) || "",
          });
        }
      }
      
      return notes;
    };
    
    setNotes(getAllFiles());
  };

  const handleNewNote = () => {
    setIsNewNote(true);
    setCurrentNote("");
    setCurrentContent("");
  };

  const handleSave = () => {
    if (!currentNote.trim()) {
      toast.error("Please enter a note name");
      return;
    }

    // Extract filename from path if it's a path, otherwise use the note name
    let filename = currentNote.endsWith(".txt")
      ? currentNote
      : `${currentNote}.txt`;
    
    // If editing existing note with path, use that path
    if (!isNewNote && currentNote.includes("/")) {
      // Use the full path for existing notes
      const pathParts = currentNote.split("/");
      const parentFolder = pathParts.slice(0, -1).join("/");
      const fileName = pathParts[pathParts.length - 1];
      os.fs.writeFile(fileName, currentContent, parentFolder);
      filename = currentNote;
    } else {
      // New note goes to root
      os.fs.writeFile(filename, currentContent);
    }

    loadNotes();
    setIsNewNote(false);
    toast.success(`Note "${filename}" saved!`);
  };

  const handleLoadNote = (note: Note) => {
    setCurrentNote(note.name);
    setCurrentContent(note.content);
    setIsNewNote(false);
  };

  const handleDeleteNote = (noteName: string) => {
    // Get display name (filename only, not full path)
    const displayName = noteName.includes("/") ? noteName.split("/").pop() : noteName;
    
    if (confirm(`Delete "${displayName}"?`)) {
      os.fs.deleteFile(noteName);
      loadNotes();
      if (currentNote === noteName) {
        setCurrentNote("");
        setCurrentContent("");
      }
      toast.success(`Note "${displayName}" deleted`);
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-muted/30 p-4 flex flex-col gap-3">
        <Button onClick={handleNewNote} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>

        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {notes.map((note) => (
              <div
                key={note.name}
                className={`
                  flex items-center justify-between p-2 rounded-lg cursor-pointer group
                  hover:bg-muted transition-colors
                  ${currentNote === note.name ? "bg-primary/10" : ""}
                `}
              >
                <button
                  onClick={() => handleLoadNote(note)}
                  className="flex items-center gap-2 flex-1 text-left"
                  title={note.name}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm truncate">
                    {note.name.includes("/") ? note.name.split("/").pop() : note.name}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No notes yet
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="flex-1 p-6 flex flex-col gap-4">
        {(currentNote || isNewNote) ? (
          <>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Note name..."
                value={
                  isNewNote 
                    ? currentNote.replace(".txt", "")
                    : (currentNote.includes("/") 
                        ? currentNote.split("/").pop()?.replace(".txt", "") || ""
                        : currentNote.replace(".txt", ""))
                }
                onChange={(e) => setCurrentNote(e.target.value)}
                className="flex-1"
                disabled={!isNewNote && currentNote !== ""}
                title={currentNote}
              />
              <Button onClick={handleSave} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>

            <Textarea
              placeholder="Start typing your note..."
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              className="flex-1 resize-none font-mono"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

