"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConverterStore } from "@/store/converter-store";

export function FileUploader() {
  const { inputFile, setInputFile, setInputContent, setInputType, setStep } =
    useConverterStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Determine file type
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "xml" && extension !== "json") {
        alert("Please upload an XML or JSON file");
        return;
      }

      // Read file content
      const content = await file.text();

      setInputFile(file);
      setInputContent(content);
      setInputType(extension as "xml" | "json");
      setStep("select");
    },
    [setInputFile, setInputContent, setInputType, setStep]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/xml": [".xml"],
      "text/xml": [".xml"],
      "application/json": [".json"],
    },
    maxFiles: 1,
  });

  const removeFile = () => {
    setInputFile(null);
    setInputContent("");
    setInputType(null);
    setStep("upload");
  };

  if (inputFile) {
    return (
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
    );
  }

  return (
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
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        {isDragActive ? (
          <p className="text-lg font-medium">Drop the file here...</p>
        ) : (
          <>
            <div>
              <p className="text-lg font-medium">
                Drag & drop your Control-M file here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports XML and JSON formats
            </p>
          </>
        )}
      </div>
    </div>
  );
}
