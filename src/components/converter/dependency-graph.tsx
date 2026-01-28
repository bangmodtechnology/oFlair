"use client";

import { useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AirflowDAG, AirflowTask } from "@/types/airflow";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  Code2,
  Clock,
  Database,
  Cloud,
  Mail,
  Server,
  FileSearch,
  CircleDot,
  Zap,
  HardDrive,
  Cog,
  Workflow,
  Flame,
  FolderSync,
} from "lucide-react";

interface DependencyGraphProps {
  dag: AirflowDAG;
}

const operatorIcons: Record<string, React.ReactNode> = {
  BashOperator: <Terminal className="h-4 w-4" />,
  PythonOperator: <Code2 className="h-4 w-4" />,
  EmptyOperator: <CircleDot className="h-4 w-4" />,
  FileSensor: <FileSearch className="h-4 w-4" />,
  TimeSensor: <Clock className="h-4 w-4" />,
  DateTimeSensor: <Clock className="h-4 w-4" />,
  ExternalTaskSensor: <Clock className="h-4 w-4" />,
  SQLExecuteQueryOperator: <Database className="h-4 w-4" />,
  S3KeySensor: <Cloud className="h-4 w-4" />,
  GCSObjectExistenceSensor: <Cloud className="h-4 w-4" />,
  KubernetesPodOperator: <Server className="h-4 w-4" />,
  WasbBlobSensor: <Cloud className="h-4 w-4" />,
  SSHOperator: <Server className="h-4 w-4" />,
  EmailOperator: <Mail className="h-4 w-4" />,
  // AWS
  LambdaInvokeFunctionOperator: <Zap className="h-4 w-4" />,
  S3CopyObjectOperator: <Cloud className="h-4 w-4" />,
  GlueJobOperator: <Cog className="h-4 w-4" />,
  // SAP
  SapHanaOperator: <Database className="h-4 w-4" />,
  // Informatica
  InformaticaCloudRunTaskOperator: <Workflow className="h-4 w-4" />,
  // Spark/Databricks
  SparkSubmitOperator: <Flame className="h-4 w-4" />,
  DatabricksSubmitRunOperator: <HardDrive className="h-4 w-4" />,
  // SFTP
  SFTPOperator: <FolderSync className="h-4 w-4" />,
};

// Tailwind classes for node styling
const operatorColors: Record<string, string> = {
  BashOperator: "bg-orange-500",
  PythonOperator: "bg-blue-500",
  EmptyOperator: "bg-gray-400",
  FileSensor: "bg-purple-500",
  TimeSensor: "bg-pink-500",
  DateTimeSensor: "bg-pink-500",
  ExternalTaskSensor: "bg-indigo-500",
  SQLExecuteQueryOperator: "bg-green-500",
  S3KeySensor: "bg-yellow-500",
  GCSObjectExistenceSensor: "bg-cyan-500",
  KubernetesPodOperator: "bg-blue-600",
  WasbBlobSensor: "bg-sky-500",
  SSHOperator: "bg-slate-600",
  EmailOperator: "bg-red-500",
  // AWS
  LambdaInvokeFunctionOperator: "bg-amber-500",
  S3CopyObjectOperator: "bg-amber-600",
  GlueJobOperator: "bg-amber-700",
  // SAP
  SapHanaOperator: "bg-blue-800",
  // Informatica
  InformaticaCloudRunTaskOperator: "bg-rose-500",
  // Spark/Databricks
  SparkSubmitOperator: "bg-orange-600",
  DatabricksSubmitRunOperator: "bg-red-600",
  // SFTP
  SFTPOperator: "bg-teal-500",
};

// Hex colors for MiniMap
const operatorHexColors: Record<string, string> = {
  BashOperator: "#f97316",
  PythonOperator: "#3b82f6",
  EmptyOperator: "#9ca3af",
  FileSensor: "#a855f7",
  TimeSensor: "#ec4899",
  DateTimeSensor: "#ec4899",
  ExternalTaskSensor: "#6366f1",
  SQLExecuteQueryOperator: "#22c55e",
  S3KeySensor: "#eab308",
  GCSObjectExistenceSensor: "#06b6d4",
  KubernetesPodOperator: "#2563eb",
  WasbBlobSensor: "#0ea5e9",
  SSHOperator: "#475569",
  EmailOperator: "#ef4444",
  // AWS
  LambdaInvokeFunctionOperator: "#f59e0b",
  S3CopyObjectOperator: "#d97706",
  GlueJobOperator: "#b45309",
  // SAP
  SapHanaOperator: "#1e40af",
  // Informatica
  InformaticaCloudRunTaskOperator: "#f43f5e",
  // Spark/Databricks
  SparkSubmitOperator: "#ea580c",
  DatabricksSubmitRunOperator: "#dc2626",
  // SFTP
  SFTPOperator: "#14b8a6",
};

function TaskNode({ data }: NodeProps) {
  const task = data.task as AirflowTask;
  const colorClass = operatorColors[task.operatorType] || "bg-gray-500";
  const icon = operatorIcons[task.operatorType] || <CircleDot className="h-4 w-4" />;

  return (
    <div className="bg-card border rounded-lg shadow-md min-w-[180px] overflow-hidden">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !w-3 !h-3"
      />
      <div className={`${colorClass} text-white px-3 py-1.5 flex items-center gap-2`}>
        {icon}
        <span className="text-xs font-medium truncate">{task.operatorType}</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium truncate">{task.taskId}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate mt-1">
            {task.description}
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !w-3 !h-3"
      />
    </div>
  );
}

const nodeTypes = {
  task: TaskNode,
};

function layoutNodes(tasks: AirflowTask[], dependencies: AirflowDAG["dependencies"]): Node[] {
  const taskMap = new Map(tasks.map((t) => [t.taskId, t]));
  const upstreamCount = new Map<string, number>();
  const downstreamMap = new Map<string, string[]>();

  tasks.forEach((t) => {
    upstreamCount.set(t.taskId, 0);
    downstreamMap.set(t.taskId, []);
  });

  dependencies.forEach(({ upstream, downstream }) => {
    upstreamCount.set(downstream, (upstreamCount.get(downstream) || 0) + 1);
    const downs = downstreamMap.get(upstream) || [];
    downs.push(downstream);
    downstreamMap.set(upstream, downs);
  });

  const levels: string[][] = [];
  const assigned = new Set<string>();
  const remaining = new Set(tasks.map((t) => t.taskId));

  while (remaining.size > 0) {
    const level: string[] = [];
    remaining.forEach((taskId) => {
      const count = upstreamCount.get(taskId) || 0;
      if (count === 0) {
        level.push(taskId);
      }
    });

    if (level.length === 0) {
      remaining.forEach((taskId) => level.push(taskId));
    }

    level.forEach((taskId) => {
      remaining.delete(taskId);
      assigned.add(taskId);
      (downstreamMap.get(taskId) || []).forEach((down) => {
        upstreamCount.set(down, (upstreamCount.get(down) || 0) - 1);
      });
    });

    levels.push(level);
  }

  const nodes: Node[] = [];
  const nodeWidth = 200;
  const nodeHeight = 80;
  const horizontalGap = 50;
  const verticalGap = 100;

  levels.forEach((level, levelIndex) => {
    const levelWidth = level.length * nodeWidth + (level.length - 1) * horizontalGap;
    const startX = -levelWidth / 2;

    level.forEach((taskId, index) => {
      const task = taskMap.get(taskId);
      if (task) {
        nodes.push({
          id: taskId,
          type: "task",
          position: {
            x: startX + index * (nodeWidth + horizontalGap),
            y: levelIndex * (nodeHeight + verticalGap),
          },
          data: { task },
        });
      }
    });
  });

  return nodes;
}

export function DependencyGraph({ dag }: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Update nodes and edges when dag changes
  useEffect(() => {
    const newNodes = layoutNodes(dag.tasks, dag.dependencies);
    const newEdges: Edge[] = dag.dependencies.map((dep, index) => ({
      id: `e${index}-${dep.upstream}-${dep.downstream}`,
      source: dep.upstream,
      target: dep.downstream,
      type: "smoothstep",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: {
        strokeWidth: 2,
        stroke: "#6366f1",
      },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [dag.tasks, dag.dependencies, setNodes, setEdges]);

  const operatorStats = useMemo(() => {
    const stats = new Map<string, number>();
    dag.tasks.forEach((task) => {
      stats.set(task.operatorType, (stats.get(task.operatorType) || 0) + 1);
    });
    return Array.from(stats.entries()).sort((a, b) => b[1] - a[1]);
  }, [dag.tasks]);

  return (
    <div style={{ height: "360px", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
      >
        <Background gap={16} size={1} />
        <Controls position="bottom-right" />
        <MiniMap
          nodeColor={(node) => {
            const task = node.data?.task as AirflowTask;
            if (!task) return "#888888";
            return operatorHexColors[task.operatorType] || "#888888";
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-left"
        />
        <Panel position="top-left" className="bg-card/90 backdrop-blur border rounded-lg p-3 shadow-lg">
          <div className="space-y-2">
            <div className="text-sm font-medium">{dag.dagId}</div>
            <div className="flex flex-wrap gap-1">
              {operatorStats.slice(0, 4).map(([op, count]) => (
                <Badge key={op} variant="secondary" className="text-xs gap-1">
                  {operatorIcons[op] || <CircleDot className="h-3 w-3" />}
                  {count}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {dag.tasks.length} tasks · {dag.dependencies.length} dependencies
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
