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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  FileCode,
  Edit,
  Trash2,
  Copy,
  Check,
  Star,
  Upload,
  FileUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { ConversionTemplate, TemplateCondition, MappingRule } from "@/types/template";
import { DEFAULT_TEMPLATE_OUTPUT, CONTROLM_FIELDS, AIRFLOW_FIELDS } from "@/types/template";
import {
  loadAllTemplates,
  addCustomTemplate,
  updateTemplate,
  deleteTemplate,
  saveCustomTemplates,
  loadCustomTemplates,
  getBuiltinTemplates,
} from "@/lib/templates/template-loader";
import { toast } from "sonner";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-[300px] bg-muted animate-pulse" /> }
);

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ConversionTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ConversionTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load templates on mount
  useEffect(() => {
    const loaded = loadAllTemplates();
    setTemplates(loaded);
    setIsLoading(false);
  }, []);

  const handleDelete = (id: string) => {
    const success = deleteTemplate(id);
    if (success) {
      setTemplates(templates.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } else {
      toast.error("Cannot delete built-in templates");
    }
  };

  const handleDuplicate = (template: ConversionTemplate) => {
    const newTemplate = addCustomTemplate({
      name: `${template.name} (Copy)`,
      description: template.description,
      conditions: template.conditions.map((c) => ({ ...c, id: `c-${Date.now()}-${Math.random()}` })),
      mappings: template.mappings.map((m) => ({ ...m, id: `m-${Date.now()}-${Math.random()}` })),
      outputTemplate: template.outputTemplate,
      isActive: true,
      isDefault: false,
      priority: template.priority,
    });
    setTemplates([...templates, newTemplate]);
    toast.success("Template duplicated");
  };

  const handleSave = (template: ConversionTemplate) => {
    if (editingTemplate) {
      // Update existing
      const updated = updateTemplate(editingTemplate.id, template);
      if (updated) {
        setTemplates(templates.map((t) => (t.id === editingTemplate.id ? updated : t)));
        toast.success("Template updated");
      } else {
        // If updating a builtin, a new custom copy is created
        const newTemplate = addCustomTemplate({
          name: template.name,
          description: template.description,
          conditions: template.conditions,
          mappings: template.mappings,
          outputTemplate: template.outputTemplate,
          isActive: template.isActive,
          isDefault: false,
          priority: template.priority,
        });
        setTemplates([...templates, newTemplate]);
        toast.success("Created custom copy of built-in template");
      }
    } else {
      // Add new
      const newTemplate = addCustomTemplate({
        name: template.name,
        description: template.description,
        conditions: template.conditions,
        mappings: template.mappings,
        outputTemplate: template.outputTemplate,
        isActive: true,
        isDefault: false,
        priority: 50,
      });
      setTemplates([...templates, newTemplate]);
      toast.success("Template created");
    }
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading templates...</p>
      </div>
    );
  }

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
            <Button onClick={() => setEditingTemplate(null)}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
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
              onSave={handleSave}
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
                  Built-in
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
  const [conditions, setConditions] = useState<TemplateCondition[]>(
    template?.conditions || []
  );
  const [mappings, setMappings] = useState<MappingRule[]>(
    template?.mappings || []
  );
  const [xmlInput, setXmlInput] = useState("");
  const [activeTab, setActiveTab] = useState("manual");

  // Add condition
  const addCondition = () => {
    const newCondition: TemplateCondition = {
      id: `c-${Date.now()}`,
      field: "JOB_TYPE",
      operator: "equals",
      value: "",
    };
    setConditions([...conditions, newCondition]);
  };

  // Update condition
  const updateCondition = (id: string, updates: Partial<TemplateCondition>) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Remove condition
  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  // Add mapping
  const addMapping = () => {
    const newMapping: MappingRule = {
      id: `m-${Date.now()}`,
      source: "JOBNAME",
      target: "task_id",
    };
    setMappings([...mappings, newMapping]);
  };

  // Update mapping
  const updateMapping = (id: string, updates: Partial<MappingRule>) => {
    setMappings(
      mappings.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  // Remove mapping
  const removeMapping = (id: string) => {
    setMappings(mappings.filter((m) => m.id !== id));
  };

  // Parse XML and extract fields
  const parseXmlFields = () => {
    if (!xmlInput.trim()) {
      toast.error("Please paste XML content first");
      return;
    }

    try {
      // Extract all XML tags and their values
      const tagRegex = /<(\w+)[^>]*>([^<]*)<\/\1>/g;
      const attrRegex = /(\w+)="([^"]*)"/g;
      const extractedFields = new Map<string, string>();

      // Extract tag contents
      let match;
      while ((match = tagRegex.exec(xmlInput)) !== null) {
        const [, tagName, value] = match;
        if (value.trim()) {
          extractedFields.set(tagName.toUpperCase(), value.trim());
        }
      }

      // Extract attributes
      while ((match = attrRegex.exec(xmlInput)) !== null) {
        const [, attrName, value] = match;
        if (value.trim()) {
          extractedFields.set(attrName.toUpperCase(), value.trim());
        }
      }

      if (extractedFields.size === 0) {
        toast.error("No fields found in XML");
        return;
      }

      // Auto-create mappings from extracted fields
      const newMappings: MappingRule[] = [];
      const newConditions: TemplateCondition[] = [];

      extractedFields.forEach((value, field) => {
        // Check if this is a known Control-M field
        if (CONTROLM_FIELDS.includes(field as typeof CONTROLM_FIELDS[number])) {
          // Find matching Airflow field
          const airflowField = getMatchingAirflowField(field);
          if (airflowField) {
            newMappings.push({
              id: `m-${Date.now()}-${field}`,
              source: field,
              target: airflowField,
              transform: field === "JOBNAME" ? "lowercase" : undefined,
            });
          }

          // Create condition for JOB_TYPE
          if (field === "JOB_TYPE") {
            newConditions.push({
              id: `c-${Date.now()}-${field}`,
              field: field,
              operator: "equals",
              value: value,
            });
          }
        }
      });

      if (newMappings.length > 0) {
        setMappings((prev) => [...prev, ...newMappings]);
      }
      if (newConditions.length > 0) {
        setConditions((prev) => [...prev, ...newConditions]);
      }

      toast.success(`Extracted ${extractedFields.size} fields from XML`);
      setActiveTab("manual");
    } catch (error) {
      toast.error("Failed to parse XML");
      console.error(error);
    }
  };

  // Helper to match Control-M field to Airflow field
  const getMatchingAirflowField = (controlmField: string): string | null => {
    const mapping: Record<string, string> = {
      JOBNAME: "task_id",
      CMDLINE: "bash_command",
      FILENAME: "filepath",
      DESCRIPTION: "doc",
      RUN_AS: "run_as_user",
      HOST: "host",
      PRIORITY: "priority_weight",
    };
    return mapping[controlmField] || null;
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const newTemplate: ConversionTemplate = {
      id: template?.id || `custom-${Date.now()}`,
      name,
      description,
      conditions,
      mappings,
      outputTemplate,
      isDefault: false,
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
          <Label htmlFor="name">Template Name *</Label>
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

      {/* Tabs for Manual or XML Import */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="xml">Import from XML</TabsTrigger>
        </TabsList>

        <TabsContent value="xml" className="space-y-4">
          <div className="space-y-2">
            <Label>Paste Control-M XML</Label>
            <Textarea
              value={xmlInput}
              onChange={(e) => setXmlInput(e.target.value)}
              placeholder={`<JOB JOBNAME="MY_JOB" JOB_TYPE="Command">
  <CMDLINE>echo "Hello"</CMDLINE>
  <FILENAME>/path/to/file</FILENAME>
</JOB>`}
              className="font-mono text-sm h-48"
            />
          </div>
          <Button onClick={parseXmlFields}>
            <FileUp className="h-4 w-4 mr-2" />
            Extract Fields from XML
          </Button>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          {/* Conditions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Matching Conditions</Label>
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                {conditions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No conditions defined. Click "Add Condition" to start.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {conditions.map((condition) => (
                      <div key={condition.id} className="flex items-center gap-2">
                        <Select
                          value={condition.field}
                          onValueChange={(value) =>
                            updateCondition(condition.id, { field: value })
                          }
                        >
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
                        <Select
                          value={condition.operator}
                          onValueChange={(value: TemplateCondition["operator"]) =>
                            updateCondition(condition.id, { operator: value })
                          }
                        >
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
                        <Input
                          value={condition.value}
                          onChange={(e) =>
                            updateCondition(condition.id, { value: e.target.value })
                          }
                          placeholder="Value"
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(condition.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mappings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Field Mappings</Label>
              <Button variant="outline" size="sm" onClick={addMapping}>
                <Plus className="h-4 w-4 mr-1" />
                Add Mapping
              </Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                {mappings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No mappings defined. Click "Add Mapping" to start.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {mappings.map((mapping) => (
                      <div key={mapping.id} className="flex items-center gap-2">
                        <Select
                          value={mapping.source}
                          onValueChange={(value) =>
                            updateMapping(mapping.id, { source: value })
                          }
                        >
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
                        <Select
                          value={mapping.target}
                          onValueChange={(value) =>
                            updateMapping(mapping.id, { target: value })
                          }
                        >
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
                        <Select
                          value={mapping.transform || "none"}
                          onValueChange={(value) =>
                            updateMapping(mapping.id, {
                              transform: value === "none" ? undefined : (value as MappingRule["transform"]),
                            })
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No transform</SelectItem>
                            <SelectItem value="lowercase">lowercase</SelectItem>
                            <SelectItem value="uppercase">UPPERCASE</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMapping(mapping.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Output Template */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Output Template (Handlebars)</Label>
          <span className="text-xs text-muted-foreground">
            Python / Jinja2 syntax
          </span>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <MonacoEditor
            height="300px"
            language="python"
            value={outputTemplate}
            onChange={(value) => setOutputTemplate(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 4,
              insertSpaces: true,
              automaticLayout: true,
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
