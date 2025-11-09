import { useEffect } from "react";
import { useTerminalStore } from "@/stores/terminal-store";
import { TabsBar } from "@/components/terminal/TabsBar";
import { TerminalView } from "@/components/terminal/TerminalView";

export function TerminalApp() {
  const { tabs, activeTabId, setActiveTab, loadTabs } = useTerminalStore();

  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  useEffect(() => {
    // Ensure we have at least one tab and an active tab
    if (tabs.length === 0) {
      const newTabId = useTerminalStore.getState().newTab();
      setActiveTab(newTabId);
    } else if (!activeTabId) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTabId, setActiveTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p>Loading terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <TabsBar activeTabId={activeTabId} onTabChange={handleTabChange} />
      <div className="flex-1 overflow-hidden">
        {activeTabId && <TerminalView tabId={activeTabId} />}
      </div>
    </div>
  );
}

