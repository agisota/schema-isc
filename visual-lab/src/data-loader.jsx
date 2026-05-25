/* ============================================================
   data-loader.jsx — Real ISC data adapter
   Loads stage1..5.json + cross-stage-edges.json + npa-catalog.json,
   normalizes into a single model, validates, exposes globals + counts.
   ============================================================ */

const STAGE_FILES = [
  { id: "stage1", file: "data/stage1.json", num: 1 },
  { id: "stage2", file: "data/stage2.json", num: 2 },
  { id: "stage3", file: "data/stage3.json", num: 3 },
  { id: "stage4", file: "data/stage4.json", num: 4 },
  { id: "stage5", file: "data/stage5.json", num: 5 },
];

/* Stage durations from review.html / public spec.
   These are the cumulative endpoints used in the original timeline:
   0 → 292 → 400 → 765 → 1234 → 1250 */
const STAGE_DURATIONS_DAYS = {
  stage1: 292,
  stage2: 108,
  stage3: 365,
  stage4: 469,
  stage5: 16,
};

const TRACK_LABELS = {
  offbudget: "Внебюджетный",
  budget: "Бюджетный",
  okn: "ОКН",
};

const NODE_TYPE_LABELS = {
  process: "Процесс",
  result: "Результат",
  auxiliary: "Вспомогательный",
  alternative: "Альтернатива",
};

async function loadModel() {
  const t0 = performance.now();
  const validation = {
    errors: [],
    warnings: [],
    counts: { stages: 0, nodes: 0, edges: 0, crossEdges: 0, npa: 0, danglingEdges: 0 },
    okBefore: true,
  };

  // Parallel fetch
  let stagesRaw, crossEdgesRaw, npaRaw;
  try {
    const fetched = await Promise.all([
      ...STAGE_FILES.map(s => fetch(s.file).then(r => r.json())),
      fetch("data/cross-stage-edges.json").then(r => r.json()),
      fetch("data/npa-catalog.json").then(r => r.json()),
    ]);
    stagesRaw = fetched.slice(0, 5);
    crossEdgesRaw = fetched[5];
    npaRaw = fetched[6];
  } catch (e) {
    validation.errors.push({ kind: "fetch", message: e.message });
    return { model: null, validation };
  }

  // Normalize stages
  const stages = stagesRaw.map((s, i) => ({
    id: s.id,
    num: STAGE_FILES[i].num,
    name: s.name,
    short: ["Права", "ИРД", "Изыскания и АСП", "Стройка и ввод", "Кадастр"][i],
    sections: s.sections || [{ id: "main", label: "" }],
    durationDays: STAGE_DURATIONS_DAYS[s.id] || 0,
  }));

  // Collect all nodes with stage reference
  const nodes = [];
  const nodeIdSet = new Set();
  stagesRaw.forEach((s, i) => {
    (s.nodes || []).forEach(n => {
      // Skip nodes that are duplicate IDs in same stage
      if (nodeIdSet.has(n.id)) {
        validation.warnings.push({ kind: "duplicate_node_id", id: n.id, stage: s.id });
        return;
      }
      nodeIdSet.add(n.id);
      nodes.push({
        id: n.id,
        stageId: s.id,
        stageNum: i + 1,
        type: n.type || "process",
        label: n.label,
        process: n.process || "",
        track: n.track || "offbudget",
        section: n.section || "main",
        row: n.row ?? 0,
        col: n.col ?? 0,
        colSpan: n.data?.colSpan ?? n.colSpan ?? 1,
        rowSpan: n.data?.rowSpan ?? 1,
        wide: !!n.data?.wide,
        tall: !!n.data?.tall,
        labelCol: !!n.data?.labelCol,
        sidebar: !!n.sidebar,
        description: n.data?.description || "",
        duration: n.data?.duration || "",
        coverage: n.layers?.coverage || "full",
        rawData: n.data || {},
      });
    });
  });

  // Collect all edges with type
  const edges = [];
  stagesRaw.forEach((s, i) => {
    (s.edges || []).forEach(e => {
      const sourceExists = nodeIdSet.has(e.source);
      const targetExists = nodeIdSet.has(e.target);
      if (!sourceExists || !targetExists) {
        validation.warnings.push({
          kind: "dangling_edge",
          edge: e.id,
          source: e.source,
          target: e.target,
          missing: !sourceExists ? "source" : "target",
        });
        validation.counts.danglingEdges++;
        return;
      }
      edges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type || "default",
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        stageId: s.id,
        crossStage: false,
      });
    });
  });

  // Cross-stage edges
  const crossEdges = [];
  (crossEdgesRaw || []).forEach(e => {
    const sourceExists = nodeIdSet.has(e.source);
    const targetExists = nodeIdSet.has(e.target);
    if (!sourceExists || !targetExists) {
      validation.warnings.push({
        kind: "dangling_cross_edge",
        edge: e.id,
        source: e.source,
        target: e.target,
        missing: !sourceExists ? "source" : "target",
      });
      validation.counts.danglingEdges++;
      return;
    }
    crossEdges.push({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "cross-stage",
      crossStage: true,
    });
  });

  // NPA catalog
  const npa = (npaRaw?.npa || []).map(n => ({
    id: n.id,
    short: n.short_name,
    full: n.full_name,
    url: n.url,
    kind: n.type,
    keyArticles: n.key_articles || [],
  }));

  // Counts
  validation.counts.stages = stages.length;
  validation.counts.nodes = nodes.length;
  validation.counts.edges = edges.length;
  validation.counts.crossEdges = crossEdges.length;
  validation.counts.npa = npa.length;

  // Indexes
  const nodesById = new Map(nodes.map(n => [n.id, n]));
  const nodesByStage = {};
  stages.forEach(s => { nodesByStage[s.id] = []; });
  nodes.forEach(n => { nodesByStage[n.stageId].push(n); });

  // Edges indexed by source / target
  const edgesFromNode = new Map();
  const edgesToNode = new Map();
  [...edges, ...crossEdges].forEach(e => {
    if (!edgesFromNode.has(e.source)) edgesFromNode.set(e.source, []);
    if (!edgesToNode.has(e.target)) edgesToNode.set(e.target, []);
    edgesFromNode.get(e.source).push(e);
    edgesToNode.get(e.target).push(e);
  });

  // Determine "critical" nodes: type=process AND coverage=full AND on main track
  // Heuristic that matches the user's mental model: critical path is the
  // confirmed offbudget process flow.
  nodes.forEach(n => {
    n.critical = (
      (n.type === "process" || n.type === "result") &&
      n.coverage === "full" &&
      n.track === "offbudget" &&
      !n.labelCol
    );
  });

  // Process number grouping: collect unique process numbers per stage
  const processGroups = {};
  nodes.forEach(n => {
    if (!n.process) return;
    const key = `${n.stageId}/${n.process}`;
    if (!processGroups[key]) {
      processGroups[key] = {
        key,
        stageId: n.stageId,
        process: n.process,
        track: n.track,
        nodeIds: [],
        durations: [],
      };
    }
    processGroups[key].nodeIds.push(n.id);
    if (n.duration) processGroups[key].durations.push(n.duration);
  });

  const t1 = performance.now();
  validation.loadMs = Math.round(t1 - t0);

  const model = {
    stages,
    nodes,
    nodesById,
    nodesByStage,
    edges,
    crossEdges,
    allEdges: [...edges, ...crossEdges],
    edgesFromNode,
    edgesToNode,
    npa,
    npaById: new Map(npa.map(n => [n.id, n])),
    processGroups,
    meta: {
      dataVersion: "2026-05-07",
      generatedAt: new Date().toISOString(),
      real: true,
      loadMs: validation.loadMs,
    },
  };

  return { model, validation };
}

/* Find chain related to a node (BFS, max depth 2) */
function relatedNodes(model, nodeId, maxDepth = 2) {
  const visited = new Set([nodeId]);
  const edgesInChain = new Set();
  const queue = [{ id: nodeId, depth: 0 }];
  while (queue.length) {
    const { id, depth } = queue.shift();
    if (depth >= maxDepth) continue;
    const from = model.edgesFromNode.get(id) || [];
    const to = model.edgesToNode.get(id) || [];
    [...from, ...to].forEach(e => {
      edgesInChain.add(e.id);
      const other = e.source === id ? e.target : e.source;
      if (!visited.has(other)) {
        visited.add(other);
        queue.push({ id: other, depth: depth + 1 });
      }
    });
  }
  return { nodeIds: visited, edgeIds: edgesInChain };
}

export {
  loadModel,
  relatedNodes,
  STAGE_FILES,
  STAGE_DURATIONS_DAYS,
  TRACK_LABELS,
  NODE_TYPE_LABELS,
};
