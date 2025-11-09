import { useState } from "react";
import { useTerminalStore } from "@/stores/terminal-store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { X, Plus, Settings, Trash2 } from "lucide-react";
import { TerminalSettingsModal } from "./TerminalSettingsModal";

interface TabsBarProps {
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
}

export function TabsBar({ activeTabId, onTabChange }: TabsBarProps) {
  const { tabs, newTab, closeTab, clearTabHistory } = useTerminalStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleNewTab = () => {
    const newTabId = newTab();
    onTabChange(newTabId);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
    // If we closed the active tab, switch to the first remaining tab
    if (tabId === activeTabId && tabs.length > 1) {
      const remainingTabs = tabs.filter((t) => t.id !== tabId);
      if (remainingTabs.length > 0) {
        onTabChange(remainingTabs[0].id);
      }
    }
  };

  const handleClear = () => {
    if (activeTabId) {
      clearTabHistory(activeTabId);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30 flex-shrink-0">
        <Tabs value={activeTabId || undefined} onValueChange={onTabChange}>
          <TabsList className="w-full justify-start h-auto p-1 bg-transparent rounded-none border-none">
            <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-3 py-1.5 max-w-[200px] data-[state=active]:bg-background"
                >
                  <span className="truncate text-xs">
                    Terminal {tabs.indexOf(tab) + 1}
                  </span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="ml-1 hover:bg-muted rounded p-0.5"
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </TabsTrigger>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewTab}
                className="ml-1 shrink-0"
                title="New tab"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" title="Terminal options">
              <Settings className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showSettings && (
        <TerminalSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}

