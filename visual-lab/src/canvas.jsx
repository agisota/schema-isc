/* ============================================================
   canvas.jsx — render stages, sections, nodes, edges
   ============================================================ */

import React from "react";
import { LAYOUT_CONST, edgePath } from "./layout.jsx";

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------- single node ---------- */
function NodeBox({ node, pos, selected, highlighted, dimLevel, onSelect, mode }) {
  const cls = [
    "node-wrap",
    selected ? "selected" : "",
    highlighted ? "highlighted" : "",
    dimLevel === "soft" ? "dim" : "",
    dimLevel === "hard" ? "dim-hard" : "",
  ].filter(Boolean).join(" ");

  // Render labelCol nodes (process group headers) as vertical labels
  if (node.labelCol) {
    return (
      <div
        className={cls}
        style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h }}
        onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      >
        <div
          className="node node-labelcol"
          data-track={node.track}
          data-type="label"
          style={{
            background: "var(--color-panel-2)",
            border: "1px solid var(--color-line)",
            borderLeftWidth: "4px",
            borderLeftStyle: "solid",
            borderLeftColor: node.track === "okn" ? "var(--track-okn)" :
                             node.track === "budget" ? "var(--track-budget)" :
                             "var(--track-offbudget)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "16px 6px 12px",
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
          }}
          tabIndex={0}
          role="button"
          aria-label={node.label}
        >
          <div style={{
            position: "sticky",
            top: 16,
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--color-navy)",
            lineHeight: 1.2,
            marginBottom: 6,
          }}>
            {node.label}
          </div>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            color: "var(--color-gold-deep)",
            letterSpacing: "0.04em",
            fontWeight: 600,
            marginBottom: 4,
          }}>
            {node.process}
          </div>
          {node.duration && (
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--color-warn)",
              background: "var(--color-warn-soft)",
              padding: "2px 6px",
              borderRadius: 3,
              fontWeight: 600,
            }}>
              {node.duration}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cls}
      style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h }}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
    >
      <div
        className={`node ${node.coverage === "partial" ? "node-cov-partial" : ""}`}
        data-track={node.track}
        data-type={node.type}
        tabIndex={0}
        role="button"
        aria-label={node.label}
      >
        <span className="node-track" />
        <div className="node-label">{node.label}</div>
        {(mode !== "executive" && (node.process || node.duration)) && (
          <div className="node-meta">
            {node.process && <span className="node-proc">{node.process}</span>}
            {node.duration && <span className="node-dur">{node.duration}</span>}
          </div>
        )}
        {mode === "auditor" && (
          <div className="node-audit">{node.id}</div>
        )}
      </div>
    </div>
  );
}

/* ---------- single stage block ---------- */
function StageBlock({ stage, stageMeta, layoutData, model, selected, highlightSet, dimSet, criticalSet, criticalMode, mode, onSelectNode, onToggleCollapse, collapsed, focused, edges, usesLaterVisible, onJumpToStage }) {
  const counts = useMemo(() => {
    const stageNodes = model.nodesByStage[stage.id] || [];
    return {
      total: stageNodes.length,
      process: stageNodes.filter(n => n.type === "process").length,
      result: stageNodes.filter(n => n.type === "result").length,
      aux: stageNodes.filter(n => n.type === "auxiliary").length,
      alt: stageNodes.filter(n => n.type === "alternative").length,
    };
  }, [model, stage.id]);

  const stageEdges = useMemo(
    () => edges.filter(e => e.stageId === stage.id),
    [edges, stage.id]
  );

  if (collapsed) {
    return (
      <section
        className="stage collapsed"
        data-stage-id={stage.id}
        data-screen-label={`${stage.num} ${stage.short}`}
      >
        <div className="stage-summary">
          <div className="sum-num">{String(stage.num).padStart(2, "0")}</div>
          <div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-gold-deep)",
              marginBottom: 2,
            }}>
              Этап {stage.num} · {stage.durationDays} дн.
            </div>
            <div className="sum-title">{stage.name}</div>
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <div className="sum-counts">
              <span><b>{counts.total}</b> узлов</span>
              <span><b>{stageEdges.length}</b> связей</span>
            </div>
            <button
              className="stage-collapse-btn"
              onClick={() => onToggleCollapse(stage.id)}
              aria-expanded="false"
            >
              ▼ Развернуть
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Map of node positions for edge routing
  const nodePosMap = useMemo(() => {
    const m = new Map();
    layoutData.sections.forEach(s => {
      s.nodes.forEach(n => m.set(n.id, n));
    });
    return m;
  }, [layoutData]);

  // Edges to render inside this stage
  const renderedEdges = useMemo(() => {
    return stageEdges.map(e => {
      const src = nodePosMap.get(e.source);
      const tgt = nodePosMap.get(e.target);
      if (!src || !tgt) return null;
      const d = edgePath(src, tgt, e);
      if (!d) return null;
      const isHl = highlightSet && highlightSet.has(e.source) && highlightSet.has(e.target);
      const sourceCritical = criticalSet.has(e.source);
      const targetCritical = criticalSet.has(e.target);
      const isCriticalEdge = sourceCritical && targetCritical;
      let dimLevel = null;
      if (criticalMode && !isCriticalEdge) dimLevel = "hard";
      if (dimSet && (dimSet.has(e.source) || dimSet.has(e.target))) dimLevel = "soft";
      return { e, d, isHl, isCriticalEdge, dimLevel };
    }).filter(Boolean);
  }, [stageEdges, nodePosMap, highlightSet, dimSet, criticalSet, criticalMode]);

  return (
    <section
      className="stage"
      data-stage-id={stage.id}
      data-screen-label={`${stage.num} ${stage.short}`}
      style={{ minWidth: layoutData.width }}
    >
      <div className="stage-hdr" style={{ width: Math.min(900, layoutData.width - 64) }}>
        <div className="stage-hdr-num">{String(stage.num).padStart(2, "0")}</div>
        <div className="stage-hdr-body">
          <div className="stage-hdr-eyebrow">Этап {stage.num} · {stage.durationDays} дн.</div>
          <h2 className="stage-hdr-title">{stage.name}</h2>
          <div className="stage-hdr-meta">
            <div className="m"><b>{counts.total}</b> узлов</div>
            <div className="m"><b>{counts.process}</b> процессов</div>
            <div className="m"><b>{counts.result}</b> результатов</div>
            {counts.aux > 0 && <div className="m"><b>{counts.aux}</b> вспом.</div>}
            <div className="m"><b>{stageEdges.length}</b> связей</div>
          </div>
        </div>
        <div className="stage-hdr-actions">
          <button
            className="stage-collapse-btn"
            onClick={() => onToggleCollapse(stage.id)}
            aria-expanded="true"
            title="Свернуть этап"
          >
            ▲ Свернуть
          </button>
        </div>
      </div>

      {/* Sections with nodes */}
      <div style={{ position: "relative", height: layoutData.contentHeight, minHeight: 200 }}>
        {/* Section title bands */}
        {layoutData.sections.map(sec => sec.title && (
          <div
            key={`sec-${sec.id}`}
            style={{
              position: "absolute",
              left: LAYOUT_CONST.STAGE_PAD_X,
              top: sec.top,
              right: 16,
              height: LAYOUT_CONST.SECTION_TITLE_H,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              className={`section-title ${sec.bannerColor ? "gold" : ""}`}
              style={sec.bannerColor ? { borderLeftColor: sec.bannerColor, color: sec.bannerColor } : {}}
            >
              {sec.title}
            </span>
          </div>
        ))}

        {/* Section background tints */}
        {layoutData.sections.map(sec => sec.color && (
          <div
            key={`secbg-${sec.id}`}
            style={{
              position: "absolute",
              left: LAYOUT_CONST.STAGE_PAD_X - 8,
              top: sec.top + LAYOUT_CONST.SECTION_TITLE_H - 4,
              right: 16,
              height: sec.height - LAYOUT_CONST.SECTION_TITLE_H,
              background: sec.color,
              borderRadius: "var(--radius-sm)",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* SVG edges */}
        <svg
          className="edges-svg"
          width={layoutData.width}
          height={layoutData.contentHeight}
          style={{ top: 0, left: 0, position: "absolute" }}
        >
          <defs>
            <marker id="arr-default" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-line-hard)" />
            </marker>
            <marker id="arr-cond" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-line-hard)" />
            </marker>
            <marker id="arr-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-gold-deep)" />
            </marker>
            <marker id="arr-crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-danger)" />
            </marker>
          </defs>
          {renderedEdges.map(({ e, d, isHl, isCriticalEdge, dimLevel }) => (
            <path
              key={e.id}
              d={d}
              className={`edge-path ${e.type === "conditional" ? "conditional" : ""} ${isHl ? "highlighted" : ""} ${dimLevel === "hard" ? "dim-hard" : dimLevel === "soft" ? "dim" : ""} ${isCriticalEdge && criticalMode ? "critical" : ""}`}
              markerEnd={isHl ? "url(#arr-hl)" : isCriticalEdge && criticalMode ? "url(#arr-crit)" : "url(#arr-default)"}
            />
          ))}
        </svg>

        {/* Nodes */}
        {layoutData.sections.map(sec => sec.nodes.map(np => {
          const node = model.nodesById.get(np.id);
          if (!node) return null;
          const isSelected = selected === node.id;
          const isHl = highlightSet && highlightSet.has(node.id);
          let dimLevel = null;
          if (criticalMode && !criticalSet.has(node.id)) dimLevel = "hard";
          if (dimSet && dimSet.has(node.id)) dimLevel = "soft";
          if (highlightSet && highlightSet.size > 0 && !isHl && !isSelected) dimLevel = dimLevel || "soft";
          // top is global; need to offset for stage
          const adjusted = { ...np, x: np.x, y: np.y };
          return (
            <NodeBox
              key={node.id}
              node={node}
              pos={adjusted}
              selected={isSelected}
              highlighted={isHl}
              dimLevel={dimLevel}
              onSelect={onSelectNode}
              mode={mode}
            />
          );
        }))}
      </div>
    </section>
  );
}

/* ---------- Cross-stage edges overlay ---------- */
function CrossEdgesOverlay({ model, layout, highlightSet, criticalMode, criticalSet, scrollLeft, scrollTop }) {
  const paths = useMemo(() => {
    return model.crossEdges.map(e => {
      // Find positions across stages
      let srcStage, tgtStage, srcPos, tgtPos;
      for (const s of layout.stages) {
        if (s.collapsed) continue;
        for (const sec of s.sections) {
          const sNode = sec.nodes.find(n => n.id === e.source);
          if (sNode) { srcStage = s; srcPos = sNode; }
          const tNode = sec.nodes.find(n => n.id === e.target);
          if (tNode) { tgtStage = s; tgtPos = tNode; }
        }
      }
      if (!srcPos || !tgtPos || !srcStage || !tgtStage) return null;
      // Add stage top + HEADER_HEIGHT to position relative to canvas
      const headerH = LAYOUT_CONST.HEADER_HEIGHT;
      const x1 = srcPos.x + srcPos.w / 2;
      const y1 = srcPos.y + srcPos.h + srcStage.top + headerH;
      const x2 = tgtPos.x + tgtPos.w / 2;
      const y2 = tgtPos.y + tgtStage.top + headerH;
      // S-curve
      const midY = (y1 + y2) / 2;
      const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      const isHl = highlightSet && highlightSet.has(e.source) && highlightSet.has(e.target);
      const dimLevel = criticalMode ? "hard" : null;
      return { id: e.id, d, isHl, dimLevel };
    }).filter(Boolean);
  }, [model, layout, highlightSet, criticalMode]);

  return (
    <svg
      className="edges-svg cross-edges"
      width={layout.width}
      height={layout.totalHeight}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 3 }}
    >
      <defs>
        <marker id="arr-cross" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-gold-deep)" />
        </marker>
      </defs>
      {paths.map(({ id, d, isHl, dimLevel }) => (
        <path
          key={id}
          d={d}
          className={`edge-path cross-stage ${isHl ? "highlighted" : ""} ${dimLevel === "hard" ? "dim-hard" : ""}`}
          markerEnd="url(#arr-cross)"
        />
      ))}
    </svg>
  );
}

/* ---------- Executive overview ---------- */
function ExecutiveOverview({ model, onJumpToStage }) {
  const totalDays = model.stages.reduce((s, st) => s + st.durationDays, 0);
  const target = 1000;
  const overshoot = totalDays - target;
  const overshootPct = Math.round((overshoot / totalDays) * 100);
  const totalNodes = model.nodes.length;
  const totalEdges = model.allEdges.length;

  // Bar widths: each stage as % of total days
  const stageColors = ["#172b55", "#2b4a85", "#3a6699", "#4a7ea5", "#5a96a8"];

  return (
    <div style={{ padding: "var(--space-6) var(--space-6) var(--space-10)", maxWidth: 1180, margin: "0 auto", width: "100%" }}>
      {/* HERO */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--color-gold-deep)",
          marginBottom: 12,
          fontWeight: 600,
        }}>
          Executive · ИСЦ-2030 · Атлас регуляторного цикла
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 5vw, 56px)",
          fontWeight: 700,
          margin: "0 0 16px",
          letterSpacing: "-0.02em",
          textWrap: "balance",
          lineHeight: 1.02,
          color: "var(--color-ink)",
        }}>
          Сейчас <span style={{ color: "var(--color-navy)" }}>{totalDays}</span> дней.<br />
          К 2030 — <em style={{ fontStyle: "italic", color: "var(--color-gold-deep)" }}>{target}</em>.
        </h1>
        <p style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(15px, 1.7vw, 22px)",
          color: "var(--color-muted)",
          lineHeight: 1.45,
          maxWidth: 780,
          margin: 0,
        }}>
          Сократить инвестиционно-строительный цикл на {overshoot} дней — это{" "}
          <span style={{ color: "var(--color-gold-deep)", fontStyle: "normal", fontWeight: 600 }}>−{overshootPct}%</span>.
          Атлас раскладывает цикл на {model.stages.length} этапа,{" "}
          {totalNodes} операционных узла и {totalEdges} связей: где сокращать — становится видно.
        </p>
      </div>

      {/* TIMELINE BAR */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--color-muted)",
          fontWeight: 600,
          marginBottom: 12,
        }}>
          Длина цикла по этапам · {totalDays} дней
        </div>

        {/* The bar */}
        <div style={{ position: "relative", marginBottom: 4 }}>
          {/* Target line marker — vertical line at 1000 days */}
          <div style={{
            position: "absolute",
            top: -8,
            bottom: -8,
            left: `${(target / totalDays) * 100}%`,
            width: 2,
            background: "var(--color-gold-deep)",
            zIndex: 3,
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            top: -28,
            left: `${(target / totalDays) * 100}%`,
            transform: "translateX(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.06em",
            color: "var(--color-gold-deep)",
            fontWeight: 700,
            background: "var(--color-paper)",
            padding: "1px 8px",
            border: "1px solid var(--color-gold-deep)",
            borderRadius: 2,
            whiteSpace: "nowrap",
            zIndex: 4,
          }}>
            ◆ ТАРГЕT 2030 · 1000
          </div>

          {/* Stages as bar segments */}
          <div style={{
            display: "flex",
            height: 64,
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            boxShadow: "var(--shadow-low)",
            position: "relative",
            zIndex: 2,
          }}>
            {model.stages.map((s, i) => {
              const widthPct = (s.durationDays / totalDays) * 100;
              const isOver = totalDays > target &&
                (model.stages.slice(0, i).reduce((a, st) => a + st.durationDays, 0) >= target);
              return (
                <button
                  key={s.id}
                  onClick={() => onJumpToStage(s.id)}
                  style={{
                    flex: `0 0 ${widthPct}%`,
                    width: `${widthPct}%`,
                    background: stageColors[i],
                    border: "none",
                    cursor: "pointer",
                    color: "white",
                    fontFamily: "inherit",
                    padding: "10px 12px",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                    transition: "filter var(--dur-fast)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
                  title={s.name}
                >
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    opacity: 0.9,
                  }}>
                    Этап {s.num}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-display)",
                    fontSize: widthPct < 5 ? 11 : 18,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}>
                    {s.durationDays}<span style={{
                      fontFamily: "var(--font-body)",
                      fontSize: widthPct < 5 ? 8 : 10,
                      fontWeight: 500,
                      opacity: 0.7,
                      marginLeft: 3,
                    }}>дн.</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tick marks */}
          <div style={{ display: "flex", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-muted)", position: "relative" }}>
            <div style={{ position: "absolute", left: 0 }}>0</div>
            {(() => {
              let acc = 0;
              return model.stages.map(s => {
                acc += s.durationDays;
                const pct = (acc / totalDays) * 100;
                return (
                  <div key={s.id} style={{
                    position: "absolute",
                    left: `${pct}%`,
                    transform: "translateX(-50%)",
                  }}>
                    {acc}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Stage names below */}
        <div style={{ display: "flex", marginTop: 22, gap: 2 }}>
          {model.stages.map((s, i) => {
            const widthPct = (s.durationDays / totalDays) * 100;
            return (
              <div key={s.id} style={{
                flex: `0 0 ${widthPct}%`,
                width: `${widthPct}%`,
                fontSize: 11,
                color: "var(--color-ink-2)",
                lineHeight: 1.3,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                paddingRight: 8,
                textWrap: "balance",
                overflow: "hidden",
              }}>
                {widthPct >= 4 ? s.short : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* HEADLINE INSIGHTS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 1,
        marginBottom: "var(--space-8)",
        background: "var(--color-line-soft)",
        border: "1px solid var(--color-line-soft)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
      }}>
        {[
          { l: "Сокращение", v: `−${overshoot}`, u: "дней", color: "var(--color-gold-deep)" },
          { l: "Узлов", v: totalNodes, u: "", color: "var(--color-navy)" },
          { l: "Связей", v: totalEdges, u: "", color: "var(--color-navy)" },
          { l: "Самый длинный", v: "Э" + model.stages.reduce((a, b) => a.durationDays > b.durationDays ? a : b).num, u: "этап", color: "var(--color-navy)" },
          { l: "Маршрутов", v: 3, u: "", color: "var(--color-navy)" },
          { l: "НПА", v: model.npa.length, u: "", color: "var(--color-navy)" },
        ].map((item, i) => (
          <div key={i} style={{
            background: "var(--color-panel)",
            padding: "14px 18px",
          }}>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
              fontWeight: 600,
              marginBottom: 4,
            }}>{item.l}</div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 700,
              color: item.color,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}>{item.v}{item.u && <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-muted)", fontWeight: 500, marginLeft: 4 }}>{item.u}</span>}</div>
          </div>
        ))}
      </div>

      {/* STAGE CARDS */}
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--color-muted)",
        fontWeight: 600,
        marginBottom: 12,
      }}>
        Этапы цикла
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "var(--space-3)",
        marginBottom: "var(--space-8)",
      }}>
        {model.stages.map((s, i) => {
          const c = model.nodesByStage[s.id].length;
          const stageEdges = model.edges.filter(e => e.stageId === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => onJumpToStage(s.id)}
              style={{
                background: "var(--color-panel)",
                border: "1px solid var(--color-line)",
                borderLeft: `4px solid ${stageColors[i]}`,
                borderRadius: "var(--radius-sm)",
                padding: "16px 16px 18px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "all var(--dur-fast)",
                boxShadow: "var(--shadow-low)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-mid)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-low)"; e.currentTarget.style.transform = ""; }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--color-gold-deep)",
                  fontWeight: 700,
                }}>
                  Этап {s.num}
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--color-muted)",
                  letterSpacing: "0.04em",
                }}>{Math.round((s.durationDays / totalDays) * 100)}%</div>
              </div>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: 32,
                fontWeight: 700,
                color: "var(--color-navy)",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                marginBottom: 10,
              }}>
                {s.durationDays}<span style={{ fontSize: 14, color: "var(--color-muted)", fontWeight: 400, marginLeft: 4 }}>дн.</span>
              </div>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.3,
                color: "var(--color-ink)",
                marginBottom: 12,
                textWrap: "balance",
                minHeight: 36,
              }}>
                {s.short}
              </div>
              <div style={{
                display: "flex",
                gap: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--color-muted)",
                paddingTop: 8,
                borderTop: "1px solid var(--color-line-soft)",
              }}>
                <span><b style={{ color: "var(--color-ink-2)", fontFamily: "var(--font-display)", fontWeight: 700 }}>{c}</b> узлов</span>
                <span><b style={{ color: "var(--color-ink-2)", fontFamily: "var(--font-display)", fontWeight: 700 }}>{stageEdges}</b> связей</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Next steps */}
      <div style={{
        padding: "var(--space-4) var(--space-5)",
        background: "var(--color-panel)",
        border: "1px solid var(--color-line)",
        borderLeft: "3px solid var(--color-gold-deep)",
        borderRadius: "var(--radius-sm)",
      }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--color-gold-deep)",
          marginBottom: 6,
          fontWeight: 600,
        }}>
          Что дальше
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--color-ink-2)" }}>
          <b>Analyst</b> — полная карта процедур, артефактов и НПА с фильтрами по маршруту,
          critical path и поиском.&nbsp;
          <b>Auditor</b> — provenance, идентификаторы узлов и ссылки на источник для перекрёстной проверки.
        </p>
      </div>
    </div>
  );
}

export { NodeBox, StageBlock, CrossEdgesOverlay, ExecutiveOverview };
