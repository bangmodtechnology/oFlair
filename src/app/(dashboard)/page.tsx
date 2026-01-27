import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRightLeft,
  FileCode,
  Clock,
  CheckCircle,
  Upload,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Convert Control-M job definitions to Apache Airflow DAGs
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-dashed hover:border-primary transition-colors">
          <Link href="/convert">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                New Conversion
              </CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Start</div>
              <p className="text-xs text-muted-foreground">
                Upload Control-M XML or JSON file
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversions
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Jobs converted to DAGs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Templates
            </CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Mapping templates ready
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Start
            </CardTitle>
            <CardDescription>
              Get started with converting your Control-M jobs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Upload Control-M File</p>
                <p className="text-sm text-muted-foreground">
                  Support XML and JSON export formats
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Select Template</p>
                <p className="text-sm text-muted-foreground">
                  Choose or customize mapping templates
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Generate DAGs</p>
                <p className="text-sm text-muted-foreground">
                  Download ready-to-use Airflow DAG files
                </p>
              </div>
            </div>
            <Button asChild className="w-full mt-4">
              <Link href="/convert">
                Start Converting
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your latest conversions and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
              <p className="text-xs text-muted-foreground">
                Start by converting your first Control-M file
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supported Job Types */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Control-M Job Types</CardTitle>
          <CardDescription>
            Job types that can be converted to Airflow operators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: "Command", operator: "BashOperator" },
              { name: "Script", operator: "BashOperator" },
              { name: "File Watcher", operator: "FileSensor" },
              { name: "Database", operator: "SQLOperator" },
              { name: "Web Services", operator: "HttpOperator" },
              { name: "SAP", operator: "SAPOperator" },
            ].map((type) => (
              <div
                key={type.name}
                className="flex flex-col items-center p-4 rounded-lg border bg-muted/50"
              >
                <span className="font-medium text-sm">{type.name}</span>
                <span className="text-xs text-muted-foreground">
                  {type.operator}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
