"use client";

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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  FileCode,
  GitBranch,
  Clock,
  Layers,
} from "lucide-react";
import type { ConversionReport } from "@/lib/converter/report";

interface ConversionReportViewProps {
  report: ConversionReport;
}

export function ConversionReportView({ report }: ConversionReportViewProps) {
  const { summary, jobTypes, operators, warnings, manualReviewRequired, dependencyStats } = report;

  const getWarningIcon = (severity: "info" | "warning" | "error") => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getWarningBadge = (severity: "info" | "warning" | "error") => {
    switch (severity) {
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.conversionRate}%</div>
            <Progress value={summary.conversionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {summary.convertedJobs} of {summary.totalJobs} jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DAGs Generated</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalDags}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalTasks} tasks total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dependencies</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalDependencies}</div>
            <p className="text-xs text-muted-foreground">
              {dependencyStats.externalDependencies} cross-DAG
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warnings.length}</div>
            <p className="text-xs text-muted-foreground">
              {manualReviewRequired.length} need review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed sections */}
      <Accordion type="multiple" defaultValue={["operators", "warnings"]}>
        {/* Job Types */}
        <AccordionItem value="jobtypes">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Job Types ({jobTypes.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Airflow Operator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobTypes.map((jt) => (
                  <TableRow key={jt.type}>
                    <TableCell className="font-medium">{jt.type}</TableCell>
                    <TableCell>{jt.count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={jt.percentage} className="w-20" />
                        <span className="text-sm">{jt.percentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{jt.operator}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        {/* Operators */}
        <AccordionItem value="operators">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Operators Used ({operators.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2">
              {operators.map((op) => (
                <Badge key={op.name} variant="secondary" className="text-sm">
                  {op.name} ({op.count})
                </Badge>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Warnings */}
        {warnings.length > 0 && (
          <AccordionItem value="warnings">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Warnings ({warnings.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {warnings.slice(0, 20).map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    {getWarningIcon(w.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{w.jobName}</span>
                        <Badge variant="outline" className="text-xs">
                          {w.field}
                        </Badge>
                        {getWarningBadge(w.severity)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {w.message}
                      </p>
                      {w.suggestion && (
                        <p className="text-sm text-blue-600 mt-1">
                          Suggestion: {w.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {warnings.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    ... and {warnings.length - 20} more warnings
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Manual Review */}
        {manualReviewRequired.length > 0 && (
          <AccordionItem value="review">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Manual Review Required ({manualReviewRequired.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Original Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manualReviewRequired.slice(0, 10).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.jobName}</TableCell>
                      <TableCell>{item.reason}</TableCell>
                      <TableCell>
                        {item.field && (
                          <Badge variant="outline">{item.field}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.originalValue}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Dependency Stats */}
        <AccordionItem value="dependencies">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Dependency Analysis
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Total Conditions</p>
                <p className="text-2xl font-bold">{dependencyStats.totalConditions}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Internal Dependencies</p>
                <p className="text-2xl font-bold">{dependencyStats.internalDependencies}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Cross-DAG Dependencies</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {dependencyStats.externalDependencies}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Circular Dependencies</p>
                <p className={`text-2xl font-bold ${dependencyStats.circularDependencies > 0 ? "text-destructive" : "text-green-600"}`}>
                  {dependencyStats.circularDependencies}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
