"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  RotateCcw,
  HardDrive,
  Code,
  Settings2,
  Check,
  Info,
  Download,
  Upload,
  FileJson,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadSettingsAsJson,
  importSettingsFromJson,
  type AppConfig,
  DEFAULT_CONFIG,
} from "@/lib/storage/config-storage";
import {
  useStorage,
  useStorageMode,
  isTauriEnvironment,
  type StorageMode,
} from "@/hooks/use-storage";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [includeHistoryInExport, setIncludeHistoryInExport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storage = useStorage();
  const { mode: storageMode, setMode: setStorageMode } = useStorageMode();
  const isTauri = typeof window !== "undefined" && isTauriEnvironment();

  // Load settings from storage on mount
  useEffect(() => {
    (async () => {
      const loaded = await storage.getConfig();
      if (loaded) {
        setSettings(loaded);
      }
      setIsLoaded(true);
    })();
  }, [storage]);

  // Track unsaved changes
  useEffect(() => {
    if (isLoaded) {
      setIsSaved(false);
    }
  }, [settings, isLoaded]);

  const handleSave = async () => {
    const success = await storage.saveConfig(settings);
    if (success) {
      toast.success("Settings saved successfully");
      setIsSaved(true);
    } else {
      toast.error("Failed to save settings");
    }
  };

  const handleReset = async () => {
    await storage.deleteConfig();
    setSettings(DEFAULT_CONFIG);
    toast.info("Settings reset to defaults");
    setIsSaved(false);
  };

  const handleExport = () => {
    const success = downloadSettingsAsJson(
      `oflair-settings-${new Date().toISOString().split("T")[0]}.json`,
      includeHistoryInExport
    );
    if (success) {
      toast.success("Settings exported successfully");
    } else {
      toast.error("Failed to export settings");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const result = importSettingsFromJson(content, {
        importConfig: true,
        importHistory: true,
      });

      if (result.success) {
        // Reload settings after import
        const loaded = await storage.getConfig();
        if (loaded) {
          setSettings(loaded);
        }
        setIsSaved(true);

        let message = "Settings imported";
        if (result.historyImported && result.historyImported > 0) {
          message += ` (${result.historyImported} history items added)`;
        }
        toast.success(message);
      } else {
        toast.error(result.error || "Failed to import settings");
      }
    } catch (error) {
      toast.error("Failed to read file");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStorageModeChange = (value: string) => {
    setStorageMode(value as StorageMode);
    toast.info(
      value === "database"
        ? "Switched to database storage"
        : "Switched to local storage"
    );
    // Reload settings from the new provider
    setTimeout(async () => {
      const loaded = await storage.getConfig();
      if (loaded) {
        setSettings(loaded);
      }
      setIsSaved(true);
    }, 100);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure default conversion settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isSaved && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaved}>
            {isSaved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* DAG Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              DAG Defaults
            </CardTitle>
            <CardDescription>
              Default values for generated Airflow DAGs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="owner">Default Owner</Label>
                <Input
                  id="owner"
                  value={settings.defaultOwner}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultOwner: e.target.value })
                  }
                  placeholder="airflow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retries">Default Retries</Label>
                <Input
                  id="retries"
                  type="number"
                  min={0}
                  max={10}
                  value={settings.defaultRetries}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultRetries: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retryDelay">Retry Delay (minutes)</Label>
              <Input
                id="retryDelay"
                type="number"
                min={1}
                max={60}
                value={settings.defaultRetryDelay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultRetryDelay: parseInt(e.target.value) || 5,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Naming Conventions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Naming Conventions
            </CardTitle>
            <CardDescription>
              Configure how DAG IDs are generated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dagPrefix">DAG ID Prefix</Label>
                <Input
                  id="dagPrefix"
                  value={settings.dagIdPrefix}
                  onChange={(e) =>
                    setSettings({ ...settings, dagIdPrefix: e.target.value })
                  }
                  placeholder="e.g., ctm_"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dagSuffix">DAG ID Suffix</Label>
                <Input
                  id="dagSuffix"
                  value={settings.dagIdSuffix}
                  onChange={(e) =>
                    setSettings({ ...settings, dagIdSuffix: e.target.value })
                  }
                  placeholder="e.g., _dag"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-3 rounded-lg bg-muted font-mono text-sm">
                <p>DAG ID: {settings.dagIdPrefix}folder_name{settings.dagIdSuffix}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Output Options
            </CardTitle>
            <CardDescription>
              Configure the generated Python code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="comments"
                checked={settings.includeComments}
                onChange={(e) =>
                  setSettings({ ...settings, includeComments: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="comments" className="font-normal">
                Include comments in generated code
              </Label>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Airflow version and TaskFlow API options are configured during conversion in the Convert page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Storage Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage
            </CardTitle>
            <CardDescription>
              Settings and history storage configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Storage Backend Selector */}
            {!isTauri && (
              <>
                <div className="space-y-2">
                  <Label>Storage Backend</Label>
                  <Select
                    value={storageMode}
                    onValueChange={handleStorageModeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">
                        <span className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          Local Storage (Browser)
                        </span>
                      </SelectItem>
                      <SelectItem value="database">
                        <span className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Database (Server)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {storageMode === "local"
                      ? "Settings stored in your browser. Data is local to this device."
                      : "Settings stored in the server database. Data persists across devices."}
                  </p>
                </div>
                <Separator />
              </>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                {storageMode === "database" ? "Database" : "localStorage"}
              </Badge>
              <Badge variant="outline">
                {storageMode === "database" ? "Server Storage" : "Browser Storage"}
              </Badge>
              {storageMode === "local" && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  No Database Required
                </Badge>
              )}
              {storageMode === "database" && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Cross-Device Sync
                </Badge>
              )}
            </div>

            {storageMode === "local" && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Clearing browser data will remove your settings and custom templates.
                  Consider exporting important templates before clearing data.
                </p>
              </div>
            )}
            {storageMode === "database" && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Settings and history are stored in the server database.
                  Data will persist even if you clear your browser data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import/Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Import / Export
            </CardTitle>
            <CardDescription>
              Backup or restore your settings as JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export Section */}
            <div className="space-y-3">
              <Label>Export Settings</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeHistory"
                  checked={includeHistoryInExport}
                  onChange={(e) => setIncludeHistoryInExport(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="includeHistory" className="font-normal text-sm">
                  Include conversion history
                </Label>
              </div>
              <Button onClick={handleExport} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Settings to JSON
              </Button>
            </div>

            <Separator />

            {/* Import Section */}
            <div className="space-y-3">
              <Label>Import Settings</Label>
              <p className="text-sm text-muted-foreground">
                Upload a previously exported JSON file to restore your settings.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button onClick={handleImportClick} variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Import Settings from JSON
              </Button>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Importing settings will overwrite your current configuration. History items will be merged without duplicates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
