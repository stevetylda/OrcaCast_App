declare module "dagre" {
  const dagre: {
    graphlib: {
      Graph: new () => {
        setDefaultEdgeLabel: (fn: () => unknown) => void;
        setGraph: (graph: Record<string, unknown>) => void;
        setNode: (id: string, node: Record<string, unknown>) => void;
        setEdge: (source: string, target: string) => void;
        node: (id: string) => { x: number; y: number };
      };
    };
    layout: (graph: unknown) => void;
  };

  export default dagre;
}
