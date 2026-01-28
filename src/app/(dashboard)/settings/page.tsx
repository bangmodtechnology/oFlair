"use client";

import { useState, useEffect } from "react";
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
import { Save, RotateCcw, HardDrive, Code, Settings2, Check, Info } from "lucide-react";
import { toast } from "sonner";
import {
  loadConfig,
  saveConfig,
  resetConfig,
  type AppConfig,
  DEFAULT_CONFIG,
} from "@/lib/storage/config-storage";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loaded = loadConfig();
    setSettings(loaded);
    setIsLoaded(true);
  }, []);

  // Track unsaved changes
  useEffect(() => {
    if (isLoaded) {
      setIsSaved(false);
    }
  }, [settings, isLoaded]);

  const handleSave = () => {
    const success = saveConfig(settings);
    if (success) {
      toast.success("Settings saved successfully");
      setIsSaved(true);
    } else {
      toast.error("Failed to save settings");
    }
  };

  const handleReset = () => {
    const defaultSettings = resetConfig();
    setSettings(defaultSettings);
    toast.info("Settings reset to defaults");
    setIsSaved(false);
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
              Settings and templates storage information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Storage Type</Label>
              <p className="text-sm text-muted-foreground">
                All settings and custom templates are stored in your browser&apos;s localStorage.
                Data persists across sessions but is specific to this browser.
              </p>
            </div>

            <Separator />

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">localStorage</Badge>
              <Badge variant="outline">Browser Storage</Badge>
              <Badge variant="outline" className="text-green-600 border-green-600">
                No Database Required
              </Badge>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Clearing browser data will remove your settings and custom templates.
                Consider exporting important templates before clearing data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
