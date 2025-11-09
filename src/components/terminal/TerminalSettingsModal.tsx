import { useState, useEffect } from "react";
import { useTerminalStore } from "@/stores/terminal-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface TerminalSettingsModalProps {
  onClose: () => void;
}

export function TerminalSettingsModal({ onClose }: TerminalSettingsModalProps) {
  const { settings, updateSettings } = useTerminalStore();
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Terminal Settings</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="fontSize" className="text-sm font-medium">
              Font Size
            </label>
            <Input
              id="fontSize"
              type="number"
              min="8"
              max="24"
              value={localSettings.fontSize}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  fontSize: parseInt(e.target.value) || 14,
                })
              }
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="cursorStyle" className="text-sm font-medium">
              Cursor Style
            </label>
            <select
              id="cursorStyle"
              value={localSettings.cursorStyle}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  cursorStyle: e.target.value as "block" | "underline" | "bar",
                })
              }
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="block">Block</option>
              <option value="underline">Underline</option>
              <option value="bar">Bar</option>
            </select>
          </div>

          <div>
            <label htmlFor="scrollback" className="text-sm font-medium">
              Scrollback Lines
            </label>
            <Input
              id="scrollback"
              type="number"
              min="100"
              max="10000"
              value={localSettings.scrollback}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  scrollback: parseInt(e.target.value) || 1000,
                })
              }
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </Card>
    </div>
  );
}

