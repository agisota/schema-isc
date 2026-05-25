/* ============================================================
   views.jsx — alternative variant views over the same data.
   - MatrixView: stage × node-type cockpit
   - ConstellationView: radial sector chart
   ============================================================ */

const { useMemo: useMemoV } = React;

/* Display order of node types */
const TYPE_ORDER = ["process", "result", "alternative", "auxiliary"];

/* ============================================================
   MatrixView — cockpit-style stage × type matrix
   Each cell shows count and a route-share bar.
   Click cell → filter to that stage in Timeline view.
   ============================================================ */
function MatrixView({ model, onJumpToStage, onSelectMode, activeRoute }) {
  const matrix = useMemoV(() => {
    if (!model) return null;
    const rows = model.stages.map(stage => {
      const stageNodes = (model.nodesByStage[stage.id] || [])
        .filter(n => !n.labelCol && !n.sidebar);
      const cells = TYPE_ORDER.map(type => {
        const cellNodes = stageNodes.filter(n => {
          if (activeRoute !== "all" && n.track !== activeRoute) return false;
          return n.type === type;
        });
        // Track share within cell
        const trackCounts = {
          offbudget: cellNodes.filter(n => n.track === "offbudget").length,
          budget: cellNodes.filter(n => n.track === "budget").length,
          okn: cellNodes.filter(n => n.track === "okn").length,
        };
        return {
          type,
          count: cellNodes.length,
          nodes: cellNodes,
          trackCounts,
        };
      });
      const stageEdges = model.edges.filter(e => e.stageId === stage.id).length;
      return { stage, cells, total: cells.reduce((s, c) => s + c.count, 0), edges: stageEdges };
    });

    // Column totals
    const colTotals = TYPE_ORDER.map((type, i) =>
      rows.reduce((s, r) => s + r.cells[i].count, 0)
    );
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);

    // Per-cell max for bar scaling
    let cellMax = 0;
    rows.forEach(r => r.cells.forEach(c => { if (c.count > cellMax) cellMax = c.count; }));

    return { rows, colTotals, grandTotal, cellMax };
  }, [model, activeRoute]);

  if (!matrix) return null;

  const typeLabels = {
    process: "Процессы",
    result: "Результаты",
    alternative: "Альтернативы",
    auxiliary: "Вспомогательные",
  };
  const typeGlyph = {
    process: "P",
    result: "R",
    alternative: "A",
    auxiliary: "x",
  };

  return (
    <div className="matrix-view">
      <div className="matrix-eyebrow">
        Variant V3-3 · Cockpit Matrix · этап × тип узла
      </div>
      <h1 className="matrix-title">
        Распределение операционных узлов ИСЦ по этапам и типам
      </h1>
      <p className="matrix-sub">
        Каждая ячейка — число узлов соответствующего типа на этапе. Полоса под цифрой —
        доля маршрута основного процесса (внебюджет / бюджет / ОКН). Клик переключает
        на Timeline-вид с фокусом этапа.
      </p>

      <table className="matrix-table" role="grid">
        <thead>
          <tr>
            <th className="matrix-head-stage">Этап</th>
            {TYPE_ORDER.map(type => (
              <th key={type} className="matrix-head-type">
                <span className="type-icon">{typeGlyph[type]}</span>{typeLabels[type]}
              </th>
            ))}
            <th className="matrix-head-type" style={{ textAlign: "right" }}>Всего</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map(row => (
            <tr key={row.stage.id}>
              <td
                className="matrix-row-head"
                onClick={() => { onSelectMode("analyst"); onJumpToStage(row.stage.id); }}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
              >
                <div className="rh-num">Этап {row.stage.num}</div>
                <div className="rh-name">{row.stage.short}</div>
                <div className="rh-days"><b>{row.stage.durationDays}</b> дн. · <b>{row.edges}</b> связей</div>
              </td>
              {row.cells.map(cell => {
                const ratio = matrix.cellMax > 0 ? cell.count / matrix.cellMax : 0;
                const isEmpty = cell.count === 0;
                return (
                  <td
                    key={cell.type}
                    className={`matrix-cell ${isEmpty ? "empty" : ""}`}
                    onClick={() => {
                      if (!isEmpty && cell.nodes[0]) {
                        // jump to first node in this cell
                        onSelectMode("analyst");
                        onJumpToStage(row.stage.id);
                      }
                    }}
                  >
                    <div className="cell-count">{cell.count || "—"}</div>
                    {!isEmpty && (
                      <>
                        <div className="cell-meta">
                          {cell.trackCounts.offbudget > 0 && (
                            <span className="cell-chip" style={{ color: "var(--track-offbudget)" }}>
                              вб·{cell.trackCounts.offbudget}
                            </span>
                          )}
                          {cell.trackCounts.budget > 0 && (
                            <span className="cell-chip" style={{ color: "var(--track-budget)" }}>
                              б·{cell.trackCounts.budget}
                            </span>
                          )}
                          {cell.trackCounts.okn > 0 && (
                            <span className="cell-chip" style={{ color: "var(--track-okn)" }}>
                              окн·{cell.trackCounts.okn}
                            </span>
                          )}
                        </div>
                        <div className="cell-bar">
                          <div className="cell-bar-fill" style={{ width: `${ratio * 100}%` }} />
                        </div>
                      </>
                    )}
                  </td>
                );
              })}
              <td className="matrix-row-total" style={{ textAlign: "right" }}>{row.total}</td>
            </tr>
          ))}
          <tr className="matrix-totals-row">
            <td>Всего</td>
            {matrix.colTotals.map((t, i) => (
              <td key={i}><b>{t}</b>{typeLabels[TYPE_ORDER[i]]?.toLowerCase()}</td>
            ))}
            <td style={{ textAlign: "right" }}><b>{matrix.grandTotal}</b>всего</td>
          </tr>
        </tbody>
      </table>

      <div style={{
        marginTop: "var(--space-5)",
        padding: "var(--space-3) var(--space-4)",
        background: "var(--color-panel)",
        border: "1px solid var(--color-line-soft)",
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--color-muted)",
        lineHeight: 1.6,
      }}>
        <b style={{ color: "var(--color-ink-2)" }}>Привязка данных:</b>
        &nbsp;строки = <code>stages[]</code>, столбцы = <code>nodes[].type</code>,
        ячейка.count = <code>count(nodes WHERE stage_id=row AND type=col)</code>,
        чипы = <code>group_by(track) WITHIN cell</code>, бар = <code>cell.count / cellMax</code>.
      </div>
    </div>
  );
}

/* ============================================================
   ConstellationView — radial sector chart
   5 sectors (one per stage), nodes plotted as dots in concentric
   rings by type. Provides a compact "constellation" overview.
   ============================================================ */
function ConstellationView({ model, selected, onSelectNode, activeRoute, criticalSet, criticalMode }) {
  // SVG sized for responsive viewBox
  const SIZE = 720;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const innerR = 60;
  const outerR = SIZE / 2 - 32;
  const ringStep = (outerR - innerR) / 4;

  const data = useMemoV(() => {
    if (!model) return null;
    // Sector per stage. Sector arc proportional to stage durationDays.
    const totalDays = model.stages.reduce((s, st) => s + st.durationDays, 0);
    let angleAcc = -Math.PI / 2; // start at top
    const sectors = model.stages.map(st => {
      const angSpan = (st.durationDays / totalDays) * 2 * Math.PI;
      const startA = angleAcc;
      const endA = angleAcc + angSpan;
      angleAcc = endA;
      return { stage: st, startA, endA, angSpan };
    });

    // Place nodes within each sector. Ring = node type.
    // Distribute nodes evenly across the sector's angular range.
    const ringRadii = {
      process: innerR + ringStep * 1.6,
      result: innerR + ringStep * 3.2,
      alternative: innerR + ringStep * 0.6,
      auxiliary: innerR + ringStep * 2.4,
    };

    const dots = [];
    sectors.forEach(sec => {
      const stageNodes = (model.nodesByStage[sec.stage.id] || [])
        .filter(n => !n.labelCol && !n.sidebar);
      // Group by type
      TYPE_ORDER.forEach(type => {
        const typeNodes = stageNodes.filter(n => n.type === type);
        const count = typeNodes.length;
        if (count === 0) return;
        // pad inside sector by 4°
        const padA = 4 * Math.PI / 180;
        const aStart = sec.startA + padA;
        const aEnd = sec.endA - padA;
        const aSpan = Math.max(0.01, aEnd - aStart);
        const baseR = ringRadii[type] || innerR;
        // distribute nodes; if too many, jitter the radius
        typeNodes.forEach((n, i) => {
          const t = count === 1 ? 0.5 : i / (count - 1);
          const ang = aStart + t * aSpan;
          // jitter radius slightly for visual density
          const rJit = (i % 3) * 4 - 4;
          const r = baseR + rJit;
          dots.push({
            id: n.id,
            x: cx + Math.cos(ang) * r,
            y: cy + Math.sin(ang) * r,
            type: n.type,
            track: n.track,
            critical: n.critical,
            stageId: sec.stage.id,
          });
        });
      });
    });

    return { sectors, dots };
  }, [model]);

  if (!data) return null;

  // Track colors
  const trackColor = (t) => t === "okn" ? "var(--track-okn)" :
    t === "budget" ? "var(--track-budget)" : "var(--track-offbudget)";
  const radius = (type) => type === "process" ? 4.5 : type === "result" ? 5.5 :
    type === "alternative" ? 4 : 3;

  function arcPath(r, startA, endA) {
    const large = endA - startA > Math.PI ? 1 : 0;
    const x1 = cx + Math.cos(startA) * r;
    const y1 = cy + Math.sin(startA) * r;
    const x2 = cx + Math.cos(endA) * r;
    const y2 = cy + Math.sin(endA) * r;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  function sectorPath(startA, endA, innerR, outerR) {
    const large = endA - startA > Math.PI ? 1 : 0;
    const x1o = cx + Math.cos(startA) * outerR;
    const y1o = cy + Math.sin(startA) * outerR;
    const x2o = cx + Math.cos(endA) * outerR;
    const y2o = cy + Math.sin(endA) * outerR;
    const x1i = cx + Math.cos(startA) * innerR;
    const y1i = cy + Math.sin(startA) * innerR;
    const x2i = cx + Math.cos(endA) * innerR;
    const y2i = cy + Math.sin(endA) * innerR;
    return `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${outerR} ${outerR} 0 ${large} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${innerR} ${innerR} 0 ${large} 0 ${x1i} ${y1i} Z`;
  }

  return (
    <div className="constell-view" style={{ position: "relative" }}>
      <div style={{
        position: "absolute",
        top: 24,
        left: 28,
        maxWidth: 360,
        zIndex: 2,
      }}>
        <div className="matrix-eyebrow">Variant V3-5 · Radial Constellation</div>
        <h1 className="matrix-title" style={{ fontSize: 24 }}>
          Атлас как созвездие
        </h1>
        <p className="matrix-sub" style={{ fontSize: 13 }}>
          Угол сектора пропорционален длительности этапа,
          радиальные кольца — типы узлов: процессы (внутри), результаты (по краю),
          альтернативы и вспомогательные между ними.
        </p>
      </div>

      <svg
        className="constell-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        {/* Sector backgrounds */}
        {data.sectors.map((sec, i) => (
          <path
            key={`sb-${sec.stage.id}`}
            className="sector-bg"
            d={sectorPath(sec.startA, sec.endA, innerR, outerR)}
            fill={i % 2 === 0 ? "var(--color-navy)" : "var(--color-gold-deep)"}
          />
        ))}

        {/* Sector dividing lines */}
        {data.sectors.map((sec, i) => {
          const x1 = cx + Math.cos(sec.startA) * innerR;
          const y1 = cy + Math.sin(sec.startA) * innerR;
          const x2 = cx + Math.cos(sec.startA) * outerR;
          const y2 = cy + Math.sin(sec.startA) * outerR;
          return (
            <line key={`sl-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="var(--color-line)" strokeWidth="0.75" />
          );
        })}

        {/* Type rings (visual reference) */}
        {TYPE_ORDER.map((type, i) => {
          const r = innerR + ringStep * (i === 0 ? 0.6 : i === 1 ? 1.6 : i === 2 ? 3.2 : 2.4);
          return (
            <g key={`ring-${type}`}>
              <circle className="ring" cx={cx} cy={cy} r={r} />
            </g>
          );
        })}

        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="var(--color-line)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={innerR} fill="var(--color-panel)" stroke="var(--color-line)" strokeWidth="1" />

        {/* Sector labels along arc */}
        {data.sectors.map((sec, i) => {
          const midA = (sec.startA + sec.endA) / 2;
          const labelR = outerR + 16;
          const lx = cx + Math.cos(midA) * labelR;
          const ly = cy + Math.sin(midA) * labelR;
          const dayR = innerR + 14;
          const dx = cx + Math.cos(midA) * dayR;
          const dy = cy + Math.sin(midA) * dayR;
          // rotate label
          const deg = (midA * 180) / Math.PI;
          const rotate = (deg > 90 && deg < 270) ? deg + 180 : deg;
          return (
            <g key={`sec-lbl-${i}`}>
              <text
                className="sector-label"
                x={lx} y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${rotate}, ${lx}, ${ly})`}
              >
                Э{sec.stage.num} · {sec.stage.short}
              </text>
              <text
                className="sector-day"
                x={dx} y={dy}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {sec.stage.durationDays}
              </text>
            </g>
          );
        })}

        {/* Center labels */}
        <text className="center-label" x={cx} y={cy - 6}>1250 → 1000</text>
        <text className="center-sub" x={cx} y={cy + 12}>дней цикла</text>

        {/* Dots */}
        {data.dots.map(d => {
          const isSelected = selected === d.id;
          const isDimmed = activeRoute !== "all" && d.track !== activeRoute;
          const isCritDim = criticalMode && !criticalSet.has(d.id);
          const cls = `node-dot ${isSelected ? "selected" : ""} ${isCritDim ? "dim-hard" : isDimmed ? "dim" : ""}`;
          return (
            <circle
              key={d.id}
              className={cls}
              cx={d.x}
              cy={d.y}
              r={radius(d.type)}
              fill={trackColor(d.track)}
              onClick={(e) => { e.stopPropagation(); onSelectNode(d.id); }}
            >
              <title>{model.nodesById.get(d.id)?.label}</title>
            </circle>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="constell-legend">
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--color-muted)",
          marginBottom: 4,
          fontWeight: 600,
        }}>
          Маршрут (цвет)
        </div>
        <div className="ll-row"><span className="ll-dot" style={{ background: "var(--track-offbudget)" }} /> Внебюджетный</div>
        <div className="ll-row"><span className="ll-dot" style={{ background: "var(--track-budget)" }} /> Бюджетный</div>
        <div className="ll-row"><span className="ll-dot" style={{ background: "var(--track-okn)" }} /> ОКН</div>
        <div style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: "1px solid var(--color-line-soft)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--color-muted)",
          letterSpacing: "0.04em",
        }}>
          Кольцо (тип) · Размер (важность)
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MatrixView, ConstellationView });
