"use client";

import { useConverterStore } from "@/store/converter-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Copy, Check, FileCode } from "lucide-react";
import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import for Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-[400px] bg-muted animate-pulse" /> }
);

export function OutputViewer() {
  const { generatedDags } = useConverterStore();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  const copyToClipboard = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    generatedDags.forEach((dag) => {
      downloadFile(dag.content, dag.filename);
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Generated DAGs ({generatedDags.length})
          </CardTitle>
          <Button size="sm" onClick={downloadAll}>
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue={generatedDags[0]?.filename} className="h-full">
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
              className="m-0 h-[400px]"
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    <span className="text-sm font-medium">{dag.filename}</span>
                    <Badge variant="secondary" className="text-xs">
                      {dag.dag.tasks.length} tasks
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(dag.content, index)}
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
                      onClick={() => downloadFile(dag.content, dag.filename)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1">
                  <MonacoEditor
                    height="100%"
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
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
