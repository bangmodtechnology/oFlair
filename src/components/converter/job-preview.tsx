"use client";

import { useConverterStore } from "@/store/converter-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Folder,
  FileCode,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

// Custom Checkbox component if not available from shadcn
function CheckboxSimple({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="h-4 w-4 rounded border-gray-300"
    />
  );
}

export function JobPreview() {
  const {
    parsedDefinition,
    selectedJobs,
    toggleJobSelection,
    selectAllJobs,
    deselectAllJobs,
  } = useConverterStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  if (!parsedDefinition) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jobs Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No file loaded</p>
        </CardContent>
      </Card>
    );
  }

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const allSelected = selectedJobs.length === parsedDefinition.jobs.length;
  const someSelected =
    selectedJobs.length > 0 &&
    selectedJobs.length < parsedDefinition.jobs.length;

  // Group jobs by folder
  const jobsByFolder = parsedDefinition.jobs.reduce(
    (acc, job) => {
      const folder = job.FOLDER_NAME || "Ungrouped";
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(job);
      return acc;
    },
    {} as Record<string, typeof parsedDefinition.jobs>
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Jobs ({parsedDefinition.jobs.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedJobs.length} selected
            </Badge>
            <button
              className="text-xs text-primary hover:underline"
              onClick={allSelected ? deselectAllJobs : selectAllJobs}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 pt-0 space-y-2">
            {Object.entries(jobsByFolder).map(([folderName, jobs]) => (
              <div key={folderName} className="border rounded-lg">
                <button
                  className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors"
                  onClick={() => toggleFolder(folderName)}
                >
                  {expandedFolders.has(folderName) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Folder className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-sm">{folderName}</span>
                  <Badge variant="outline" className="ml-auto">
                    {jobs.length}
                  </Badge>
                </button>

                {expandedFolders.has(folderName) && (
                  <div className="border-t">
                    {jobs.map((job) => (
                      <div
                        key={job.JOBNAME}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors"
                      >
                        <CheckboxSimple
                          checked={selectedJobs.includes(job.JOBNAME)}
                          onCheckedChange={() =>
                            toggleJobSelection(job.JOBNAME)
                          }
                        />
                        <FileCode className="h-4 w-4 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {job.JOBNAME}
                          </p>
                          {job.DESCRIPTION && (
                            <p className="text-xs text-muted-foreground truncate">
                              {job.DESCRIPTION}
                            </p>
                          )}
                        </div>
                        {job.JOB_TYPE && (
                          <Badge variant="secondary" className="text-xs">
                            {job.JOB_TYPE}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
