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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, HardDrive, Code, Settings2, Check } from "lucide-react";
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
                <Label htmlFor="schedule">Default Schedule</Label>
                <Select
                  value={settings.defaultSchedule}
                  onValueChange={(value) =>
                    setSettings({ ...settings, defaultSchedule: value })
                  }
                >
                  <SelectTrigger id="schedule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None (Manual)</SelectItem>
                    <SelectItem value="@once">@once</SelectItem>
                    <SelectItem value="@hourly">@hourly</SelectItem>
                    <SelectItem value="@daily">@daily</SelectItem>
                    <SelectItem value="@weekly">@weekly</SelectItem>
                    <SelectItem value="@monthly">@monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="catchup"
                checked={settings.catchup}
                onChange={(e) =>
                  setSettings({ ...settings, catchup: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="catchup" className="font-normal">
                Enable catchup for scheduled DAGs
              </Label>
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
              Configure how IDs and names are generated
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

            <div className="space-y-2">
              <Label htmlFor="taskIdCase">Task ID Case</Label>
              <Select
                value={settings.taskIdCase}
                onValueChange={(value: "lowercase" | "original") =>
                  setSettings({ ...settings, taskIdCase: value })
                }
              >
                <SelectTrigger id="taskIdCase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lowercase">lowercase</SelectItem>
                  <SelectItem value="original">Keep Original</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-3 rounded-lg bg-muted font-mono text-sm">
                <p>DAG ID: {settings.dagIdPrefix}folder_name{settings.dagIdSuffix}</p>
                <p>Task ID: job_name_task</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output Format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Output Format
            </CardTitle>
            <CardDescription>
              Configure the generated Python code format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pythonVersion">Python Version</Label>
                <Select
                  value={settings.pythonVersion}
                  onValueChange={(value) =>
                    setSettings({ ...settings, pythonVersion: value })
                  }
                >
                  <SelectTrigger id="pythonVersion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3.8">Python 3.8</SelectItem>
                    <SelectItem value="3.9">Python 3.9</SelectItem>
                    <SelectItem value="3.10">Python 3.10</SelectItem>
                    <SelectItem value="3.11">Python 3.11</SelectItem>
                    <SelectItem value="3.12">Python 3.12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="airflowVersion">Airflow Version</Label>
                <Select
                  value={settings.airflowVersion}
                  onValueChange={(value) =>
                    setSettings({ ...settings, airflowVersion: value })
                  }
                >
                  <SelectTrigger id="airflowVersion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2.5">Airflow 2.5.x</SelectItem>
                    <SelectItem value="2.6">Airflow 2.6.x</SelectItem>
                    <SelectItem value="2.7">Airflow 2.7.x</SelectItem>
                    <SelectItem value="2.8">Airflow 2.8.x</SelectItem>
                    <SelectItem value="2.9">Airflow 2.9.x</SelectItem>
                    <SelectItem value="2.10">Airflow 2.10.x</SelectItem>
                    <SelectItem value="3.0">Airflow 3.0.x</SelectItem>
                    <SelectItem value="3.1">Airflow 3.1.x (Latest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="taskflow"
                  checked={settings.useTaskFlowApi}
                  onChange={(e) =>
                    setSettings({ ...settings, useTaskFlowApi: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="taskflow" className="font-normal">
                  Use TaskFlow API (@dag decorator) - Airflow 3.x style
                </Label>
              </div>
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
                  Include inline comments in generated code
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="docstrings"
                  checked={settings.includeDocstrings}
                  onChange={(e) =>
                    setSettings({ ...settings, includeDocstrings: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="docstrings" className="font-normal">
                  Include docstrings at the top of each DAG file
                </Label>
              </div>
            </div>

            {settings.airflowVersion.startsWith("3") && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Airflow 3.x Note:</strong> Operators are imported from
                  <code className="mx-1 px-1 bg-blue-100 dark:bg-blue-900 rounded">
                    airflow.providers.standard
                  </code>
                  and uses the new SDK imports.
                </p>
              </div>
            )}
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
