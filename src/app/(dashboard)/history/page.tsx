"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History,
  Trash2,
  Eye,
  FileJson,
  FileCode,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Code2,
  Copy,
  Package,
} from "lucide-react";
import { type ConversionHistoryItem } from "@/lib/storage/config-storage";
import { useStorage } from "@/hooks/use-storage";
import { toast } from "sonner";
import JSZip from "jszip";

export default function HistoryPage() {
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ConversionHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [codeViewItem, setCodeViewItem] = useState<ConversionHistoryItem | null>(null);
  const [selectedDagIndex, setSelectedDagIndex] = useState(0);
  const storage = useStorage();

  useEffect(() => {
    (async () => {
      const loaded = await storage.getHistory();
      setHistory(loaded); // API returns newest first
      setIsLoading(false);
    })();
  }, [storage]);

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear all conversion history?")) {
      await storage.clearHistory();
      setHistory([]);
      toast.success("Conversion history cleared");
    }
  };

  const handleDownloadDag = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const handleDownloadAllDags = async (item: ConversionHistoryItem) => {
    if (!item.generatedDags || item.generatedDags.length === 0) {
      toast.error("No DAG files available for download");
      return;
    }

    if (item.generatedDags.length === 1) {
      handleDownloadDag(item.generatedDags[0].filename, item.generatedDags[0].content);
      return;
    }

    // Create ZIP for multiple files
    const zip = new JSZip();
    const folder = zip.folder("dags");

    for (const dag of item.generatedDags) {
      folder?.file(dag.filename, dag.content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dags_${item.id}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${item.generatedDags.length} DAG files as ZIP`);
  };

  const handleCopyCode = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Code copied to clipboard");
  };

  const getStatusIcon = (status: ConversionHistoryItem["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ConversionHistoryItem["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Success</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversion History</h1>
          <p className="text-muted-foreground">
            View past conversions, download DAGs, and review results
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" onClick={handleClearHistory}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h) => h.status === "success").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs Converted</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.reduce((sum, h) => sum + h.jobsConverted.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Source Files</CardTitle>
            <FileJson className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(history.map((h) => h.sourceFile)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversions</CardTitle>
          <CardDescription>
            View details, code, or download generated DAG files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No conversion history yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Convert some Control-M jobs to see them here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Source File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>DAGs</TableHead>
                  <TableHead>Airflow</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {getStatusBadge(item.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">
                      {item.sourceFile}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">
                        {item.sourceType}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.jobsConverted.length}</TableCell>
                    <TableCell>
                      {item.generatedDags?.length || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{item.airflowVersion}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(item.timestamp)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedItem(item)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Conversion Details</DialogTitle>
                              <DialogDescription>
                                {item.sourceFile} - {formatDate(item.timestamp)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm font-medium">Status</p>
                                  <div className="mt-1">{getStatusBadge(item.status)}</div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Source Type</p>
                                  <Badge variant="outline" className="mt-1 uppercase">
                                    {item.sourceType}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Airflow Version</p>
                                  <Badge variant="secondary" className="mt-1">
                                    {item.airflowVersion}
                                  </Badge>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm font-medium mb-2">
                                  Converted Jobs ({item.jobsConverted.length})
                                </p>
                                <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Job Name</TableHead>
                                        <TableHead>DAG ID</TableHead>
                                        <TableHead>Operator</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.jobsConverted.map((job, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="font-mono text-sm">
                                            {job.jobName}
                                          </TableCell>
                                          <TableCell className="font-mono text-sm">
                                            {job.dagId}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="outline">{job.operator}</Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* View Code */}
                        {item.generatedDags && item.generatedDags.length > 0 && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCodeViewItem(item);
                                  setSelectedDagIndex(0);
                                }}
                                title="View Code"
                              >
                                <Code2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Code2 className="h-5 w-5" />
                                  Generated DAG Code
                                </DialogTitle>
                                <DialogDescription>
                                  {item.sourceFile} - {item.generatedDags.length} DAG file(s)
                                </DialogDescription>
                              </DialogHeader>

                              {item.generatedDags.length === 1 ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium font-mono">
                                      {item.generatedDags[0].filename}
                                    </span>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyCode(item.generatedDags![0].content)}
                                      >
                                        <Copy className="h-4 w-4 mr-1" />
                                        Copy
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadDag(
                                          item.generatedDags![0].filename,
                                          item.generatedDags![0].content
                                        )}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                  <ScrollArea className="h-[500px] border rounded-lg">
                                    <pre className="p-4 text-sm font-mono whitespace-pre overflow-x-auto bg-muted/50">
                                      {item.generatedDags[0].content}
                                    </pre>
                                  </ScrollArea>
                                </div>
                              ) : (
                                <Tabs defaultValue="0" className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <TabsList>
                                      {item.generatedDags.map((dag, idx) => (
                                        <TabsTrigger key={idx} value={String(idx)} className="font-mono text-xs">
                                          {dag.dagId}
                                        </TabsTrigger>
                                      ))}
                                    </TabsList>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadAllDags(item)}
                                    >
                                      <Package className="h-4 w-4 mr-1" />
                                      Download All (ZIP)
                                    </Button>
                                  </div>
                                  {item.generatedDags.map((dag, idx) => (
                                    <TabsContent key={idx} value={String(idx)} className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium font-mono">
                                          {dag.filename}
                                        </span>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyCode(dag.content)}
                                          >
                                            <Copy className="h-4 w-4 mr-1" />
                                            Copy
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownloadDag(dag.filename, dag.content)}
                                          >
                                            <Download className="h-4 w-4 mr-1" />
                                            Download
                                          </Button>
                                        </div>
                                      </div>
                                      <ScrollArea className="h-[450px] border rounded-lg">
                                        <pre className="p-4 text-sm font-mono whitespace-pre overflow-x-auto bg-muted/50">
                                          {dag.content}
                                        </pre>
                                      </ScrollArea>
                                    </TabsContent>
                                  ))}
                                </Tabs>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* Download Button */}
                        {item.generatedDags && item.generatedDags.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadAllDags(item)}
                            title={item.generatedDags.length > 1 ? "Download All (ZIP)" : "Download DAG"}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}

                        {/* No DAGs indicator */}
                        {(!item.generatedDags || item.generatedDags.length === 0) && (
                          <span className="text-xs text-muted-foreground px-2">
                            No DAGs
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
