"use client";

import { useConverterStore } from "@/store/converter-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Folder,
  FileCode,
  ChevronRight,
  ChevronDown,
  Files,
  Search,
  AlertTriangle,
  Check,
  Square,
} from "lucide-react";
import { useState, useMemo, useCallback, memo } from "react";
import type { ControlMJob } from "@/types/controlm";

// Threshold for enabling performance mode
const LARGE_FILE_THRESHOLD = 500;
const MAX_VISIBLE_JOBS_PER_FOLDER = 100;

// Memoized checkbox component
const CheckboxSimple = memo(function CheckboxSimple({
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
});

// Memoized job item component
const JobItem = memo(function JobItem({
  job,
  isSelected,
  onToggle,
}: {
  job: ControlMJob;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors">
      <CheckboxSimple checked={isSelected} onCheckedChange={onToggle} />
      <FileCode className="h-4 w-4 text-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{job.JOBNAME}</p>
        {job.DESCRIPTION && (
          <p className="text-xs text-muted-foreground truncate">
            {job.DESCRIPTION}
          </p>
        )}
      </div>
      {job.JOB_TYPE && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {job.JOB_TYPE}
        </Badge>
      )}
    </div>
  );
});

export function JobPreview() {
  const {
    parsedDefinition,
    selectedJobs,
    toggleJobSelection,
    // Batch mode
    batchFiles,
    isBatchMode,
    getAllJobs,
    setSelectedJobs,
  } = useConverterStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllJobs, setShowAllJobs] = useState<Record<string, boolean>>({});

  // Get all jobs from single file or batch files
  const allJobs = useMemo(
    () => getAllJobs(),
    [getAllJobs, parsedDefinition, batchFiles]
  );

  // Performance mode for large files
  const isLargeFile = allJobs.length > LARGE_FILE_THRESHOLD;

  // Filter jobs by search query (memoized)
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return allJobs;
    const query = searchQuery.toLowerCase();
    return allJobs.filter(
      (job) =>
        job.JOBNAME.toLowerCase().includes(query) ||
        job.DESCRIPTION?.toLowerCase().includes(query) ||
        job.JOB_TYPE?.toLowerCase().includes(query) ||
        job.FOLDER_NAME?.toLowerCase().includes(query)
    );
  }, [allJobs, searchQuery]);

  // Check if we have any jobs to show
  const hasJobs = allJobs.length > 0;

  // Group jobs by folder (memoized)
  const jobsByFolder = useMemo(() => {
    return filteredJobs.reduce(
      (acc, job) => {
        const folder = job.FOLDER_NAME || "Ungrouped";
        if (!acc[folder]) {
          acc[folder] = [];
        }
        acc[folder].push(job);
        return acc;
      },
      {} as Record<string, ControlMJob[]>
    );
  }, [filteredJobs]);

  // Selected jobs set for O(1) lookup
  const selectedJobsSet = useMemo(
    () => new Set(selectedJobs),
    [selectedJobs]
  );

  const toggleFolder = useCallback((folderName: string) => {
    setExpandedFolders((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderName)) {
        newExpanded.delete(folderName);
      } else {
        newExpanded.add(folderName);
      }
      return newExpanded;
    });
  }, []);

  const allSelected = selectedJobs.length === allJobs.length && allJobs.length > 0;

  // Select/deselect all using all jobs
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(allJobs.map((j) => j.JOBNAME));
    }
  }, [allSelected, allJobs, setSelectedJobs]);

  // Select/deselect all jobs in a folder
  const handleSelectFolder = useCallback(
    (folderName: string, jobs: ControlMJob[]) => {
      const folderJobNames = jobs.map((j) => j.JOBNAME);
      const allFolderSelected = folderJobNames.every((name) =>
        selectedJobsSet.has(name)
      );

      if (allFolderSelected) {
        // Deselect all in folder
        setSelectedJobs(
          selectedJobs.filter((name) => !folderJobNames.includes(name))
        );
      } else {
        // Select all in folder
        const newSelected = new Set(selectedJobs);
        folderJobNames.forEach((name) => newSelected.add(name));
        setSelectedJobs(Array.from(newSelected));
      }
    },
    [selectedJobs, selectedJobsSet, setSelectedJobs]
  );

  // Toggle show all jobs in folder
  const toggleShowAllJobs = useCallback((folderName: string) => {
    setShowAllJobs((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  }, []);

  if (!hasJobs) {
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isBatchMode && <Files className="h-4 w-4" />}
            Jobs ({allJobs.length})
            {isBatchMode && (
              <Badge variant="outline" className="text-xs ml-2">
                from {batchFiles.filter((f) => f.parsed).length} files
              </Badge>
            )}
            {isLargeFile && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Large file
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedJobs.length} selected
            </Badge>
            <button
              className="text-xs text-primary hover:underline"
              onClick={handleSelectAll}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
        </div>

        {/* Search input for filtering */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by name, type, or folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Show filtered count if searching */}
        {searchQuery && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing {filteredJobs.length} of {allJobs.length} jobs
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 pt-0 space-y-2">
            {Object.entries(jobsByFolder).map(([folderName, jobs]) => {
              const folderJobNames = jobs.map((j) => j.JOBNAME);
              const selectedInFolder = folderJobNames.filter((name) =>
                selectedJobsSet.has(name)
              ).length;
              const allFolderSelected = selectedInFolder === jobs.length;
              const someFolderSelected =
                selectedInFolder > 0 && selectedInFolder < jobs.length;

              // Limit visible jobs for performance
              const shouldLimitJobs =
                isLargeFile && jobs.length > MAX_VISIBLE_JOBS_PER_FOLDER;
              const showAll = showAllJobs[folderName];
              const visibleJobs =
                shouldLimitJobs && !showAll
                  ? jobs.slice(0, MAX_VISIBLE_JOBS_PER_FOLDER)
                  : jobs;
              const hiddenCount = jobs.length - visibleJobs.length;

              return (
                <div key={folderName} className="border rounded-lg">
                  <div className="flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors">
                    {/* Folder select checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectFolder(folderName, jobs);
                      }}
                      className="flex items-center justify-center h-4 w-4"
                    >
                      {allFolderSelected ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : someFolderSelected ? (
                        <Square className="h-4 w-4 text-primary fill-primary/30" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    <button
                      className="flex-1 flex items-center gap-2"
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
                        {selectedInFolder}/{jobs.length}
                      </Badge>
                    </button>
                  </div>

                  {expandedFolders.has(folderName) && (
                    <div className="border-t">
                      {visibleJobs.map((job) => (
                        <JobItem
                          key={job.JOBNAME}
                          job={job}
                          isSelected={selectedJobsSet.has(job.JOBNAME)}
                          onToggle={() => toggleJobSelection(job.JOBNAME)}
                        />
                      ))}

                      {/* Show more button for large folders */}
                      {shouldLimitJobs && hiddenCount > 0 && (
                        <button
                          onClick={() => toggleShowAllJobs(folderName)}
                          className="w-full py-2 text-xs text-primary hover:bg-muted/30 transition-colors"
                        >
                          {showAll
                            ? `Show less`
                            : `Show ${hiddenCount} more jobs...`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* No results message */}
            {Object.keys(jobsByFolder).length === 0 && searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No jobs match &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
