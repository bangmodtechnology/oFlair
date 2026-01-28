"use client";

import { useState } from "react";
import { useConverterStore } from "@/store/converter-store";
import { FileUploader } from "@/components/converter/file-uploader";
import { JobPreview } from "@/components/converter/job-preview";
import { OutputViewer } from "@/components/converter/output-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, RefreshCw, Settings2, Info } from "lucide-react";
import { parseControlM } from "@/lib/parser";
import { generateDags, type AirflowVersion } from "@/lib/generator";
import { addConversionToHistory } from "@/lib/storage/config-storage";
import { toast } from "sonner";

export default function ConvertPage() {
  const {
    step,
    inputFile,
    inputContent,
    inputType,
    parsedDefinition,
    selectedJobs,
    isProcessing,
    error,
    generatedDags,
    setParsedDefinition,
    setGeneratedDags,
    setIsProcessing,
    setError,
    setStep,
    reset,
  } = useConverterStore();

  const [selectedTemplate, setSelectedTemplate] = useState("default");
  const [airflowVersion, setAirflowVersion] = useState<AirflowVersion>("3.1");
  const [useTaskFlowApi, setUseTaskFlowApi] = useState(false);

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

      const dags = await generateDags(jobsToConvert, {
        templateId: selectedTemplate,
        airflowVersion,
        useTaskFlowApi,
      });
      setGeneratedDags(dags);
      setStep("result");

      // Save to conversion history
      addConversionToHistory({
        sourceFile: inputFile?.name || "unknown.xml",
        sourceType: inputType || "xml",
        jobsConverted: dags.flatMap((dag) =>
          dag.dag.tasks.map((task) => ({
            jobName: task.taskId,
            dagId: dag.dag.dagId,
            operator: task.operatorType,
          }))
        ),
        airflowVersion,
        status: "success",
      });

      toast.success(`Generated ${dags.length} DAG(s) for Airflow ${airflowVersion}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate DAGs";
      setError(message);

      // Save failed conversion to history
      addConversionToHistory({
        sourceFile: inputFile?.name || "unknown.xml",
        sourceType: inputType || "xml",
        jobsConverted: [],
        airflowVersion,
        status: "failed",
      });

      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const isAirflow3 = airflowVersion.startsWith("3");

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
          {/* Template & Version Selection */}
          {(step === "convert" || step === "result") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  2. Configure Output
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Airflow Version */}
                <div className="space-y-2">
                  <Label>Airflow Version</Label>
                  <Select
                    value={airflowVersion}
                    onValueChange={(v) => setAirflowVersion(v as AirflowVersion)}
                  >
                    <SelectTrigger>
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

                {/* Template Selection */}
                <div className="space-y-2">
                  <Label>Template</Label>
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
                </div>

                {/* TaskFlow API Option (Airflow 3.x only) */}
                {isAirflow3 && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="taskflow"
                      checked={useTaskFlowApi}
                      onChange={(e) => setUseTaskFlowApi(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="taskflow" className="font-normal cursor-pointer">
                      Use TaskFlow API (@dag decorator)
                    </Label>
                  </div>
                )}

                {/* Airflow 3.x Info */}
                {isAirflow3 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Airflow 3.x uses new import paths from{" "}
                      <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">
                        airflow.providers.standard
                      </code>{" "}
                      and{" "}
                      <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">
                        airflow.sdk
                      </code>
                    </p>
                  </div>
                )}

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

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    Airflow {airflowVersion}
                  </Badge>
                  {isAirflow3 && useTaskFlowApi && (
                    <Badge variant="secondary">TaskFlow API</Badge>
                  )}
                </div>
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
