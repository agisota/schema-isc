/* ============================================================
   panels.jsx — TopBar, LeftRail, Inspector, BottomBar
   ============================================================ */

import React from "react";
import { TRACK_LABELS, NODE_TYPE_LABELS } from "./data-loader.jsx";

const { useState: useStateP, useEffect: useEffectP, useMemo: useMemoP, useRef: useRefP } = React;

/* ---------- TopBar ---------- */
function TopBar({ model, mode, setMode, view, setView, theme, setTheme, query, setQuery, searchOpen, setSearchOpen, onSelectNode, validation, onExport, onShowValidation, onToggleLeftDrawer, onToggleRightDrawer, isMobile }) {
  const inputRef = useRefP(null);

  useEffectP(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searchResults = useMemoP(() => {
    if (!model || !query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    const out = [];
    // nodes
    for (const n of model.nodes) {
      if (n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) || n.process.includes(q) || (n.description || "").toLowerCase().includes(q)) {
        out.push({
          id: n.id,
          type: "Узел",
          subtype: NODE_TYPE_LABELS[n.type] || n.type,
          title: n.label,
          stage: n.stageNum,
          meta: n.process,
          kind: "node",
        });
        if (out.length >= 20) break;
      }
    }
    // NPA
    if (out.length < 20) {
      for (const n of model.npa) {
        if (n.short.toLowerCase().includes(q) || n.full.toLowerCase().includes(q)) {
          out.push({
            id: n.id,
            type: "НПА",
            subtype: n.kind || "",
            title: n.full,
            meta: n.short,
            kind: "npa",
          });
          if (out.length >= 20) break;
        }
      }
    }
    return out;
  }, [model, query]);

  const totalDuration = useMemoP(() => {
    if (!model) return 0;
    return model.stages.reduce((sum, s) => sum + s.durationDays, 0);
  }, [model]);

  const valStatus = validation && validation.counts.danglingEdges === 0 ? "ok" : validation && validation.counts.danglingEdges < 5 ? "warn" : "err";
  const valLabel = !validation ? "—" : validation.counts.danglingEdges === 0 ? "OK" : `${validation.counts.danglingEdges} dangling`;

  return (
    <header className="tb">
      {isMobile && (
        <button
          className="tool-btn"
          onClick={onToggleLeftDrawer}
          style={{ marginRight: 8 }}
          aria-label="Открыть фильтры"
        >☰</button>
      )}
      <div className="tb-brand">
        <div className="tb-brand-line1">ИСЦ <em>Атлас</em></div>
        <div className="tb-brand-line2">v2 · {model?.meta?.dataVersion || "—"}</div>
      </div>

      {model && (
        <>
          <div className="tb-figures">
            <div className="fig">
              <div className="fig-l">Цикл</div>
              <div className="fig-v">{totalDuration}<small>дн.</small></div>
            </div>
            <div className="fig target">
              <div className="fig-l">Таргет 2030</div>
              <div className="fig-v">1000<small>дн.</small></div>
            </div>
            <div className="fig delta">
              <div className="fig-l">−</div>
              <div className="fig-v">{totalDuration - 1000}<small>дн.</small></div>
            </div>
            <div className="fig optional-hide-2">
              <div className="fig-l">Узлы</div>
              <div className="fig-v">{validation?.counts.nodes ?? "—"}</div>
            </div>
            <div className="fig optional-hide-1">
              <div className="fig-l">Связи</div>
              <div className="fig-v">{validation ? validation.counts.edges + validation.counts.crossEdges : "—"}</div>
            </div>
            <div className="fig optional-hide-1">
              <div className="fig-l">НПА</div>
              <div className="fig-v">{validation?.counts.npa ?? "—"}</div>
            </div>
          </div>

          <div className="tb-modes" role="tablist" aria-label="Режимы чтения">
            <button
              className={`tb-mode ${mode === "executive" ? "active" : ""}`}
              onClick={() => setMode("executive")}
              role="tab"
              aria-selected={mode === "executive"}
            >Executive</button>
            <button
              className={`tb-mode ${mode === "analyst" ? "active" : ""}`}
              onClick={() => setMode("analyst")}
              role="tab"
              aria-selected={mode === "analyst"}
            >Analyst</button>
            <button
              className={`tb-mode ${mode === "auditor" ? "active" : ""}`}
              onClick={() => setMode("auditor")}
              role="tab"
              aria-selected={mode === "auditor"}
            >Auditor</button>
          </div>

          {mode !== "executive" && (
            <div className="view-picker" role="tablist" aria-label="Тип визуализации">
              <button
                className={view === "timeline" ? "active" : ""}
                onClick={() => setView("timeline")}
                title="Timeline · section × row × col grid"
              ><span className="vp-glyph">≡</span> Timeline</button>
              <button
                className={view === "matrix" ? "active" : ""}
                onClick={() => setView("matrix")}
                title="Matrix · stage × type cockpit"
              ><span className="vp-glyph">▦</span> Matrix</button>
              <button
                className={view === "constellation" ? "active" : ""}
                onClick={() => setView("constellation")}
                title="Constellation · radial sector chart"
              ><span className="vp-glyph">◎</span> Radial</button>
            </div>
          )}
        </>
      )}

      <div className="tb-tools">
        <div className="search-host">
          <svg className="ico" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 14L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск: узел, НПА, ГПЗУ…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            aria-label="Поиск по атласу"
          />
          <span className="kbd">⌘K</span>
          {searchOpen && query.length >= 2 && (
            <div className="search-results" role="listbox">
              {searchResults.length === 0 ? (
                <div className="sr" style={{ color: "var(--color-muted)", cursor: "default" }}>
                  Ничего не найдено
                </div>
              ) : (
                searchResults.map(r => (
                  <div
                    key={r.id}
                    className="sr"
                    onClick={() => {
                      if (r.kind === "node") onSelectNode(r.id);
                      setSearchOpen(false);
                      setQuery("");
                    }}
                    role="option"
                  >
                    <div className="sr-type">{r.type} {r.subtype && `· ${r.subtype}`}</div>
                    <div className="sr-title">{r.title}</div>
                    {r.stage && <div className="sr-meta">Э{r.stage}</div>}
                    {r.kind === "npa" && <div className="sr-meta">{r.meta}</div>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          className={`val-badge ${valStatus}`}
          onClick={onShowValidation}
          title="Отчёт валидации данных"
        >
          <span className="dot" /> {valLabel}
        </button>

        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          aria-label="Переключить тему"
        >{theme === "dark" ? "☀" : "☾"}</button>

        <button
          className="tool-btn"
          onClick={onExport}
          title="Экспорт PNG"
        >
          <span className="glyph">↓</span> Export
        </button>

        {isMobile && (
          <button
            className="tool-btn"
            onClick={onToggleRightDrawer}
            aria-label="Открыть инспектор"
          >ⓘ</button>
        )}
      </div>
    </header>
  );
}

/* ---------- Stage Tabs ---------- */
function StageTabs({ model, activeStage, onJumpToStage, collapsedStages, criticalMode }) {
  if (!model) return <div className="tabs" />;
  const tabs = model.stages.map(s => ({
    id: s.id,
    num: s.num,
    title: s.short,
    days: s.durationDays,
    count: model.nodesByStage[s.id].length,
    collapsed: collapsedStages.has(s.id),
  }));
  return (
    <div className="tabs" role="tablist" aria-label="Этапы">
      <button
        className={`tab all-tab ${activeStage === "all" ? "active" : ""}`}
        onClick={() => onJumpToStage("all")}
        role="tab"
        aria-selected={activeStage === "all"}
      >
        <div className="row1">
          <span className="num">Все</span>
          <span className="cnt">1250 дн.</span>
        </div>
        <span className="ttl">Полный обзор</span>
      </button>
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab ${activeStage === t.id ? "active" : ""}`}
          onClick={() => onJumpToStage(t.id)}
          role="tab"
          aria-selected={activeStage === t.id}
          title={t.title}
        >
          <div className="row1">
            <span className="num">Этап {t.num}{t.collapsed ? " · ▾" : ""}</span>
            <span className="cnt">{t.days} дн.</span>
          </div>
          <span className="ttl">{t.title} · <b style={{ color: "var(--color-navy)" }}>{t.count}</b></span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Left Rail ---------- */
function LeftRail({
  model,
  activeRoute, setRoute,
  visibleTypes, toggleType,
  criticalMode, setCriticalMode,
  usesLaterVisible, setUsesLaterVisible,
  drawerOpen, onClose,
}) {
  if (!model) return null;

  const tracks = [
    { id: "all", label: "Все маршруты", color: "var(--color-navy)" },
    { id: "offbudget", label: TRACK_LABELS.offbudget, color: "var(--track-offbudget)" },
    { id: "budget", label: TRACK_LABELS.budget, color: "var(--track-budget)" },
    { id: "okn", label: TRACK_LABELS.okn, color: "var(--track-okn)" },
  ];

  function trackCount(t) {
    if (t === "all") return model.nodes.length;
    return model.nodes.filter(n => n.track === t).length;
  }
  function typeCount(t) {
    return model.nodes.filter(n => n.type === t).length;
  }

  const types = [
    { id: "process", label: "Процессы" },
    { id: "result", label: "Результаты" },
    { id: "auxiliary", label: "Вспомог." },
    { id: "alternative", label: "Альтернативы" },
    { id: "condition", label: "Условия / разделы" },
    { id: "document", label: "Документы" },
    { id: "documentList", label: "Перечни" },
  ];

  return (
    <aside className={`lp ${drawerOpen ? "drawer-open" : ""}`} aria-label="Фильтры">
      <div className="lp-section">
        <h3 className="lp-h">Маршруты</h3>
        <div className="lp-list">
          {tracks.map(t => (
            <label key={t.id} className={`lp-item ${activeRoute === t.id ? "active" : ""}`}>
              <input
                type="radio"
                name="route"
                checked={activeRoute === t.id}
                onChange={() => setRoute(t.id)}
              />
              <span className="sw" style={{ color: t.color }} />
              <span className="label">{t.label}</span>
              <span className="cnt">{trackCount(t.id)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="lp-section">
        <h3 className="lp-h">Типы узлов</h3>
        <div className="lp-list">
          {types.map(t => (
            <label key={t.id} className="lp-item">
              <input
                type="checkbox"
                checked={visibleTypes.has(t.id)}
                onChange={() => toggleType(t.id)}
              />
              <span className="label">{t.label}</span>
              <span className="cnt">{typeCount(t.id)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="lp-section">
        <h3 className="lp-h">Режимы подсветки</h3>
        <div className="lp-list">
          <label className={`lp-item ${criticalMode ? "active" : ""}`}>
            <input
              type="checkbox"
              checked={criticalMode}
              onChange={() => setCriticalMode(v => !v)}
            />
            <span className="sw" style={{ color: "var(--color-danger)" }} />
            <span className="label">Критический путь</span>
          </label>
          <label className={`lp-item ${usesLaterVisible ? "active" : ""}`}>
            <input
              type="checkbox"
              checked={usesLaterVisible}
              onChange={() => setUsesLaterVisible(v => !v)}
            />
            <span className="sw" style={{ color: "var(--color-gold-deep)" }} />
            <span className="label">Cross-stage связи</span>
            <span className="cnt">{model.crossEdges.length}</span>
          </label>
        </div>
        {criticalMode && (
          <div style={{
            marginTop: 10,
            padding: 8,
            background: "var(--color-danger-soft)",
            borderLeft: "3px solid var(--color-danger)",
            fontSize: 10.5,
            color: "var(--color-ink-2)",
            lineHeight: 1.5,
            borderRadius: "var(--radius-sm)",
          }}>
            Не-критические узлы и связи приглушены до 10% непрозрачности. Критический путь = подтверждённые процессы и результаты основного маршрута.
          </div>
        )}
      </div>

      <div className="lp-section">
        <h3 className="lp-h">Сводка</h3>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)", lineHeight: 1.7 }}>
          <div><b style={{ color: "var(--color-ink-2)" }}>{model.nodes.length}</b> узлов</div>
          <div><b style={{ color: "var(--color-ink-2)" }}>{model.edges.length}</b> внутри-этапных</div>
          <div><b style={{ color: "var(--color-ink-2)" }}>{model.crossEdges.length}</b> между этапами</div>
          <div><b style={{ color: "var(--color-ink-2)" }}>{model.npa.length}</b> НПА</div>
        </div>
      </div>

      {drawerOpen && (
        <div style={{ padding: 12, borderTop: "1px solid var(--color-line-soft)" }}>
          <button className="tool-btn" onClick={onClose} style={{ width: "100%" }}>Закрыть</button>
        </div>
      )}
    </aside>
  );
}

/* ---------- Inspector ---------- */
function Inspector({ selected, model, onSelectNode, mode, drawerOpen, onClose }) {
  if (!model) return null;
  if (!selected) {
    return (
      <aside className={`rp ${drawerOpen ? "drawer-open" : ""}`} aria-label="Инспектор">
        <div className="rp-empty">
          <div className="rp-empty-glyph">§</div>
          <div className="rp-empty-h">Выберите узел</div>
          <div className="rp-empty-p">
            Кликните на узел в схеме, чтобы увидеть входы, выходы, маршрут, НПА и provenance.
          </div>
          <div className="rp-empty-keys">
            <kbd>Click</kbd><span>Выбрать узел</span>
            <kbd>⌘K</kbd><span>Поиск</span>
            <kbd>Esc</kbd><span>Сбросить</span>
            <kbd>?</kbd><span>Помощь</span>
          </div>
        </div>
      </aside>
    );
  }

  const node = model.nodesById.get(selected);
  if (!node) return null;
  const stage = model.stages.find(s => s.id === node.stageId);

  // Inputs (incoming edges)
  const incoming = (model.edgesToNode.get(selected) || []).map(e => ({
    edge: e,
    other: model.nodesById.get(e.source),
  })).filter(x => x.other);

  // Outputs (outgoing edges)
  const outgoing = (model.edgesFromNode.get(selected) || []).map(e => ({
    edge: e,
    other: model.nodesById.get(e.target),
  })).filter(x => x.other);

  // Process group siblings
  const procGroup = node.process ? (model.processGroups[`${node.stageId}/${node.process}`] || null) : null;

  const typeLabel = NODE_TYPE_LABELS[node.type] || node.type;
  const trackLabel = TRACK_LABELS[node.track] || node.track;
  const trackColor = node.track === "okn" ? "var(--track-okn)" : node.track === "budget" ? "var(--track-budget)" : "var(--track-offbudget)";

  return (
    <aside className={`rp ${drawerOpen ? "drawer-open" : ""}`} aria-label="Инспектор">
      <div className="rp-head">
        <div className="rp-type">
          <span className="dot" style={{ background: trackColor }} />
          {typeLabel} · {trackLabel}
        </div>
        <h2 className="rp-title">{node.label}</h2>
        <div className="rp-sub">
          Этап <span className="proc-num">{node.stageNum}</span>
          {node.process && <> · процесс <span className="proc-num">{node.process}</span></>}
          {node.duration && <> · {node.duration}</>}
        </div>
        {mode === "auditor" && (
          <div className="rp-provenance" style={{ marginTop: 8, marginBottom: 0 }}>
            <div><b>id:</b> {node.id}</div>
            <div><b>source_file:</b> data/{node.stageId}.json</div>
            <div><b>coverage:</b> {node.coverage}</div>
          </div>
        )}
      </div>
      <div className="rp-body">
        {node.description && (
          <div className="rp-block">
            <div className="rp-block-h">Описание</div>
            <p className="rp-block-p">{node.description}</p>
          </div>
        )}

        <div className="rp-stats">
          <div>
            <div className="rp-stat-l">Этап</div>
            <div className="rp-stat-v">{node.stageNum}<small> / 5</small></div>
          </div>
          <div>
            <div className="rp-stat-l">Связей</div>
            <div className="rp-stat-v">{incoming.length + outgoing.length}</div>
          </div>
          {node.process && (
            <div>
              <div className="rp-stat-l">Процесс</div>
              <div className="rp-stat-v" style={{ fontSize: 14 }}>{node.process}</div>
            </div>
          )}
          {node.duration && (
            <div>
              <div className="rp-stat-l">Срок</div>
              <div className="rp-stat-v" style={{ fontSize: 14, color: "var(--color-warn)" }}>{node.duration}</div>
            </div>
          )}
        </div>

        {incoming.length > 0 && (
          <div className="rp-block">
            <div className="rp-block-h">Входящие · {incoming.length}</div>
            <ul className="rp-list">
              {incoming.map(({ edge, other }) => (
                <li key={edge.id} className="rp-li" onClick={() => onSelectNode(other.id)}>
                  <span className="rp-li-glyph">◀</span>
                  <span className="rp-li-ttl">{other.label}</span>
                  <span className="rp-li-meta">
                    {edge.crossStage ? `Э${other.stageNum}` : ""}
                    {edge.type === "conditional" ? " ?" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {outgoing.length > 0 && (
          <div className="rp-block">
            <div className="rp-block-h">Исходящие · {outgoing.length}</div>
            <ul className="rp-list">
              {outgoing.map(({ edge, other }) => (
                <li key={edge.id} className="rp-li" onClick={() => onSelectNode(other.id)}>
                  <span className="rp-li-glyph">▶</span>
                  <span className="rp-li-ttl">{other.label}</span>
                  <span className="rp-li-meta">
                    {edge.crossStage ? `Э${other.stageNum}` : ""}
                    {edge.type === "conditional" ? " ?" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {procGroup && procGroup.nodeIds.length > 1 && (
          <div className="rp-block">
            <div className="rp-block-h">Процесс {procGroup.process} · {procGroup.nodeIds.length} шагов</div>
            <ul className="rp-list">
              {procGroup.nodeIds.filter(id => id !== node.id).slice(0, 10).map(id => {
                const sib = model.nodesById.get(id);
                if (!sib) return null;
                return (
                  <li key={id} className="rp-li" onClick={() => onSelectNode(id)}>
                    <span className="rp-li-glyph">·</span>
                    <span className="rp-li-ttl">{sib.label}</span>
                    <span className="rp-li-meta">{NODE_TYPE_LABELS[sib.type]?.charAt(0)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="rp-block">
          <div className="rp-block-h">Контекст этапа</div>
          <div className="rp-li" onClick={() => {}}>
            <span className="rp-li-glyph">§</span>
            <span className="rp-li-ttl">{stage.name}</span>
            <span className="rp-li-meta">Э{stage.num}</span>
          </div>
        </div>

        {drawerOpen && (
          <button className="tool-btn" onClick={onClose} style={{ width: "100%", marginTop: 16 }}>Закрыть</button>
        )}
      </div>
    </aside>
  );
}

/* ---------- BottomBar ---------- */
function BottomBar({ mode, activeRoute, criticalMode, selected, model, onResetView, onFitAll }) {
  let breadcrumb = "ИСЦ Атлас";
  if (selected && model) {
    const n = model.nodesById.get(selected);
    if (n) breadcrumb = `ИСЦ / Этап ${n.stageNum} / ${n.label.substring(0, 60)}${n.label.length > 60 ? "…" : ""}`;
  }
  return (
    <footer className="bb">
      <div className="bb-section">
        <span>Режим:</span>
        <span className="v">{mode === "executive" ? "Executive" : mode === "auditor" ? "Auditor" : "Analyst"}</span>
      </div>
      <div className="bb-section">
        <span>Маршрут:</span>
        <span className="v">{TRACK_LABELS[activeRoute] || (activeRoute === "all" ? "Все" : activeRoute)}</span>
      </div>
      {criticalMode && (
        <div className="bb-section" style={{ color: "var(--color-danger)" }}>
          <span style={{ color: "currentColor" }}>● Критический путь</span>
        </div>
      )}
      <div className="bb-section" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{breadcrumb}</span>
      </div>
      <button className="bb-btn" onClick={onFitAll}>⛶ Fit</button>
      <button className="bb-btn" onClick={onResetView}>Сбросить</button>
    </footer>
  );
}

/* ---------- Validation Report Modal ---------- */
function ValidationModal({ validation, onClose }) {
  if (!validation) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23, 43, 85, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-panel)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-md)",
          padding: "24px 28px",
          minWidth: 420,
          maxWidth: 560,
          boxShadow: "var(--shadow-high)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--color-gold-deep)",
          marginBottom: 8,
        }}>
          Validation Report
        </div>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 600,
          margin: "0 0 16px",
          letterSpacing: "-0.005em",
        }}>
          Отчёт о валидации данных
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}>
          {Object.entries(validation.counts).map(([k, v]) => {
            const labels = {
              stages: "Этапов",
              nodes: "Узлов",
              edges: "Связей (внутри-этапных)",
              crossEdges: "Cross-stage связей",
              npa: "НПА в каталоге",
              danglingEdges: "Битых ссылок",
            };
            return (
              <div key={k} style={{
                padding: "10px 12px",
                background: k === "danglingEdges" && v > 0 ? "var(--color-danger-soft)" : "var(--color-panel-2)",
                border: `1px solid ${k === "danglingEdges" && v > 0 ? "var(--color-danger)" : "var(--color-line-soft)"}`,
                borderRadius: "var(--radius-sm)",
              }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 4 }}>
                  {labels[k] || k}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: k === "danglingEdges" && v > 0 ? "var(--color-danger)" : "var(--color-ink)", fontVariantNumeric: "tabular-nums" }}>
                  {v}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)", lineHeight: 1.6 }}>
          <div><b style={{ color: "var(--color-ink-2)" }}>Источник:</b> github.com/agisota/schema-isc/data/*.json</div>
          <div><b style={{ color: "var(--color-ink-2)" }}>Data version:</b> 2026-05-07</div>
          <div><b style={{ color: "var(--color-ink-2)" }}>Загрузка:</b> {validation.loadMs} мс</div>
          <div><b style={{ color: "var(--color-ink-2)" }}>Предупреждений:</b> {validation.warnings.length}</div>
        </div>

        {validation.warnings.length > 0 && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-2)" }}>
              Показать предупреждения ({validation.warnings.length})
            </summary>
            <div style={{
              marginTop: 8,
              maxHeight: 200,
              overflowY: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              background: "var(--color-panel-2)",
              padding: 8,
              borderRadius: 4,
            }}>
              {validation.warnings.slice(0, 50).map((w, i) => (
                <div key={i} style={{ marginBottom: 4, color: "var(--color-muted)" }}>
                  <b style={{ color: "var(--color-warn)" }}>{w.kind}</b>: {w.edge || w.id} {w.source && `(${w.source} → ${w.target})`}
                </div>
              ))}
            </div>
          </details>
        )}

        <button
          className="tool-btn"
          onClick={onClose}
          style={{ marginTop: 20, width: "100%" }}
        >Закрыть</button>
      </div>
    </div>
  );
}

export { TopBar, StageTabs, LeftRail, Inspector, BottomBar, ValidationModal };
