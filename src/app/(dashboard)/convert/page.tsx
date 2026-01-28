"use client";

import { useState } from "react";
import { useConverterStore } from "@/store/converter-store";
import { FileUploader } from "@/components/converter/file-uploader";
import { JobPreview } from "@/components/converter/job-preview";
import { OutputViewer } from "@/components/converter/output-viewer";
import { ConversionReportView } from "@/components/converter/conversion-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Settings2,
  Info,
  BarChart3,
  Layers,
  Upload,
  ListChecks,
  FileCode,
  CheckCircle2,
  Download,
} from "lucide-react";
import { parseControlM } from "@/lib/parser";
import {
  convertControlMToAirflow,
  getDividerStrategies,
  type AirflowVersion,
  type DivideStrategy,
} from "@/lib/converter";
import { addConversionToHistory } from "@/lib/storage/config-storage";
import { toast } from "sonner";

const STEPS = [
  { id: "upload", label: "Upload", icon: Upload, description: "Upload Control-M file" },
  { id: "select", label: "Select Jobs", icon: ListChecks, description: "Choose jobs to convert" },
  { id: "configure", label: "Configure", icon: Settings2, description: "Set output options" },
  { id: "review", label: "Review", icon: CheckCircle2, description: "Confirm and convert" },
  { id: "result", label: "Result", icon: Download, description: "Download DAGs" },
] as const;

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
    conversionReport,
    divideStrategy,
    setParsedDefinition,
    setGeneratedDags,
    setConversionReport,
    setDivideStrategy,
    setIsProcessing,
    setError,
    setStep,
    reset,
  } = useConverterStore();

  const [airflowVersion, setAirflowVersion] = useState<AirflowVersion>("3.1");
  const [useTaskFlowApi, setUseTaskFlowApi] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const dividerStrategies = getDividerStrategies();
  const currentStepIndex = STEPS.findIndex((s) => s.id === step);
  const isAirflow3 = airflowVersion.startsWith("3");

  const handleParse = async () => {
    if (!inputContent || !inputType) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await parseControlM(inputContent, inputType);
      setParsedDefinition(result);
      setStep("select");
      toast.success(`Found ${result.jobs.length} jobs`);
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

      const result = await convertControlMToAirflow(jobsToConvert, {
        airflowVersion,
        useTaskFlowApi,
        divideStrategy: { strategy: divideStrategy },
        includeComments: true,
      });

      setGeneratedDags(result.dags);
      setConversionReport(result.report);
      setStep("result");

      addConversionToHistory({
        sourceFile: inputFile?.name || "unknown.xml",
        sourceType: inputType || "xml",
        jobsConverted: result.dags.flatMap((dag) =>
          dag.dag.tasks.map((task) => ({
            jobName: task.taskId,
            dagId: dag.dag.dagId,
            operator: task.operatorType,
          }))
        ),
        airflowVersion,
        status: result.report.summary.failedJobs > 0 ? "partial" : "success",
      });

      toast.success(
        `Generated ${result.dags.length} DAG(s) for Airflow ${airflowVersion}`
      );

      if (result.report.warnings.length > 0) {
        toast.warning(`${result.report.warnings.length} warnings - check report`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate DAGs";
      setError(message);

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

  const canProceed = () => {
    switch (step) {
      case "upload":
        return !!inputContent && !!inputType;
      case "select":
        return selectedJobs.length > 0;
      case "configure":
        return true;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    switch (step) {
      case "upload":
        await handleParse();
        break;
      case "select":
        setStep("configure");
        break;
      case "configure":
        setStep("review");
        break;
      case "review":
        await handleConvert();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case "select":
        setStep("upload");
        break;
      case "configure":
        setStep("select");
        break;
      case "review":
        setStep("configure");
        break;
      case "result":
        setStep("review");
        break;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Convert</h1>
          <p className="text-muted-foreground">
            Convert Control-M jobs to Airflow DAGs
          </p>
        </div>
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Start Over
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isCompleted = index < currentStepIndex;

          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`mt-2 text-xs ${
                    isActive ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-px w-16 mx-2 ${
                    index < currentStepIndex ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const CurrentIcon = STEPS[currentStepIndex]?.icon || Upload;
              return <CurrentIcon className="h-5 w-5" />;
            })()}
            Step {currentStepIndex + 1}: {STEPS[currentStepIndex]?.label}
          </CardTitle>
          <CardDescription>
            {STEPS[currentStepIndex]?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <FileUploader />
              {inputFile && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileCode className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{inputFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(inputFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Jobs */}
          {step === "select" && (
            <div className="space-y-4">
              <JobPreview />
            </div>
          )}

          {/* Step 3: Configure */}
          {step === "configure" && (
            <div className="space-y-6">
              {/* Airflow Version */}
              <div className="space-y-2">
                <Label>Airflow Version</Label>
                <Select
                  value={airflowVersion}
                  onValueChange={(v) => setAirflowVersion(v as AirflowVersion)}
                >
                  <SelectTrigger className="w-full">
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

              {/* DAG Grouping Strategy */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  DAG Grouping Strategy
                </Label>
                <Select
                  value={divideStrategy}
                  onValueChange={(v) => setDivideStrategy(v as DivideStrategy)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dividerStrategies.map((strategy) => (
                      <SelectItem key={strategy.value} value={strategy.value}>
                        <div className="flex flex-col">
                          <span>{strategy.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {strategy.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TaskFlow API Option */}
              {isAirflow3 && (
                <div className="flex items-center gap-2 p-4 border rounded-lg">
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
            </div>
          )}

          {/* Step 4: Review */}
          {step === "review" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Source File</p>
                  <p className="font-medium">{inputFile?.name || "N/A"}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Jobs Selected</p>
                  <p className="font-medium">{selectedJobs.length} jobs</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Airflow Version</p>
                  <p className="font-medium">Airflow {airflowVersion}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Grouping Strategy</p>
                  <p className="font-medium capitalize">{divideStrategy}</p>
                </div>
              </div>

              {isAirflow3 && useTaskFlowApi && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <Badge variant="secondary">TaskFlow API enabled</Badge>
                </div>
              )}

              <div className="p-4 border-2 border-dashed rounded-lg text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="font-medium">Ready to Convert</p>
                <p className="text-sm text-muted-foreground">
                  Click &quot;Convert&quot; to generate {selectedJobs.length} Airflow tasks
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Result */}
          {step === "result" && (
            <div className="space-y-4">
              <OutputViewer onShowReport={() => setShowReportDialog(true)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === "upload" || isProcessing}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {step !== "result" ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {step === "upload" ? "Parsing..." : "Converting..."}
              </>
            ) : (
              <>
                {step === "review" ? "Convert" : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setShowReportDialog(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Report
          </Button>
        )}
      </div>

      {/* Conversion Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Conversion Report
            </DialogTitle>
            <DialogDescription>
              Detailed analysis of the conversion process
            </DialogDescription>
          </DialogHeader>
          {conversionReport && (
            <ConversionReportView report={conversionReport} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
