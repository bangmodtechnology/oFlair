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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Cog,
  Plus,
  Trash2,
  Edit2,
  Copy,
  PlayCircle,
  CheckCircle,
  XCircle,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import {
  type CustomRule,
  type CustomRuleConfig,
  type ValueReplaceConfig,
  type FieldMappingConfig,
  type RegexTransformConfig,
  type ConditionalConfig,
  loadCustomRules,
  saveCustomRules,
  addCustomRule,
  updateCustomRule,
  deleteCustomRule,
} from "@/lib/storage/config-storage";
import {
  validateCustomRule,
  getSampleCustomRules,
} from "@/lib/converter/custom-rules-engine";
import { toast } from "sonner";

const RULE_TYPES = [
  { value: "value_replace", label: "Value Replace", description: "Replace text across fields" },
  { value: "field_mapping", label: "Field Mapping", description: "Map field values to new values" },
  { value: "regex_transform", label: "Regex Transform", description: "Apply regex transformation" },
  { value: "conditional", label: "Conditional", description: "If-then rule based on conditions" },
];

const COMMON_FIELDS = [
  "JOBNAME",
  "JOB_TYPE",
  "CMDLINE",
  "DESCRIPTION",
  "APPLICATION",
  "SUB_APPLICATION",
  "FOLDER_NAME",
  "FILENAME",
  "HOST",
];

export default function RulesPage() {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [ruleForm, setRuleForm] = useState<Partial<CustomRule>>({
    name: "",
    description: "",
    isActive: true,
    priority: 50,
    type: "value_replace",
  });

  useEffect(() => {
    setRules(loadCustomRules());
  }, []);

  const handleSave = () => {
    // Build the config based on type
    let config: CustomRuleConfig;

    switch (ruleForm.type) {
      case "value_replace":
        config = {
          type: "value_replace",
          searchValue: (ruleForm as { searchValue?: string }).searchValue || "",
          replaceValue: (ruleForm as { replaceValue?: string }).replaceValue || "",
          caseSensitive: (ruleForm as { caseSensitive?: boolean }).caseSensitive || false,
          targetFields: (ruleForm as { targetFields?: string[] }).targetFields || [],
        } as ValueReplaceConfig;
        break;
      case "field_mapping":
        config = {
          type: "field_mapping",
          sourceField: (ruleForm as { sourceField?: string }).sourceField || "",
          mappings: (ruleForm as { mappings?: { from: string; to: string }[] }).mappings || [],
          defaultValue: (ruleForm as { defaultValue?: string }).defaultValue,
        } as FieldMappingConfig;
        break;
      case "regex_transform":
        config = {
          type: "regex_transform",
          targetField: (ruleForm as { targetField?: string }).targetField || "",
          pattern: (ruleForm as { pattern?: string }).pattern || "",
          replacement: (ruleForm as { replacement?: string }).replacement || "",
          flags: (ruleForm as { flags?: string }).flags || "g",
        } as RegexTransformConfig;
        break;
      case "conditional":
        config = {
          type: "conditional",
          condition: {
            field: (ruleForm as { conditionField?: string }).conditionField || "",
            operator: (ruleForm as { conditionOperator?: string }).conditionOperator as ConditionalConfig["condition"]["operator"] || "equals",
            value: (ruleForm as { conditionValue?: string }).conditionValue || "",
          },
          thenAction: {
            targetField: (ruleForm as { actionTargetField?: string }).actionTargetField || "",
            action: (ruleForm as { actionType?: string }).actionType as ConditionalConfig["thenAction"]["action"] || "set",
            value: (ruleForm as { actionValue?: string }).actionValue || "",
          },
        } as ConditionalConfig;
        break;
      default:
        toast.error("Invalid rule type");
        return;
    }

    const rule: CustomRule = {
      id: editingRule?.id || "",
      name: ruleForm.name || "",
      description: ruleForm.description,
      isActive: ruleForm.isActive ?? true,
      priority: ruleForm.priority ?? 50,
      type: ruleForm.type as CustomRule["type"],
      config,
    };

    const validation = validateCustomRule(rule);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid rule");
      return;
    }

    if (editingRule) {
      updateCustomRule(editingRule.id, rule);
      toast.success("Rule updated");
    } else {
      addCustomRule(rule);
      toast.success("Rule created");
    }

    setRules(loadCustomRules());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      deleteCustomRule(id);
      setRules(loadCustomRules());
      toast.success("Rule deleted");
    }
  };

  const handleToggle = (id: string, isActive: boolean) => {
    updateCustomRule(id, { isActive });
    setRules(loadCustomRules());
    toast.success(isActive ? "Rule enabled" : "Rule disabled");
  };

  const handleEdit = (rule: CustomRule) => {
    setEditingRule(rule);
    const form: Record<string, unknown> = {
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      priority: rule.priority,
      type: rule.type,
    };

    // Spread config values
    switch (rule.config.type) {
      case "value_replace":
        form.searchValue = rule.config.searchValue;
        form.replaceValue = rule.config.replaceValue;
        form.caseSensitive = rule.config.caseSensitive;
        form.targetFields = rule.config.targetFields;
        break;
      case "field_mapping":
        form.sourceField = rule.config.sourceField;
        form.mappings = rule.config.mappings;
        form.defaultValue = rule.config.defaultValue;
        break;
      case "regex_transform":
        form.targetField = rule.config.targetField;
        form.pattern = rule.config.pattern;
        form.replacement = rule.config.replacement;
        form.flags = rule.config.flags;
        break;
      case "conditional":
        form.conditionField = rule.config.condition.field;
        form.conditionOperator = rule.config.condition.operator;
        form.conditionValue = rule.config.condition.value;
        form.actionTargetField = rule.config.thenAction.targetField;
        form.actionType = rule.config.thenAction.action;
        form.actionValue = rule.config.thenAction.value;
        break;
    }

    setRuleForm(form as Partial<CustomRule>);
    setIsDialogOpen(true);
  };

  const handleDuplicate = (rule: CustomRule) => {
    const newRule = {
      ...rule,
      name: `${rule.name} (Copy)`,
      isActive: false,
    };
    delete (newRule as { id?: string }).id;
    addCustomRule(newRule);
    setRules(loadCustomRules());
    toast.success("Rule duplicated");
  };

  const handleAddSamples = () => {
    const samples = getSampleCustomRules();
    const currentRules = loadCustomRules();
    const existingIds = new Set(currentRules.map((r) => r.id));

    let added = 0;
    for (const sample of samples) {
      if (!existingIds.has(sample.id)) {
        addCustomRule(sample);
        added++;
      }
    }

    setRules(loadCustomRules());
    if (added > 0) {
      toast.success(`Added ${added} sample rule(s)`);
    } else {
      toast.info("Sample rules already exist");
    }
  };

  const resetForm = () => {
    setEditingRule(null);
    setRuleForm({
      name: "",
      description: "",
      isActive: true,
      priority: 50,
      type: "value_replace",
    });
  };

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case "value_replace":
        return <Badge variant="outline">Replace</Badge>;
      case "field_mapping":
        return <Badge variant="secondary">Mapping</Badge>;
      case "regex_transform":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Regex</Badge>;
      case "conditional":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Conditional</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const updateFormField = (field: string, value: unknown) => {
    setRuleForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Rules</h1>
          <p className="text-muted-foreground">
            Define custom transformation rules for DAG conversion
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddSamples}>
            <Sparkles className="h-4 w-4 mr-2" />
            Add Samples
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Edit Rule" : "Create New Rule"}
                </DialogTitle>
                <DialogDescription>
                  Define a custom transformation rule
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input
                      placeholder="My Rule"
                      value={ruleForm.name || ""}
                      onChange={(e) => updateFormField("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority (1-100)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={ruleForm.priority || 50}
                      onChange={(e) => updateFormField("priority", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="What this rule does..."
                    value={ruleForm.description || ""}
                    onChange={(e) => updateFormField("description", e.target.value)}
                  />
                </div>

                {/* Rule Type Selection */}
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select
                    value={ruleForm.type}
                    onValueChange={(v) => updateFormField("type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex flex-col">
                            <span>{t.label}</span>
                            <span className="text-xs text-muted-foreground">{t.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type-specific Configuration */}
                {ruleForm.type === "value_replace" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Value Replace Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Search Value</Label>
                          <Input
                            placeholder="Text to find"
                            value={(ruleForm as { searchValue?: string }).searchValue || ""}
                            onChange={(e) => updateFormField("searchValue", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Replace With</Label>
                          <Input
                            placeholder="Replacement text"
                            value={(ruleForm as { replaceValue?: string }).replaceValue || ""}
                            onChange={(e) => updateFormField("replaceValue", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={(ruleForm as { caseSensitive?: boolean }).caseSensitive || false}
                          onCheckedChange={(v) => updateFormField("caseSensitive", v)}
                        />
                        <Label>Case Sensitive</Label>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {ruleForm.type === "field_mapping" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Field Mapping Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Source Field</Label>
                        <Select
                          value={(ruleForm as { sourceField?: string }).sourceField || ""}
                          onValueChange={(v) => updateFormField("sourceField", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_FIELDS.map((f) => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Mappings (from → to)</Label>
                        <div className="space-y-2">
                          {((ruleForm as { mappings?: { from: string; to: string }[] }).mappings || []).map((m, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input
                                placeholder="From"
                                value={m.from}
                                onChange={(e) => {
                                  const mappings = [...((ruleForm as { mappings?: { from: string; to: string }[] }).mappings || [])];
                                  mappings[idx] = { ...mappings[idx], from: e.target.value };
                                  updateFormField("mappings", mappings);
                                }}
                              />
                              <span>→</span>
                              <Input
                                placeholder="To"
                                value={m.to}
                                onChange={(e) => {
                                  const mappings = [...((ruleForm as { mappings?: { from: string; to: string }[] }).mappings || [])];
                                  mappings[idx] = { ...mappings[idx], to: e.target.value };
                                  updateFormField("mappings", mappings);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const mappings = ((ruleForm as { mappings?: { from: string; to: string }[] }).mappings || []).filter((_, i) => i !== idx);
                                  updateFormField("mappings", mappings);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const mappings = [...((ruleForm as { mappings?: { from: string; to: string }[] }).mappings || []), { from: "", to: "" }];
                              updateFormField("mappings", mappings);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Mapping
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {ruleForm.type === "regex_transform" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Regex Transform Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Target Field</Label>
                        <Select
                          value={(ruleForm as { targetField?: string }).targetField || ""}
                          onValueChange={(v) => updateFormField("targetField", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_FIELDS.map((f) => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Pattern (Regex)</Label>
                          <Input
                            placeholder="^prefix_"
                            value={(ruleForm as { pattern?: string }).pattern || ""}
                            onChange={(e) => updateFormField("pattern", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Replacement</Label>
                          <Input
                            placeholder="new_prefix_"
                            value={(ruleForm as { replacement?: string }).replacement || ""}
                            onChange={(e) => updateFormField("replacement", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Flags</Label>
                        <Input
                          placeholder="gi"
                          value={(ruleForm as { flags?: string }).flags || "g"}
                          onChange={(e) => updateFormField("flags", e.target.value)}
                          className="w-24"
                        />
                        <p className="text-xs text-muted-foreground">g = global, i = case insensitive</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {ruleForm.type === "conditional" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Conditional Rule Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>IF Condition</Label>
                        <div className="flex gap-2 items-center">
                          <Select
                            value={(ruleForm as { conditionField?: string }).conditionField || ""}
                            onValueChange={(v) => updateFormField("conditionField", v)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMON_FIELDS.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={(ruleForm as { conditionOperator?: string }).conditionOperator || "equals"}
                            onValueChange={(v) => updateFormField("conditionOperator", v)}
                          >
                            <SelectTrigger className="w-36">
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
                            placeholder="Value"
                            value={(ruleForm as { conditionValue?: string }).conditionValue || ""}
                            onChange={(e) => updateFormField("conditionValue", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>THEN Action</Label>
                        <div className="flex gap-2 items-center">
                          <Select
                            value={(ruleForm as { actionType?: string }).actionType || "set"}
                            onValueChange={(v) => updateFormField("actionType", v)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="set">Set</SelectItem>
                              <SelectItem value="append">Append</SelectItem>
                              <SelectItem value="prepend">Prepend</SelectItem>
                              <SelectItem value="replace">Replace</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={(ruleForm as { actionTargetField?: string }).actionTargetField || ""}
                            onValueChange={(v) => updateFormField("actionTargetField", v)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMON_FIELDS.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span>to</span>
                          <Input
                            placeholder="Value"
                            value={(ruleForm as { actionValue?: string }).actionValue || ""}
                            onChange={(e) => updateFormField("actionValue", e.target.value)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Use {"{{FIELD}}"} for placeholders</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingRule ? "Update Rule" : "Create Rule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Cog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.filter((r) => r.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Rules</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.filter((r) => !r.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rule Types</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(rules.map((r) => r.type)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Rules</CardTitle>
          <CardDescription>
            Rules are applied in priority order (highest first) during conversion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <Cog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No custom rules defined</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create rules to customize DAG conversion
              </p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Active</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules
                  .sort((a, b) => b.priority - a.priority)
                  .map((rule) => (
                    <TableRow key={rule.id} className={!rule.isActive ? "opacity-50" : ""}>
                      <TableCell>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(v) => handleToggle(rule.id, v)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{getRuleTypeBadge(rule.type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {rule.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rule)}
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(rule)}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rule.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
