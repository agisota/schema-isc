/* ============================================================
   layout.jsx — section × row × col grid layout per stage
   Computes pixel positions for nodes and routing anchors.
   ============================================================ */

const LAYOUT_CONST = {
  STAGE_PAD_X: 144,
  STAGE_PAD_TOP: 24,
  STAGE_PAD_BOTTOM: 36,
  HEADER_HEIGHT: 100,
  SECTION_TITLE_H: 28,
  SECTION_PAD_BOTTOM: 22,
  SECTION_GAP: 20,

  CELL_W: 184,
  CELL_H: 64,
  CELL_GAP_X: 14,
  CELL_GAP_Y: 12,
  NODE_PAD: 2,

  WIDE_MULT: 1.6,
  TALL_MULT: 2.0,
};

/* Layout a single stage.
   Returns { width, height, sections: [{id, title, top, height, nodes: [{id, x, y, w, h}], labelCols: [...]}] } */
function layoutStage(stage, nodes, density = "analyst") {
  const C = LAYOUT_CONST;

  const nodesBySection = {};
  (stage.sections || []).forEach(sec => {
    nodesBySection[sec.id] = [];
  });
  nodes.forEach(n => {
    if (!nodesBySection[n.section]) nodesBySection[n.section] = [];
    nodesBySection[n.section].push(n);
  });

  // For each section, separate labelCol nodes from grid nodes
  const sectionLayouts = [];
  let yOffset = C.HEADER_HEIGHT;

  (stage.sections || []).forEach(sec => {
    const allNodes = nodesBySection[sec.id] || [];
    if (allNodes.length === 0) return;

    // Separate label-col nodes (process group labels — span vertically)
    // and sidebar nodes (rendered above grid as meta list)
    const labelNodes = allNodes.filter(n => n.labelCol);
    const sidebarNodes = allNodes.filter(n => n.sidebar && !n.labelCol);
    const gridNodes = allNodes.filter(n => !n.labelCol && !n.sidebar);

    // Compute grid extent from non-label, non-sidebar nodes
    let maxRow = 0;
    let maxCol = 0;
    gridNodes.forEach(n => {
      maxRow = Math.max(maxRow, n.row + (n.rowSpan || 1) - 1);
      maxCol = Math.max(maxCol, n.col + (n.colSpan || 1) - 1);
    });

    const cols = Math.max(maxCol + 1, 1);
    const rows = Math.max(maxRow + 1, 1);
    const gridHeight = rows * C.CELL_H + (rows - 1) * C.CELL_GAP_Y;
    const sectionHeight = gridHeight + C.SECTION_TITLE_H + C.SECTION_PAD_BOTTOM;

    const placedNodes = gridNodes.map(n => {
      const cellW = n.wide ? C.CELL_W * C.WIDE_MULT : C.CELL_W;
      const cellH = n.tall ? C.CELL_H * C.TALL_MULT : C.CELL_H;
      const cspan = n.colSpan || 1;
      const rspan = n.rowSpan || 1;
      const w = (cellW * cspan + C.CELL_GAP_X * (cspan - 1));
      const h = (cellH * rspan + C.CELL_GAP_Y * (rspan - 1));
      const x = C.STAGE_PAD_X + n.col * (C.CELL_W + C.CELL_GAP_X);
      const y = yOffset + C.SECTION_TITLE_H + n.row * (C.CELL_H + C.CELL_GAP_Y);
      return { id: n.id, x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
    });

    // labelCol nodes: render as tall LEFT-side bands.
    // Sort by their row position, then each labelCol spans from its row to
    // the row of the NEXT labelCol (or maxRow + 1).
    const sortedLabels = [...labelNodes].sort((a, b) => a.row - b.row);
    const labelCols = sortedLabels.map((n, i) => {
      const labelW = 112;
      const startRow = n.row;
      const endRow = (i + 1 < sortedLabels.length) ? sortedLabels[i + 1].row : (maxRow + 1);
      const rowsSpan = Math.max(1, endRow - startRow);
      const x = C.STAGE_PAD_X - labelW - 6;
      const y = yOffset + C.SECTION_TITLE_H + startRow * (C.CELL_H + C.CELL_GAP_Y);
      const h = rowsSpan * C.CELL_H + (rowsSpan - 1) * C.CELL_GAP_Y;
      return {
        id: n.id,
        x, y, w: labelW, h,
        cx: x + labelW / 2, cy: y + h / 2,
        isLabel: true,
      };
    });

    // sidebar nodes: skip from grid rendering. These are process-group meta
    // nodes that belong in a different view (TODO: render as inspector chips
    // or as a horizontal meta-list at the top of the stage).
    const sidebarChips = [];

    sectionLayouts.push({
      id: sec.id,
      title: sec.label || "",
      color: sec.color,
      bannerColor: sec.bannerColor,
      top: yOffset,
      height: sectionHeight,
      cols,
      rows,
      nodes: [...placedNodes, ...labelCols, ...sidebarChips],
      gridNodes: placedNodes,
      labelCols,
      sidebarChips,
    });

    yOffset += sectionHeight + C.SECTION_GAP;
  });

  // Compute width: max nodes extent
  let maxX = 0;
  sectionLayouts.forEach(s => {
    s.nodes.forEach(n => { if (n.x + n.w > maxX) maxX = n.x + n.w; });
  });
  const width = Math.max(maxX + C.STAGE_PAD_X, 900);
  const contentHeight = yOffset + C.STAGE_PAD_BOTTOM;
  const height = contentHeight; // content area only; header is separate

  return { stageId: stage.id, width, contentHeight, height, sections: sectionLayouts };
}

/* Layout all stages stacked vertically.
   Returns { width, totalHeight, stages: [{...layoutStage, top}] } */
function layoutModel(model, density = "analyst", collapsedStages = new Set()) {
  const out = { stages: [], totalHeight: 0, width: 0 };
  let y = 0;
  model.stages.forEach(s => {
    const stageNodes = model.nodesByStage[s.id] || [];
    let stageLayout;
    if (collapsedStages.has(s.id)) {
      stageLayout = {
        stageId: s.id,
        width: 900,
        contentHeight: 0,
        height: 0,
        sections: [],
        collapsed: true,
      };
    } else {
      stageLayout = layoutStage(s, stageNodes, density);
      stageLayout.collapsed = false;
    }
    stageLayout.top = y;
    // Approximate full stage block height = stage header + content
    const fullHeight = stageLayout.collapsed ? 80 : (LAYOUT_CONST.HEADER_HEIGHT + stageLayout.contentHeight);
    y += fullHeight + 24;
    out.stages.push(stageLayout);
    if (stageLayout.width > out.width) out.width = stageLayout.width;
  });
  out.totalHeight = y;
  return out;
}

/* Lookup node position globally */
function findNodePos(layout, nodeId) {
  for (const s of layout.stages) {
    for (const sec of (s.sections || [])) {
      const found = sec.nodes.find(n => n.id === nodeId);
      if (found) return { ...found, stageTop: s.top, collapsed: s.collapsed };
    }
  }
  return null;
}

/* Edge routing: orthogonal path with anchor on a node side.
   handle: source-bottom => from bottom edge; default => right edge to left edge. */
function edgePath(srcPos, tgtPos, edge) {
  if (!srcPos || !tgtPos) return null;
  const sx = srcPos.x, sy = srcPos.y, sw = srcPos.w, sh = srcPos.h;
  const tx = tgtPos.x, ty = tgtPos.y, tw = tgtPos.w, th = tgtPos.h;

  let x1, y1, x2, y2;
  // Default: right of source to left of target if target is to the right
  // sourceHandle: source-bottom => start at bottom-mid
  // targetHandle: target-top => end at top-mid
  const sBottom = edge.sourceHandle === "source-bottom";
  const tTop = edge.targetHandle === "target-top";

  if (sBottom) {
    x1 = sx + sw / 2;
    y1 = sy + sh;
  } else if (tx > sx + sw) {
    x1 = sx + sw;
    y1 = sy + sh / 2;
  } else if (tx + tw < sx) {
    x1 = sx;
    y1 = sy + sh / 2;
  } else {
    x1 = sx + sw / 2;
    y1 = sy + sh;
  }

  if (tTop) {
    x2 = tx + tw / 2;
    y2 = ty;
  } else if (tx > sx + sw) {
    x2 = tx;
    y2 = ty + th / 2;
  } else if (tx + tw < sx) {
    x2 = tx + tw;
    y2 = ty + th / 2;
  } else {
    x2 = tx + tw / 2;
    y2 = ty;
  }

  // Orthogonal routing
  const dy = y2 - y1;
  const dx = x2 - x1;

  if (sBottom || tTop) {
    // vertical-first
    const midY = y1 + dy * 0.5;
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  } else {
    // horizontal-first with corner
    const midX = x1 + dx * 0.55;
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }
}

export {
  LAYOUT_CONST,
  layoutStage,
  layoutModel,
  findNodePos,
  edgePath,
};
