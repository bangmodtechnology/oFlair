"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  FileCode,
  Edit,
  Trash2,
  Copy,
  Check,
  Star,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { ConversionTemplate } from "@/types/template";
import { DEFAULT_TEMPLATE_OUTPUT, CONTROLM_FIELDS, AIRFLOW_FIELDS } from "@/types/template";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-[300px] bg-muted animate-pulse" /> }
);

// Mock templates for demo
const defaultTemplates: ConversionTemplate[] = [
  {
    id: "1",
    name: "Default - Command to Bash",
    description: "Converts Control-M Command jobs to Airflow BashOperator",
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "Command" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "snake_case" },
      { id: "m2", source: "CMDLINE", target: "bash_command" },
    ],
    outputTemplate: DEFAULT_TEMPLATE_OUTPUT,
    isDefault: true,
    isActive: true,
    priority: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "File Watcher to Sensor",
    description: "Converts Control-M FileWatcher jobs to Airflow FileSensor",
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "FileWatcher" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "snake_case" },
      { id: "m2", source: "FILENAME", target: "filepath" },
    ],
    outputTemplate: `{{task_id}} = FileSensor(
    task_id='{{task_id}}',
    filepath='{{filepath}}',
    poke_interval=60,
    timeout=3600,
    mode='poke',
    dag=dag
)`,
    isDefault: true,
    isActive: true,
    priority: 90,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    name: "Script to Python",
    description: "Converts Control-M Script jobs to Airflow PythonOperator",
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "Script" },
      { id: "c2", field: "FILENAME", operator: "ends_with", value: ".py" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "snake_case" },
      { id: "m2", source: "FILENAME", target: "python_callable" },
    ],
    outputTemplate: `{{task_id}} = PythonOperator(
    task_id='{{task_id}}',
    python_callable={{python_callable}},
    dag=dag
)`,
    isDefault: true,
    isActive: true,
    priority: 80,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ConversionTemplate[]>(defaultTemplates);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ConversionTemplate | null>(null);

  const handleDelete = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const handleDuplicate = (template: ConversionTemplate) => {
    const newTemplate: ConversionTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTemplates([...templates, newTemplate]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Manage conversion templates and mapping rules
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create New Template"}
              </DialogTitle>
              <DialogDescription>
                Define conditions and mapping rules for job conversion
              </DialogDescription>
            </DialogHeader>
            <TemplateEditor
              template={editingTemplate}
              onSave={(template) => {
                if (editingTemplate) {
                  setTemplates(
                    templates.map((t) => (t.id === template.id ? template : t))
                  );
                } else {
                  setTemplates([...templates, template]);
                }
                setIsDialogOpen(false);
                setEditingTemplate(null);
              }}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingTemplate(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Template List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="relative">
            {template.isDefault && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3" />
                  Default
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileCode className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base pr-16">{template.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {template.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Conditions */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Conditions
                </p>
                <div className="flex flex-wrap gap-1">
                  {template.conditions.map((cond) => (
                    <Badge key={cond.id} variant="outline" className="text-xs">
                      {cond.field} {cond.operator} {cond.value}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Mappings */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Mappings ({template.mappings.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {template.mappings.slice(0, 3).map((mapping) => (
                    <Badge key={mapping.id} variant="secondary" className="text-xs">
                      {mapping.source} → {mapping.target}
                    </Badge>
                  ))}
                  {template.mappings.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.mappings.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(template);
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicate(template)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Duplicate
                </Button>
                {!template.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TemplateEditor({
  template,
  onSave,
  onCancel,
}: {
  template: ConversionTemplate | null;
  onSave: (template: ConversionTemplate) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [outputTemplate, setOutputTemplate] = useState(
    template?.outputTemplate || DEFAULT_TEMPLATE_OUTPUT
  );

  const handleSave = () => {
    const newTemplate: ConversionTemplate = {
      id: template?.id || Date.now().toString(),
      name,
      description,
      conditions: template?.conditions || [],
      mappings: template?.mappings || [],
      outputTemplate,
      isDefault: template?.isDefault || false,
      isActive: true,
      priority: template?.priority || 50,
      createdAt: template?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    onSave(newTemplate);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Command to Bash"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this template"
          />
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Matching Conditions</Label>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Condition
          </Button>
        </div>
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Select defaultValue="JOB_TYPE">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTROLM_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select defaultValue="equals">
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">equals</SelectItem>
                    <SelectItem value="contains">contains</SelectItem>
                    <SelectItem value="starts_with">starts with</SelectItem>
                    <SelectItem value="ends_with">ends with</SelectItem>
                    <SelectItem value="regex">matches regex</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Value" className="flex-1" />
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mappings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Field Mappings</Label>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Mapping
          </Button>
        </div>
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Select defaultValue="JOBNAME">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTROLM_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">→</span>
                <Select defaultValue="task_id">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRFLOW_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select defaultValue="none">
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No transform</SelectItem>
                    <SelectItem value="snake_case">snake_case</SelectItem>
                    <SelectItem value="lowercase">lowercase</SelectItem>
                    <SelectItem value="uppercase">UPPERCASE</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Output Template */}
      <div className="space-y-3">
        <Label>Output Template (Handlebars)</Label>
        <div className="border rounded-lg overflow-hidden">
          <MonacoEditor
            height="200px"
            language="python"
            value={outputTemplate}
            onChange={(value) => setOutputTemplate(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
            }}
            theme="vs-dark"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Use Handlebars syntax: {"{{field_name}}"} for variables,{" "}
          {"{{#if field}}...{{/if}}"} for conditionals
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Check className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </div>
    </div>
  );
}
