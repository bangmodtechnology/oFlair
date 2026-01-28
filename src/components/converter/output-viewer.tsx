"use client";

import { useConverterStore } from "@/store/converter-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Copy,
  Check,
  FileCode,
  Package,
  FileText,
  ChevronDown,
  BarChart3,
  GitBranch,
  Code2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { downloadDag, downloadAllAsZip, copyToClipboard } from "@/lib/converter/export";
import { toast } from "sonner";
import { DependencyGraph } from "./dependency-graph";
import type { ValidationResult } from "@/lib/converter";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-[400px] bg-muted animate-pulse" /> }
);

interface OutputViewerProps {
  onShowReport?: () => void;
  validationResults?: Map<string, ValidationResult> | null;
}

export function OutputViewer({ onShowReport, validationResults }: OutputViewerProps) {
  const { generatedDags, conversionReport } = useConverterStore();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("dags");
  const [viewMode, setViewMode] = useState<"code" | "graph">("code");

  if (generatedDags.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Generated DAGs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileCode className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              No DAGs generated yet
            </p>
            <p className="text-xs text-muted-foreground">
              Select jobs and click Convert to generate Airflow DAGs
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCopy = async (content: string, index: number) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopiedIndex(index);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      toast.error("Failed to copy");
    }
  };

  const handleDownloadSingle = (dag: typeof generatedDags[0]) => {
    downloadDag(dag);
    toast.success(`Downloaded ${dag.filename}`);
  };

  const handleDownloadAllZip = async () => {
    setIsDownloading(true);
    try {
      await downloadAllAsZip(generatedDags, conversionReport || undefined, {
        includeReport: true,
        folderName: "airflow_dags",
      });
      toast.success("Downloaded ZIP archive");
    } catch (error) {
      toast.error("Failed to create ZIP");
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAllSeparate = () => {
    generatedDags.forEach((dag) => downloadDag(dag));
    toast.success(`Downloaded ${generatedDags.length} files`);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              Generated DAGs ({generatedDags.length})
            </CardTitle>
            {conversionReport && (
              <Badge variant="secondary" className="gap-1">
                {conversionReport.summary.conversionRate}% success
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onShowReport && conversionReport && (
              <Button variant="outline" size="sm" onClick={onShowReport}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Report
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={isDownloading}>
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloading ? "Downloading..." : "Download"}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadAllZip}>
                  <Package className="h-4 w-4 mr-2" />
                  Download as ZIP
                  <span className="ml-auto text-xs text-muted-foreground">
                    with README & requirements.txt
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadAllSeparate}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download all .py files
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {generatedDags.slice(0, 5).map((dag) => (
                  <DropdownMenuItem
                    key={dag.filename}
                    onClick={() => handleDownloadSingle(dag)}
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    {dag.filename}
                  </DropdownMenuItem>
                ))}
                {generatedDags.length > 5 && (
                  <DropdownMenuItem disabled>
                    ... and {generatedDags.length - 5} more
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          value={activeTab === "dags" ? generatedDags[0]?.filename : activeTab}
          onValueChange={(v) => setActiveTab(v)}
          className="h-full"
        >
          <div className="px-4 border-b">
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0 py-2">
              {generatedDags.map((dag) => (
                <TabsTrigger
                  key={dag.filename}
                  value={dag.filename}
                  className="data-[state=active]:bg-muted px-3 py-1.5 text-xs"
                >
                  {dag.filename}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {generatedDags.map((dag, index) => (
            <TabsContent
              key={dag.filename}
              value={dag.filename}
              className="m-0"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  <span className="text-sm font-medium">{dag.filename}</span>
                  <Badge variant="secondary" className="text-xs">
                    {dag.dag.tasks.length} tasks
                  </Badge>
                  {dag.dag.dependencies.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {dag.dag.dependencies.length} deps
                    </Badge>
                  )}
                  {/* Validation Status */}
                  {validationResults?.get(dag.filename) && (
                    <>
                      {validationResults.get(dag.filename)!.valid ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-600 gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationResults.get(dag.filename)!.errors.length} error(s)
                        </Badge>
                      )}
                      {validationResults.get(dag.filename)!.warnings.length > 0 && (
                        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {validationResults.get(dag.filename)!.warnings.length} warning(s)
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-md overflow-hidden">
                    <Button
                      variant={viewMode === "code" ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-none h-7 px-2"
                      onClick={() => setViewMode("code")}
                    >
                      <Code2 className="h-4 w-4 mr-1" />
                      Code
                    </Button>
                    <Button
                      variant={viewMode === "graph" ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-none h-7 px-2"
                      onClick={() => setViewMode("graph")}
                    >
                      <GitBranch className="h-4 w-4 mr-1" />
                      Graph
                    </Button>
                  </div>
                  {viewMode === "code" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(dag.content, index)}
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadSingle(dag)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="h-90">
                {viewMode === "code" ? (
                  <MonacoEditor
                    height="360px"
                    language="python"
                    value={dag.content}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                    }}
                    theme="vs-dark"
                  />
                ) : (
                  <DependencyGraph dag={dag.dag} />
                )}
              </div>
              {/* Validation Details */}
              {validationResults?.get(dag.filename) &&
               (validationResults.get(dag.filename)!.errors.length > 0 ||
                validationResults.get(dag.filename)!.warnings.length > 0) && (
                <div className="px-4 py-3 border-t bg-muted/20">
                  <p className="text-xs font-medium mb-2">Validation Issues:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {validationResults.get(dag.filename)!.errors.map((err, i) => (
                      <div key={`err-${i}`} className="flex items-start gap-2 text-xs">
                        <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                        <span className="text-red-600">
                          {err.message}
                          {err.line && <span className="text-muted-foreground"> (line {err.line})</span>}
                          {err.taskId && <span className="text-muted-foreground"> [{err.taskId}]</span>}
                        </span>
                      </div>
                    ))}
                    {validationResults.get(dag.filename)!.warnings.map((warn, i) => (
                      <div key={`warn-${i}`} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                        <span className="text-yellow-600">
                          {warn.message}
                          {warn.line && <span className="text-muted-foreground"> (line {warn.line})</span>}
                          {warn.taskId && <span className="text-muted-foreground"> [{warn.taskId}]</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
