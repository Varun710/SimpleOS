import { useState, useEffect } from "react";
import { os } from "../os-core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Sun, Moon, Trash2, Info, Check, Image } from "lucide-react";
import { toast } from "sonner";

// Wallpaper presets
interface WallpaperPreset {
  id: string;
  name: string;
  thumbnail: string; // CSS gradient or image URL
  type: "image" | "gradient";
}

const LIGHT_WALLPAPERS: WallpaperPreset[] = [
  {
    id: "light-default",
    name: "Default",
    thumbnail: "url(/background.jpg)",
    type: "image",
  },
  {
    id: "light-gradient-blue",
    name: "Blue Sky",
    thumbnail: "linear-gradient(to bottom, #87CEEB, #E0F6FF)",
    type: "gradient",
  },
  {
    id: "light-gradient-purple",
    name: "Purple Dawn",
    thumbnail: "linear-gradient(to bottom, #E6E6FA, #F0E6FF)",
    type: "gradient",
  },
  {
    id: "light-gradient-green",
    name: "Mint Fresh",
    thumbnail: "linear-gradient(to bottom, #98FB98, #F0FFF0)",
    type: "gradient",
  },
  {
    id: "light-gradient-orange",
    name: "Sunset",
    thumbnail: "linear-gradient(to bottom, #FFE4B5, #FFF8DC)",
    type: "gradient",
  },
  {
    id: "light-gradient-gray",
    name: "Minimal Gray",
    thumbnail: "linear-gradient(to bottom, #F5F5F5, #E8E8E8)",
    type: "gradient",
  },
];

const DARK_WALLPAPERS: WallpaperPreset[] = [
  {
    id: "dark-default",
    name: "Default",
    thumbnail: "linear-gradient(to bottom right, #1a1a2e, #16213e, #0f3460)",
    type: "gradient",
  },
  {
    id: "dark-gradient-purple",
    name: "Purple Night",
    thumbnail: "linear-gradient(to bottom right, #1a1a2e, #16213e, #533483)",
    type: "gradient",
  },
  {
    id: "dark-gradient-blue",
    name: "Deep Blue",
    thumbnail: "linear-gradient(to bottom right, #0f3460, #16213e, #1a1a2e)",
    type: "gradient",
  },
  {
    id: "dark-gradient-green",
    name: "Forest Dark",
    thumbnail: "linear-gradient(to bottom right, #1a2e1a, #2d4a2d, #1a1a2e)",
    type: "gradient",
  },
  {
    id: "dark-gradient-red",
    name: "Crimson",
    thumbnail: "linear-gradient(to bottom right, #2e1a1a, #4a2d2d, #1a1a2e)",
    type: "gradient",
  },
  {
    id: "dark-gradient-cyan",
    name: "Cyan Dreams",
    thumbnail: "linear-gradient(to bottom right, #1a2e2e, #2d4a4a, #0f3460)",
    type: "gradient",
  },
];

export function SettingsApp() {
  const [theme, setTheme] = useState<"light" | "dark">(os.settings.getTheme());
  const [wallpaper, setWallpaper] = useState<string | null>(os.settings.getWallpaper());
  const [previewWallpaper, setPreviewWallpaper] = useState<string | null>(null);

  useEffect(() => {
    const handleThemeChange = (newTheme: "light" | "dark") => {
      setTheme(newTheme);
    };
    const handleWallpaperChange = (newWallpaper: string | null) => {
      setWallpaper(newWallpaper);
    };
    os.bus.on("theme-changed", handleThemeChange);
    os.bus.on("wallpaper-changed", handleWallpaperChange);
    return () => {
      os.bus.off("theme-changed", handleThemeChange);
      os.bus.off("wallpaper-changed", handleWallpaperChange);
    };
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    os.settings.setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handleWallpaperSelect = (wallpaperId: string) => {
    // Apply immediately on click
    os.settings.setWallpaper(wallpaperId);
    setWallpaper(wallpaperId);
    setPreviewWallpaper(null);
    toast.success("Wallpaper applied");
  };


  const getActiveWallpaper = () => {
    return wallpaper || (theme === "light" ? "light-default" : "dark-default");
  };

  const handleClearStorage = () => {
    if (
      confirm(
        "This will delete all files and settings. Are you sure you want to continue?"
      )
    ) {
      os.fs.clear();
      os.settings.clear();
      toast.success("All data cleared");
      // Reload to reset state
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const getStorageUsage = () => {
    const files = os.fs.list();
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    return {
      files: files.length,
      size: totalSize,
      formatted:
        totalSize < 1024
          ? `${totalSize} bytes`
          : `${(totalSize / 1024).toFixed(2)} KB`,
    };
  };

  const storageInfo = getStorageUsage();

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your Browser-OS preferences
            </p>
          </div>
        </div>

        <Separator />

        {/* Appearance Settings */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                {theme === "light" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
                Appearance
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Current theme: <Badge>{theme}</Badge>
              </p>
            </div>
            <Button onClick={handleThemeToggle}>
              {theme === "light" ? (
                <>
                  <Moon className="w-4 h-4 mr-2" />
                  Dark Mode
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 mr-2" />
                  Light Mode
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Backgrounds Section */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Backgrounds
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose a wallpaper for your desktop
            </p>
          </div>

          <Tabs value={theme} onValueChange={(value) => {
            const newTheme = value as "light" | "dark";
            if (newTheme !== theme) {
              os.settings.setTheme(newTheme);
            }
          }}>
            <TabsList className="mb-4">
              <TabsTrigger value="light">Light</TabsTrigger>
              <TabsTrigger value="dark">Dark</TabsTrigger>
            </TabsList>

            <TabsContent value="light" className="mt-4">
              <div className="grid grid-cols-3 gap-4">
                {LIGHT_WALLPAPERS.map((preset) => {
                  const isActive = getActiveWallpaper() === preset.id;
                  const isPreview = previewWallpaper === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`
                        relative aspect-video rounded-lg overflow-hidden cursor-pointer
                        border-2 transition-all
                        ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border"}
                        ${isPreview ? "ring-2 ring-primary/50" : ""}
                        hover:border-primary/50
                      `}
                      onClick={() => handleWallpaperSelect(preset.id)}
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          background: preset.thumbnail,
                          backgroundSize: preset.type === "image" ? "cover" : "100% 100%",
                          backgroundPosition: "center",
                        }}
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 text-center">
                        {preset.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="dark" className="mt-4">
              <div className="grid grid-cols-3 gap-4">
                {DARK_WALLPAPERS.map((preset) => {
                  const isActive = getActiveWallpaper() === preset.id;
                  const isPreview = previewWallpaper === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`
                        relative aspect-video rounded-lg overflow-hidden cursor-pointer
                        border-2 transition-all
                        ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border"}
                        ${isPreview ? "ring-2 ring-primary/50" : ""}
                        hover:border-primary/50
                      `}
                      onClick={() => handleWallpaperSelect(preset.id)}
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          background: preset.thumbnail,
                          backgroundSize: "100% 100%",
                        }}
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 text-center">
                        {preset.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Storage Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Storage</h2>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Files:</span>
              <span className="font-medium">{storageInfo.files}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Storage Used:</span>
              <span className="font-medium">{storageInfo.formatted}</span>
            </div>
          </div>
          <Separator className="my-4" />
          <div>
            <Button
              onClick={handleClearStorage}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              This will delete all files and reset settings
            </p>
          </div>
        </Card>

        {/* About */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" />
            About
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform:</span>
              <span className="font-medium">Browser-OS</span>
            </div>
            <Separator className="my-3" />
            <p className="text-muted-foreground">
              A minimal operating system interface running entirely in your web
              browser. Built with React, TypeScript, and Tailwind CSS.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

