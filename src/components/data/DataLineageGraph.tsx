import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Handle,
  MarkerType,
  Position,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import type { DataLineageEdge, DataLineageNodeMeta } from "../../pages/data/lineageConfig";
import { SourceDetailsPanel } from "./SourceDetailsPanel";

type LineageNodeData = {
  label: string;
  lane: DataLineageNodeMeta["lane"];
  pipeline: DataLineageNodeMeta["pipeline"];
  status: DataLineageNodeMeta["status"];
  category: DataLineageNodeMeta["category"];
  kind: DataLineageNodeMeta["kind"];
  cadence?: string;
  coverage?: string;
  access?: string;
};

type Props = {
  nodes: DataLineageNodeMeta[];
  edges: DataLineageEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  showPipelineLabels?: boolean;
  viewMode?: "high-level" | "full-feature";
};

const NODE_WIDTH = 212;
const NODE_HEIGHT = 68;
const INPUT_X = 24;
const OUTPUT_X = 1560;
const INPUT_HEADER_X = "8%";
const PROCESSING_HEADER_X = "50%";
const OUTPUT_HEADER_X = "92%";
const INPUT_TO_PROCESSING_ARROW_X = "29%";
const PROCESSING_TO_OUTPUT_ARROW_X = "71%";

type PipelineLabel = {
  id: "sightings" | "water" | "bathymetry" | "ocean_state" | "prey_availability" | "disturbance";
  title: string;
  x: number;
  y: number;
  height: number;
};

type PipelineLabelData = {
  title: string;
};

function buildLayout(
  nodes: DataLineageNodeMeta[],
  edges: DataLineageEdge[],
  showPipelineLabels: boolean
): { rfNodes: Node<LineageNodeData | PipelineLabelData>[] } {
  const pipelineOrder: Array<
    "sightings" | "water" | "bathymetry" | "ocean_state" | "prey_availability" | "disturbance"
  > = ["sightings", "water", "bathymetry", "ocean_state", "prey_availability", "disturbance"];

  const pipelineTitles: Record<(typeof pipelineOrder)[number], string> = {
    sightings: "Sightings",
    water: "Water Extent",
    bathymetry: "Depth",
    ocean_state: "Ocean State",
    prey_availability: "Prey Availability",
    disturbance: "Human",
  };

  const inputGap = 20;
  const pipelineGap = 34;
  const nodeX = new Map<string, number>();
  const nodeY = new Map<string, number>();
  const pipelineBounds = new Map<string, { top: number; bottom: number }>();

  let cursorY = 130;

  pipelineOrder.forEach((pipeline) => {
    const inputNodes = nodes.filter((node) => node.pipeline === pipeline && node.lane === "inputs");
    const processingNodes = nodes.filter((node) => node.pipeline === pipeline && node.lane === "processing");

    if (inputNodes.length === 0 && processingNodes.length === 0) {
      return;
    }

    const inputHeight =
      inputNodes.length > 0 ? inputNodes.length * NODE_HEIGHT + (inputNodes.length - 1) * inputGap : NODE_HEIGHT;
    const blockHeight = Math.max(inputHeight, NODE_HEIGHT);
    const blockTop = cursorY;
    const blockCenterY = blockTop + blockHeight / 2;
    const inputStartY = blockTop + (blockHeight - inputHeight) / 2;

    inputNodes.forEach((node, index) => {
      nodeX.set(node.id, INPUT_X);
      nodeY.set(node.id, Math.round(inputStartY + index * (NODE_HEIGHT + inputGap)));
    });

    if (pipeline === "disturbance" && processingNodes.length === 2) {
      const sharedX = 620;
      const topY = Math.round(blockCenterY - NODE_HEIGHT - 12);
      const bottomY = Math.round(blockCenterY + 12);
      processingNodes.forEach((node, index) => {
        nodeX.set(node.id, sharedX);
        nodeY.set(node.id, index === 0 ? topY : bottomY);
      });
    } else {
      const processXs =
        processingNodes.length === 1
          ? [560]
          : processingNodes.length === 2
            ? [420, 760]
            : [330, 620, 860];

      processingNodes.forEach((node, index) => {
        nodeX.set(node.id, processXs[Math.min(index, processXs.length - 1)] ?? 560);
        nodeY.set(node.id, Math.round(blockCenterY - NODE_HEIGHT / 2));
      });
    }

    const inputTop = inputNodes.length > 0 ? inputStartY : blockCenterY - NODE_HEIGHT / 2;
    const inputBottom =
      inputNodes.length > 0
        ? inputStartY + inputHeight
        : blockCenterY + NODE_HEIGHT / 2;

    pipelineBounds.set(pipeline, {
      top: Math.round(inputTop),
      bottom: Math.round(inputBottom),
    });

    cursorY += blockHeight + pipelineGap;
  });

  const dataProcessingInputs = edges
    .filter((edge) => edge.target === "data_processing")
    .map((edge) => nodeY.get(edge.source))
    .filter((value): value is number => typeof value === "number");

  if (nodes.some((node) => node.id === "data_processing")) {
    const dataProcessingY =
      dataProcessingInputs.length > 0
        ? Math.round(
            dataProcessingInputs.reduce((sum, value) => sum + value, 0) /
              dataProcessingInputs.length
          )
        : 260;
    nodeX.set("data_processing", 540);
    nodeY.set("data_processing", dataProcessingY);
  }

  const aggregationY = nodeY.get("aggregation_weekly") ?? 240;
  const featureSourceYs = edges
    .filter((edge) => edge.target === "feature_engineering")
    .map((edge) => nodeY.get(edge.source) ?? aggregationY);
  const featureY =
    featureSourceYs.length > 0
      ? Math.round(featureSourceYs.reduce((sum, value) => sum + value, 0) / featureSourceYs.length)
      : aggregationY;

  const hasHighLevelDataProcessing = nodes.some((node) => node.id === "data_processing");
  const featureX = 840;
  const processingStepX = 300;
  const modelInferenceX = hasHighLevelDataProcessing ? featureX + processingStepX : 1080;

  nodeX.set("feature_engineering", featureX);
  nodeY.set("feature_engineering", featureY);
  nodeX.set("model_inference", modelInferenceX);
  nodeY.set("model_inference", featureY);
  nodeX.set("calibration", 1320);
  nodeY.set("calibration", featureY);

  const forecastSourceYs = edges
    .filter((edge) => edge.target === "forecast_layers")
    .map((edge) => nodeY.get(edge.source) ?? featureY);
  const forecastY =
    forecastSourceYs.length > 0
      ? Math.round(forecastSourceYs.reduce((sum, value) => sum + value, 0) / forecastSourceYs.length)
      : featureY;

  nodeX.set("observed_layers", OUTPUT_X);
  nodeY.set("observed_layers", aggregationY);
  nodeX.set("forecast_layers", OUTPUT_X);
  nodeY.set("forecast_layers", forecastY);

  const rfNodes = nodes.map((node) => {
    const y = nodeY.get(node.id) ?? 60;
    const x =
      nodeX.get(node.id) ??
      (node.lane === "inputs" ? INPUT_X : node.lane === "outputs" ? OUTPUT_X : 420);

    return {
      id: node.id,
      type: "lineageNode",
      data: {
        label: node.label,
        lane: node.lane,
        pipeline: node.pipeline,
        status: node.status,
        category: node.category,
        kind: node.kind,
        cadence: node.cadence,
        coverage: node.coverage,
        access: node.access,
      },
      draggable: false,
      selectable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: {
        x,
        y,
      },
      style: {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
    };
  });

  const containerPad = 10;
  const labelNodes: Node<PipelineLabelData>[] = showPipelineLabels
    ? (pipelineOrder
        .map((pipeline) => {
          const bounds = pipelineBounds.get(pipeline);
          if (!bounds) {
            return null;
          }

          const label: PipelineLabel = {
            id: pipeline,
            title: pipelineTitles[pipeline],
            x: -50,
            y: bounds.top - containerPad,
            height: bounds.bottom - bounds.top + containerPad * 2,
          };

          return {
            id: `pipeline-${label.id}`,
            type: "pipelineLabel",
            data: { title: label.title },
            position: { x: label.x, y: label.y },
            draggable: false,
            selectable: false,
            focusable: false,
            className: "dataLineageGraph__pipelineNode",
            style: { width: 44, height: label.height },
          } as Node<PipelineLabelData>;
        })
        .filter((item): item is Node<PipelineLabelData> => item !== null))
    : [];

  return { rfNodes: [...rfNodes, ...labelNodes] };
}

function getConnectivity(
  selectedNodeId: string | null,
  edges: DataLineageEdge[]
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  if (!selectedNodeId) {
    return { nodeIds: new Set<string>(), edgeIds: new Set<string>() };
  }

  const incoming = new Map<string, DataLineageEdge[]>();

  edges.forEach((edge) => {
    const inList = incoming.get(edge.target) ?? [];
    inList.push(edge);
    incoming.set(edge.target, inList);
  });

  const visitedNodes = new Set<string>([selectedNodeId]);
  const visitedEdges = new Set<string>();
  const queue: string[] = [selectedNodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    // Upstream lineage only: include nodes/edges that feed into selected node.
    const nextIncoming = incoming.get(current) ?? [];
    nextIncoming.forEach((edge) => {
      visitedEdges.add(edge.id);
      if (!visitedNodes.has(edge.source)) {
        visitedNodes.add(edge.source);
        queue.push(edge.source);
      }
    });
  }

  return { nodeIds: visitedNodes, edgeIds: visitedEdges };
}

const LineageNodeCard = memo(function LineageNodeCard({ data, selected }: NodeProps<LineageNodeData>) {
  const tooltip = [
    data.cadence ? { key: "Cadence", value: data.cadence } : null,
    data.coverage ? { key: "Coverage", value: data.coverage } : null,
    data.access ? { key: "Access", value: data.access } : null,
  ].filter(Boolean) as Array<{ key: string; value: string }>;

  const icon = data.kind === "provider" ? "database" : data.kind === "processing" ? "tune" : "layers";

  const classes = [
    "dataLineageNode",
    `dataLineageNode--${data.category}`,
    data.status === "planned" ? "dataLineageNode--planned" : "",
    data.lane === "inputs" && data.status === "included" ? "dataLineageNode--inputIncluded" : "",
    data.lane === "inputs" && data.status === "planned" ? "dataLineageNode--inputPlanned" : "",
    selected ? "dataLineageNode--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <Handle type="target" position={Position.Left} className="dataLineageNode__handle" />
      <div className="dataLineageNode__kind">
        <span className="material-symbols-rounded dataLineageNode__icon" aria-hidden="true">
          {icon}
        </span>
        <span>{data.kind}</span>
      </div>
      <div className="dataLineageNode__label">{data.label}</div>
      {tooltip.length > 0 && (
        <div className="dataLineageNode__tooltip" role="tooltip">
          {tooltip.map((item) => (
            <span key={item.key} className="dataLineageNode__tooltipChip">
              <strong>{item.key}:</strong> {item.value}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="dataLineageNode__handle" />
    </div>
  );
});

const PipelineLabelNode = memo(function PipelineLabelNode({ data }: NodeProps<PipelineLabelData>) {
  return <div className="dataLineageGraph__pipelineLabelNode">{data.title}</div>;
});

const nodeTypes: NodeTypes = {
  lineageNode: LineageNodeCard,
  pipelineLabel: PipelineLabelNode,
};

export function DataLineageGraph({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  showPipelineLabels = true,
  viewMode = "full-feature",
}: Props) {
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { rfNodes: baseNodes } = useMemo(
    () => buildLayout(nodes, edges, showPipelineLabels),
    [nodes, edges, showPipelineLabels]
  );
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const connectivity = useMemo(
    () => getConnectivity(selectedNodeId, edges),
    [selectedNodeId, edges]
  );

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as globalThis.Node | null;
      if (target && popupRef.current?.contains(target)) {
        return;
      }
      onSelectNode(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onSelectNode, selectedNodeId]);

  const rfNodes = useMemo(() => {
    return baseNodes.map((node) => {
      if (node.type === "pipelineLabel") {
        return node;
      }

      const isSelected = selectedNodeId === node.id;
      const hasSelection = selectedNodeId !== null;
      const isConnected = connectivity.nodeIds.has(node.id);

      return {
        ...node,
        selected: isSelected,
        className: [
          "dataLineageGraph__node",
          hasSelection && !isConnected ? "dataLineageGraph__node--dim" : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
  }, [baseNodes, connectivity.nodeIds, selectedNodeId]);

  const rfEdges: Edge[] = useMemo(() => {
    const hasSelection = selectedNodeId !== null;

    return edges.map((edge) => {
      const active = connectivity.edgeIds.has(edge.id);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: active,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
        },
        className: [
          "dataLineageGraph__edge",
          active ? "dataLineageGraph__edge--active" : "",
          hasSelection && !active ? "dataLineageGraph__edge--dim" : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
  }, [connectivity.edgeIds, edges, selectedNodeId]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  const fitGraph = useCallback(() => {
    if (!flowRef.current) {
      return;
    }

    const doFit = () =>
      flowRef.current?.fitView({
        padding: viewMode === "high-level" ? 0.2 : 0.1,
        minZoom: 0.02,
        maxZoom: 1.2,
        duration: 260,
      });

    window.requestAnimationFrame(doFit);
    window.setTimeout(doFit, 280);
  }, [viewMode]);

  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      flowRef.current = instance;
      fitGraph();
    },
    [fitGraph]
  );

  useEffect(() => {
    fitGraph();
  }, [fitGraph, rfNodes.length, rfEdges.length, viewMode]);

  useEffect(() => {
    const onResize = () => fitGraph();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitGraph]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === canvasRef.current;
      setIsFullscreen(active);
      fitGraph();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [fitGraph]);

  const toggleFullscreen = useCallback(async () => {
    const el = canvasRef.current;
    if (!el) {
      return;
    }

    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // no-op: browser may block fullscreen without user gesture or support
    }
  }, []);

  return (
    <div className="dataLineageGraph">
      <div className="dataLineageGraph__laneHeaders" aria-hidden="true">
        <span style={{ left: INPUT_HEADER_X }}>Inputs</span>
        <span style={{ left: PROCESSING_HEADER_X }}>Processing</span>
        <span style={{ left: OUTPUT_HEADER_X }}>Outputs</span>
        <span className="dataLineageGraph__laneArrow" style={{ left: INPUT_TO_PROCESSING_ARROW_X }}>
          →
        </span>
        <span className="dataLineageGraph__laneArrow" style={{ left: PROCESSING_TO_OUTPUT_ARROW_X }}>
          →
        </span>
      </div>
      <div className="dataLineageGraph__legend" aria-label="Input status legend">
        <span className="dataLineageGraph__legendItem">
          <i className="dataLineageGraph__legendSwatch dataLineageGraph__legendSwatch--included" />
          Included
        </span>
        <span className="dataLineageGraph__legendItem">
          <i className="dataLineageGraph__legendSwatch dataLineageGraph__legendSwatch--planned" />
          Planned
        </span>
      </div>
      <div
        className={`dataLineageGraph__canvas dataLineageGraph__canvas--${viewMode}`}
        role="img"
        aria-label="Data lineage graph"
        ref={canvasRef}
      >
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1, minZoom: 0.02, maxZoom: 1.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag
          zoomOnScroll
          minZoom={0.02}
          maxZoom={1.4}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onInit={handleInit}
          proOptions={{ hideAttribution: true }}
        />
        <div className="dataLineageGraph__actions">
          <button
            type="button"
            className="dataLineageGraph__actionButton"
            onClick={fitGraph}
            aria-label="Recenter graph"
            title="Recenter graph"
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              center_focus_strong
            </span>
          </button>
          <button
            type="button"
            className="dataLineageGraph__actionButton"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>
        </div>
        {selectedNode && (
          <div
            className="dataLineageGraph__popup"
            ref={popupRef}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <SourceDetailsPanel
              selectedNode={selectedNode}
              showEmptyState={false}
              className="sourceDetails--popup"
              onClose={() => onSelectNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
