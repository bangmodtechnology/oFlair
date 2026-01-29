"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Copy,
  CalendarDays,
  CalendarOff,
  CalendarCheck,
  CalendarClock,
  X,
  Sparkles,
} from "lucide-react";
import {
  type CalendarEntry,
  loadCalendars,
  saveCalendars,
  addCalendar,
  updateCalendar,
  deleteCalendar,
  getSampleCalendars,
} from "@/lib/storage/config-storage";
import { toast } from "sonner";

type CalendarType = "business_days" | "holidays" | "custom" | "weekly_pattern";

const CALENDAR_TYPE_INFO: Record<CalendarType, { label: string; description: string; icon: React.ElementType }> = {
  holidays: {
    label: "Holidays",
    description: "Exclude specific dates (holidays, maintenance windows)",
    icon: CalendarOff,
  },
  business_days: {
    label: "Business Days",
    description: "Run on standard business days (Mon-Fri)",
    icon: CalendarCheck,
  },
  weekly_pattern: {
    label: "Weekly Pattern",
    description: "Custom weekly pattern (e.g., Tue, Thu, Sat)",
    icon: CalendarClock,
  },
  custom: {
    label: "Custom",
    description: "Run only on specific included dates",
    icon: CalendarDays,
  },
};

const WEEKDAYS = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

export default function CalendarsPage() {
  const [calendars, setCalendars] = useState<CalendarEntry[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<CalendarEntry | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CalendarType>("holidays");
  const [isActive, setIsActive] = useState(true);
  const [pattern, setPattern] = useState("MON-FRI");
  const [timezone, setTimezone] = useState("UTC");
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [includedDates, setIncludedDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState("");

  // Load calendars
  useEffect(() => {
    setCalendars(loadCalendars());
  }, []);

  // Stats
  const totalCalendars = calendars.length;
  const activeCalendars = calendars.filter((c) => c.isActive).length;
  const holidayCalendars = calendars.filter((c) => c.type === "holidays").length;

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("holidays");
    setIsActive(true);
    setPattern("MON-FRI");
    setTimezone("UTC");
    setExcludedDates([]);
    setIncludedDates([]);
    setNewDate("");
    setEditingCalendar(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (calendar: CalendarEntry) => {
    setEditingCalendar(calendar);
    setName(calendar.name);
    setDescription(calendar.description || "");
    setType(calendar.type);
    setIsActive(calendar.isActive);
    setPattern(calendar.pattern || "MON-FRI");
    setTimezone(calendar.timezone || "UTC");
    setExcludedDates(calendar.excludedDates || []);
    setIncludedDates(calendar.includedDates || []);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Calendar name is required");
      return;
    }

    const calendarData = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      isActive,
      pattern: type === "business_days" || type === "weekly_pattern" ? pattern : undefined,
      timezone,
      excludedDates: type === "holidays" ? excludedDates : undefined,
      includedDates: type === "custom" ? includedDates : undefined,
    };

    if (editingCalendar) {
      updateCalendar(editingCalendar.id, calendarData);
      toast.success("Calendar updated");
    } else {
      addCalendar(calendarData);
      toast.success("Calendar created");
    }

    setCalendars(loadCalendars());
    setShowDialog(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this calendar?")) {
      deleteCalendar(id);
      setCalendars(loadCalendars());
      toast.success("Calendar deleted");
    }
  };

  const handleDuplicate = (calendar: CalendarEntry) => {
    addCalendar({
      name: `${calendar.name} (Copy)`,
      description: calendar.description,
      type: calendar.type,
      isActive: false,
      pattern: calendar.pattern,
      timezone: calendar.timezone,
      excludedDates: calendar.excludedDates,
      includedDates: calendar.includedDates,
    });
    setCalendars(loadCalendars());
    toast.success("Calendar duplicated");
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateCalendar(id, { isActive });
    setCalendars(loadCalendars());
  };

  const handleAddDate = () => {
    if (!newDate) return;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDate)) {
      toast.error("Invalid date format. Use YYYY-MM-DD");
      return;
    }

    if (type === "holidays") {
      if (excludedDates.includes(newDate)) {
        toast.error("Date already exists");
        return;
      }
      setExcludedDates([...excludedDates, newDate].sort());
    } else if (type === "custom") {
      if (includedDates.includes(newDate)) {
        toast.error("Date already exists");
        return;
      }
      setIncludedDates([...includedDates, newDate].sort());
    }
    setNewDate("");
  };

  const handleRemoveDate = (date: string) => {
    if (type === "holidays") {
      setExcludedDates(excludedDates.filter((d) => d !== date));
    } else if (type === "custom") {
      setIncludedDates(includedDates.filter((d) => d !== date));
    }
  };

  const handlePatternChange = (day: string, checked: boolean) => {
    const currentDays = pattern.split(",").filter((d) => d.trim());
    let newDays: string[];

    if (checked) {
      newDays = [...currentDays, day];
    } else {
      newDays = currentDays.filter((d) => d !== day);
    }

    // Sort by weekday order
    const dayOrder = WEEKDAYS.map((w) => w.value);
    newDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    setPattern(newDays.join(","));
  };

  const handleAddSampleCalendars = () => {
    const samples = getSampleCalendars();
    let added = 0;

    for (const sample of samples) {
      // Check if a calendar with the same name exists
      const existing = calendars.find(
        (c) => c.name.toLowerCase() === sample.name.toLowerCase()
      );
      if (!existing) {
        addCalendar(sample);
        added++;
      }
    }

    if (added > 0) {
      setCalendars(loadCalendars());
      toast.success(`Added ${added} sample calendar(s)`);
    } else {
      toast.info("All sample calendars already exist");
    }
  };

  const getTypeIcon = (calType: CalendarType) => {
    const Icon = CALENDAR_TYPE_INFO[calType].icon;
    return <Icon className="h-4 w-4" />;
  };

  const formatDateCount = (calendar: CalendarEntry): string => {
    if (calendar.type === "holidays" && calendar.excludedDates) {
      return `${calendar.excludedDates.length} dates`;
    }
    if (calendar.type === "custom" && calendar.includedDates) {
      return `${calendar.includedDates.length} dates`;
    }
    if (calendar.pattern) {
      return calendar.pattern;
    }
    return "-";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendars</h1>
          <p className="text-muted-foreground">
            Manage holiday calendars and scheduling patterns for DAG execution
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddSampleCalendars}>
            <Sparkles className="mr-2 h-4 w-4" />
            Add Samples
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Calendar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calendars</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalendars}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CalendarCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCalendars}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Holiday Calendars</CardTitle>
            <CalendarOff className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holidayCalendars}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendars Table */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar List</CardTitle>
          <CardDescription>
            Configure calendars for scheduling Control-M to Airflow conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calendars.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No calendars configured yet.</p>
              <p className="text-sm mt-2">
                Click "Add Samples" to add common calendar patterns or "New Calendar" to create your own.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Active</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pattern/Dates</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendars.map((calendar) => (
                  <TableRow key={calendar.id}>
                    <TableCell>
                      <Switch
                        checked={calendar.isActive}
                        onCheckedChange={(checked) =>
                          handleToggleActive(calendar.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{calendar.name}</div>
                        {calendar.description && (
                          <div className="text-sm text-muted-foreground">
                            {calendar.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        {getTypeIcon(calendar.type)}
                        {CALENDAR_TYPE_INFO[calendar.type].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {formatDateCount(calendar)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{calendar.timezone || "UTC"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(calendar)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(calendar)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(calendar.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCalendar ? "Edit Calendar" : "Create Calendar"}
            </DialogTitle>
            <DialogDescription>
              Configure a calendar for scheduling exclusions or patterns
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., US Holidays 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as CalendarType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CALENDAR_TYPE_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <info.icon className="h-4 w-4" />
                          {info.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                    <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                    <SelectItem value="Asia/Bangkok">Asia/Bangkok (ICT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    id="active"
                  />
                  <Label htmlFor="active" className="font-normal">
                    {isActive ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </div>

            {/* Type-specific configuration */}
            {(type === "business_days" || type === "weekly_pattern") && (
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const isSelected = pattern.split(",").includes(day.value);
                    return (
                      <Button
                        key={day.value}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePatternChange(day.value, !isSelected)}
                      >
                        {day.label}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground">
                  Current pattern: <code className="font-mono">{pattern || "(none)"}</code>
                </p>
              </div>
            )}

            {(type === "holidays" || type === "custom") && (
              <div className="space-y-2">
                <Label>
                  {type === "holidays" ? "Excluded Dates" : "Included Dates"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAddDate}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Date list */}
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {(type === "holidays" ? excludedDates : includedDates).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No dates added yet
                    </p>
                  ) : (
                    (type === "holidays" ? excludedDates : includedDates).map((date) => (
                      <div
                        key={date}
                        className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted"
                      >
                        <span className="font-mono text-sm">{date}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveDate(date)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {type === "holidays"
                    ? "Jobs will NOT run on these dates"
                    : "Jobs will ONLY run on these dates"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingCalendar ? "Save Changes" : "Create Calendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
