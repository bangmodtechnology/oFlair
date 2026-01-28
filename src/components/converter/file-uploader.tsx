"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, Files, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useConverterStore, BatchFileInput } from "@/store/converter-store";
import { ScrollArea } from "@/components/ui/scroll-area";

export function FileUploader() {
  const {
    inputFile,
    setInputFile,
    setInputContent,
    setInputType,
    setParsedDefinition,
    // Batch mode
    batchFiles,
    isBatchMode,
    addBatchFiles,
    removeBatchFile,
    clearBatchFiles,
    setIsBatchMode,
  } = useConverterStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      // Process files
      const processedFiles: BatchFileInput[] = [];

      for (const file of acceptedFiles) {
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension !== "xml" && extension !== "json") {
          continue; // Skip invalid files
        }

        const content = await file.text();
        processedFiles.push({
          file,
          content,
          type: extension as "xml" | "json",
        });
      }

      if (processedFiles.length === 0) {
        alert("Please upload XML or JSON files");
        return;
      }

      if (isBatchMode) {
        // Batch mode: add to batch files
        addBatchFiles(processedFiles);
      } else {
        // Single file mode: use first file
        const firstFile = processedFiles[0];
        setInputFile(firstFile.file);
        setInputContent(firstFile.content);
        setInputType(firstFile.type);
      }
    },
    [isBatchMode, addBatchFiles, setInputFile, setInputContent, setInputType]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/xml": [".xml"],
      "text/xml": [".xml"],
      "application/json": [".json"],
    },
    maxFiles: isBatchMode ? undefined : 1,
    multiple: isBatchMode,
  });

  const removeFile = () => {
    setInputFile(null);
    setInputContent("");
    setInputType(null);
    setParsedDefinition(null);
  };

  const handleBatchModeToggle = (checked: boolean) => {
    if (checked) {
      // Switching to batch mode
      if (inputFile) {
        // Move current single file to batch
        const extension = inputFile.name.split(".").pop()?.toLowerCase();
        if (extension === "xml" || extension === "json") {
          addBatchFiles([
            {
              file: inputFile,
              content: useConverterStore.getState().inputContent,
              type: extension,
            },
          ]);
        }
        removeFile();
      }
      setIsBatchMode(true);
    } else {
      // Switching to single file mode
      clearBatchFiles();
      setIsBatchMode(false);
    }
  };

  const hasFiles = isBatchMode ? batchFiles.length > 0 : inputFile !== null;
  const totalJobs = batchFiles.reduce(
    (sum, f) => sum + (f.parsed?.jobs.length || 0),
    0
  );

  // Render file list for batch mode
  if (isBatchMode && batchFiles.length > 0) {
    return (
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="batch-mode"
              checked={isBatchMode}
              onCheckedChange={handleBatchModeToggle}
            />
            <Label htmlFor="batch-mode" className="flex items-center gap-2">
              <Files className="h-4 w-4" />
              Batch Mode
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {batchFiles.length} files
            </Badge>
            {totalJobs > 0 && (
              <Badge variant="outline">
                {totalJobs} jobs
              </Badge>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="border-2 border-dashed rounded-lg p-4">
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {batchFiles.map((batchFile, index) => (
                <div
                  key={`${batchFile.file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {batchFile.parsed ? (
                        <FileCheck className="h-5 w-5 text-green-500" />
                      ) : batchFile.error ? (
                        <X className="h-5 w-5 text-destructive" />
                      ) : (
                        <File className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{batchFile.file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {(batchFile.file.size / 1024).toFixed(1)} KB
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {batchFile.type.toUpperCase()}
                        </Badge>
                        {batchFile.parsed && (
                          <span className="text-xs text-green-600">
                            {batchFile.parsed.jobs.length} jobs
                          </span>
                        )}
                        {batchFile.error && (
                          <span className="text-xs text-destructive">
                            Error
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBatchFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Add more files dropzone */}
          <div
            {...getRootProps()}
            className={`mt-4 border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              {isDragActive ? "Drop files here..." : "Add more files"}
            </div>
          </div>
        </div>

        {/* Clear all button */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearBatchFiles}>
            Clear All Files
          </Button>
        </div>
      </div>
    );
  }

  // Render single file view
  if (inputFile) {
    return (
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="batch-mode"
            checked={isBatchMode}
            onCheckedChange={handleBatchModeToggle}
          />
          <Label htmlFor="batch-mode" className="flex items-center gap-2">
            <Files className="h-4 w-4" />
            Batch Mode
          </Label>
        </div>

        <div className="border-2 border-dashed rounded-lg p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <File className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{inputFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(inputFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={removeFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render empty dropzone
  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="batch-mode"
          checked={isBatchMode}
          onCheckedChange={handleBatchModeToggle}
        />
        <Label htmlFor="batch-mode" className="flex items-center gap-2">
          <Files className="h-4 w-4" />
          Batch Mode
        </Label>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {isBatchMode ? (
              <Files className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          {isDragActive ? (
            <p className="text-lg font-medium">
              Drop the {isBatchMode ? "files" : "file"} here...
            </p>
          ) : (
            <>
              <div>
                <p className="text-lg font-medium">
                  {isBatchMode
                    ? "Drag & drop multiple Control-M files here"
                    : "Drag & drop your Control-M file here"}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports XML and JSON formats
                {isBatchMode && " (multiple files)"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
