"use client";

import { useState } from "react";
import { useConverterStore } from "@/store/converter-store";
import { FileUploader } from "@/components/converter/file-uploader";
import { JobPreview } from "@/components/converter/job-preview";
import { OutputViewer } from "@/components/converter/output-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { parseControlM } from "@/lib/parser";
import { generateDags } from "@/lib/generator";
import { toast } from "sonner";

export default function ConvertPage() {
  const {
    step,
    inputContent,
    inputType,
    parsedDefinition,
    selectedJobs,
    isProcessing,
    error,
    setParsedDefinition,
    setGeneratedDags,
    setIsProcessing,
    setError,
    setStep,
    reset,
  } = useConverterStore();

  const [selectedTemplate, setSelectedTemplate] = useState("default");

  const handleParse = async () => {
    if (!inputContent || !inputType) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await parseControlM(inputContent, inputType);
      setParsedDefinition(result);
      setStep("convert");
      toast.success(`Parsed ${result.jobs.length} jobs successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse file";
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvert = async () => {
    if (!parsedDefinition || selectedJobs.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      const jobsToConvert = parsedDefinition.jobs.filter((job) =>
        selectedJobs.includes(job.JOBNAME)
      );

      const dags = await generateDags(jobsToConvert, selectedTemplate);
      setGeneratedDags(dags);
      setStep("result");
      toast.success(`Generated ${dags.length} DAG(s) successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate DAGs";
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Convert</h1>
          <p className="text-muted-foreground">
            Upload and convert Control-M jobs to Airflow DAGs
          </p>
        </div>
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Start Over
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <StepIndicator
          number={1}
          label="Upload"
          active={step === "upload"}
          completed={step !== "upload"}
        />
        <div className="flex-1 h-px bg-border" />
        <StepIndicator
          number={2}
          label="Preview"
          active={step === "preview"}
          completed={step === "convert" || step === "result"}
        />
        <div className="flex-1 h-px bg-border" />
        <StepIndicator
          number={3}
          label="Convert"
          active={step === "convert"}
          completed={step === "result"}
        />
        <div className="flex-1 h-px bg-border" />
        <StepIndicator
          number={4}
          label="Result"
          active={step === "result"}
          completed={false}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Panel */}
        <div className="space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Upload Control-M File</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader />
              {step === "preview" && (
                <Button
                  className="w-full mt-4"
                  onClick={handleParse}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      Parse File
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Job Selection */}
          {(step === "convert" || step === "result") && (
            <JobPreview />
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Template Selection */}
          {(step === "convert" || step === "result") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  2. Select Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      Default Template
                    </SelectItem>
                    <SelectItem value="bash">
                      Bash Operator Only
                    </SelectItem>
                    <SelectItem value="python">
                      Python Operator
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  className="w-full"
                  onClick={handleConvert}
                  disabled={isProcessing || selectedJobs.length === 0}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      Convert {selectedJobs.length} Jobs
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Output */}
          {step === "result" && <OutputViewer />}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
          active
            ? "bg-primary text-primary-foreground"
            : completed
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {number}
      </div>
      <span
        className={`text-sm ${
          active ? "font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
