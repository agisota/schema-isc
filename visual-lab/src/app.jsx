/* ============================================================
   app.jsx — main composition: state, data loading, layout, render
   ============================================================ */

import React from "react";
import { createRoot } from "react-dom/client";
import * as htmlToImage from "html-to-image";
import "./styles.css";
import { layoutModel } from "./layout.jsx";
import { loadModel, relatedNodes } from "./data-loader.jsx";
import { StageBlock, CrossEdgesOverlay, ExecutiveOverview } from "./canvas.jsx";
import { MatrixView, ConstellationView } from "./views.jsx";
import { TopBar, StageTabs, LeftRail, Inspector, BottomBar, ValidationModal } from "./panels.jsx";

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useCallback: useCallbackA, useRef: useRefA } = React;

function App() {
  /* ----- Data state ----- */
  const [model, setModel] = useStateA(null);
  const [validation, setValidation] = useStateA(null);
  const [loadError, setLoadError] = useStateA(null);

  /* ----- UI state ----- */
  const [mode, setMode] = useStateA("analyst"); // executive | analyst | auditor
  const [view, setView] = useStateA("timeline"); // timeline | matrix | constellation
  const [theme, setTheme] = useStateA(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark" : "light"
  );
  const [selected, setSelected] = useStateA(null);
  const [activeRoute, setActiveRoute] = useStateA("all");
  const [visibleTypes, setVisibleTypes] = useStateA(new Set(["process", "result", "auxiliary", "alternative", "condition", "document", "documentList", "group"]));
  const [criticalMode, setCriticalMode] = useStateA(false);
  const [usesLaterVisible, setUsesLaterVisible] = useStateA(false);
  const [activeStage, setActiveStage] = useStateA("stage1");
  const [collapsedStages, setCollapsedStages] = useStateA(new Set());
  const [query, setQuery] = useStateA("");
  const [searchOpen, setSearchOpen] = useStateA(false);
  const [toast, setToast] = useStateA(null);
  const [validationOpen, setValidationOpen] = useStateA(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = useStateA(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useStateA(false);
  const [isMobile, setIsMobile] = useStateA(false);
  const [exporting, setExporting] = useStateA(false);

  const wrapRef = useRefA(null);

  /* ----- Load data on mount ----- */
  useEffectA(() => {
    loadModel().then(({ model, validation }) => {
      if (!model) {
        setLoadError(validation.errors.map(e => e.message).join("; "));
      } else {
        setModel(model);
      }
      setValidation(validation);
    }).catch(e => {
      setLoadError(e.message);
    });
  }, []);

  /* ----- URL state sync ----- */
  useEffectA(() => {
    if (!model) return;
    const p = new URLSearchParams(window.location.hash.slice(1));
    if (p.get("mode")) setMode(p.get("mode"));
    if (p.get("view")) setView(p.get("view"));
    if (p.get("stage")) setActiveStage(p.get("stage"));
    if (p.get("node")) setSelected(p.get("node"));
    if (p.get("route")) setActiveRoute(p.get("route"));
    if (p.get("crit") === "1") setCriticalMode(true);
  }, [model]);

  useEffectA(() => {
    if (!model) return;
    const p = new URLSearchParams();
    if (mode !== "analyst") p.set("mode", mode);
    if (view !== "timeline") p.set("view", view);
    if (activeStage !== "stage1") p.set("stage", activeStage);
    if (selected) p.set("node", selected);
    if (activeRoute !== "all") p.set("route", activeRoute);
    if (criticalMode) p.set("crit", "1");
    const hash = p.toString();
    window.history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname);
  }, [model, mode, view, activeStage, selected, activeRoute, criticalMode]);

  /* ----- Apply theme to <html> ----- */
  useEffectA(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  /* ----- Responsive ----- */
  useEffectA(() => {
    function check() { setIsMobile(window.innerWidth < 900); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ----- Layout (memoized) ----- */
  const layout = useMemoA(() => {
    if (!model) return null;
    return layoutModel(model, mode, collapsedStages);
  }, [model, mode, collapsedStages]);

  /* ----- Per-stage layouts ----- */
  const stageLayouts = useMemoA(() => {
    if (!layout) return {};
    const m = {};
    layout.stages.forEach(s => { m[s.stageId] = s; });
    return m;
  }, [layout]);

  /* ----- Critical set & highlight set ----- */
  const criticalSet = useMemoA(() => {
    if (!model) return new Set();
    return new Set(model.nodes.filter(n => n.critical).map(n => n.id));
  }, [model]);

  const { highlightSet, dimSet } = useMemoA(() => {
    if (!model || !selected) return { highlightSet: new Set(), dimSet: null };
    const related = relatedNodes(model, selected, 2);
    return { highlightSet: related.nodeIds, dimSet: null };
  }, [model, selected]);

  /* ----- Route + type filter ----- */
  const filteredNodeIds = useMemoA(() => {
    if (!model) return new Set();
    const out = new Set();
    model.nodes.forEach(n => {
      if (activeRoute !== "all" && n.track !== activeRoute) return;
      if (!visibleTypes.has(n.type)) return;
      out.add(n.id);
    });
    return out;
  }, [model, activeRoute, visibleTypes]);

  /* ----- Combined dim set: filtered-out nodes ----- */
  const finalDimSet = useMemoA(() => {
    if (!model) return new Set();
    const out = new Set();
    model.nodes.forEach(n => {
      if (!filteredNodeIds.has(n.id)) out.add(n.id);
    });
    return out;
  }, [model, filteredNodeIds]);

  /* ----- Filtered edges ----- */
  const filteredEdges = useMemoA(() => {
    if (!model) return [];
    return model.edges.filter(e => {
      const src = model.nodesById.get(e.source);
      const tgt = model.nodesById.get(e.target);
      if (!src || !tgt) return false;
      if (activeRoute !== "all" && (src.track !== activeRoute && tgt.track !== activeRoute)) return false;
      return true;
    });
  }, [model, activeRoute]);

  /* ----- Toggles ----- */
  function toggleType(t) {
    setVisibleTypes(prev => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }
  function toggleCollapse(stageId) {
    setCollapsedStages(prev => {
      const n = new Set(prev);
      n.has(stageId) ? n.delete(stageId) : n.add(stageId);
      return n;
    });
  }

  /* ----- Stage jump ----- */
  function jumpToStage(stageId) {
    setActiveStage(stageId);
    setLeftDrawerOpen(false);
    if (mode === "executive") setMode("analyst");
    if (stageId === "all") {
      const wrap = wrapRef.current;
      if (wrap) wrap.scrollTop = 0;
      return;
    }
    // Scroll to stage in wrapper — use raw scrollTop for reliability
    setTimeout(() => {
      const el = document.querySelector(`[data-stage-id="${stageId}"]`);
      if (el && wrapRef.current) {
        const wrap = wrapRef.current;
        const top = el.offsetTop - 8;
        try {
          wrap.scrollTo({ top, behavior: "smooth" });
        } catch (e) {
          wrap.scrollTop = top;
        }
      }
    }, 60);
  }

  /* ----- Node selection ----- */
  function selectNode(id) {
    setSelected(id);
    if (isMobile) setRightDrawerOpen(true);
    const n = model?.nodesById.get(id);
    if (n) {
      setActiveStage(n.stageId);
      if (collapsedStages.has(n.stageId)) {
        setCollapsedStages(prev => {
          const ns = new Set(prev);
          ns.delete(n.stageId);
          return ns;
        });
      }
      setTimeout(() => {
        const el = document.querySelector(`[data-stage-id="${n.stageId}"]`);
        if (el && wrapRef.current) {
          const wrap = wrapRef.current;
          try {
            wrap.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
          } catch (e) {
            wrap.scrollTop = el.offsetTop - 8;
          }
        }
      }, 60);
    }
  }

  /* ----- Reset / fit ----- */
  function resetView() {
    setSelected(null);
    setQuery("");
    setActiveRoute("all");
    setCriticalMode(false);
    setUsesLaterVisible(false);
    setActiveStage("stage1");
  }
  function fitAll() {
    setActiveStage("all");
    const wrap = wrapRef.current;
    if (wrap) wrap.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ----- Keyboard ----- */
  useEffectA(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "Escape") {
        setSelected(null);
        setSearchOpen(false);
        setLeftDrawerOpen(false);
        setRightDrawerOpen(false);
        setValidationOpen(false);
      }
      if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        setCriticalMode(v => !v);
      }
      if (e.key === "?" || e.key === "/") {
        // Help — not implemented yet
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ----- Export PNG ----- */
  async function exportPng() {
    setToast("Готовлю экспорт…");
    setExporting(true);
    await new Promise(r => setTimeout(r, 100));
    try {
      if (!htmlToImage) {
        setToast("Библиотека html-to-image не загрузилась");
        setExporting(false);
        return;
      }
      const target = wrapRef.current?.querySelector(".cv-scroller");
      if (!target) {
        setToast("Не нашёл canvas для экспорта");
        setExporting(false);
        return;
      }
      const dataUrl = await htmlToImage.toPng(target, {
        pixelRatio: 2,
        backgroundColor: "#f7f3ea",
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `isc-atlas-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      setToast(`Экспорт готов · ${(dataUrl.length / 1024 / 1024).toFixed(1)} МБ`);
    } catch (e) {
      console.error(e);
      setToast("Ошибка экспорта: " + e.message);
    } finally {
      setExporting(false);
      setTimeout(() => setToast(null), 2400);
    }
  }

  /* ----- Toast cleanup ----- */
  useEffectA(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  /* ----- Loading state ----- */
  if (loadError) {
    return (
      <div className="loading">
        <div className="glyph" style={{ color: "var(--color-danger)" }}>!</div>
        <div className="lbl" style={{ color: "var(--color-danger)" }}>Ошибка загрузки</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)", maxWidth: 400, textAlign: "center", padding: "0 20px" }}>
          {loadError}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted)", marginTop: 12 }}>
          Проверьте, что страница открыта по http(s)://, а не file://
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="loading">
        <div className="glyph">ИСЦ</div>
        <div className="lbl">Загрузка данных…</div>
        <div className="bar" />
      </div>
    );
  }

  /* ----- Render ----- */
  return (
    <div className={`app mode-${mode} ${exporting ? "exporting" : ""}`}>
      <TopBar
        model={model}
        mode={mode}
        setMode={setMode}
        view={view}
        setView={setView}
        theme={theme}
        setTheme={setTheme}
        query={query}
        setQuery={setQuery}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        onSelectNode={selectNode}
        validation={validation}
        onExport={exportPng}
        onShowValidation={() => setValidationOpen(true)}
        onToggleLeftDrawer={() => setLeftDrawerOpen(v => !v)}
        onToggleRightDrawer={() => setRightDrawerOpen(v => !v)}
        isMobile={isMobile}
      />
      <StageTabs
        model={model}
        activeStage={activeStage}
        onJumpToStage={jumpToStage}
        collapsedStages={collapsedStages}
        criticalMode={criticalMode}
      />
      <div className="main">
        <LeftRail
          model={model}
          activeRoute={activeRoute}
          setRoute={setActiveRoute}
          visibleTypes={visibleTypes}
          toggleType={toggleType}
          criticalMode={criticalMode}
          setCriticalMode={setCriticalMode}
          usesLaterVisible={usesLaterVisible}
          setUsesLaterVisible={setUsesLaterVisible}
          drawerOpen={leftDrawerOpen}
          onClose={() => setLeftDrawerOpen(false)}
        />

        <div className="cv-host">
          {mode === "executive" ? (
            <div className="cv-wrap" ref={wrapRef} style={{ overflowX: "hidden" }}>
              <ExecutiveOverview model={model} onJumpToStage={jumpToStage} />
            </div>
          ) : view === "matrix" ? (
            <div className="cv-wrap" ref={wrapRef} style={{ overflowX: "hidden" }}>
              <MatrixView
                model={model}
                onJumpToStage={jumpToStage}
                onSelectMode={(m) => { setMode(m); setView("timeline"); }}
                activeRoute={activeRoute}
              />
            </div>
          ) : view === "constellation" ? (
            <div className="cv-wrap" ref={wrapRef} style={{ overflowX: "hidden" }}>
              <ConstellationView
                model={model}
                selected={selected}
                onSelectNode={selectNode}
                activeRoute={activeRoute}
                criticalSet={criticalSet}
                criticalMode={criticalMode}
              />
            </div>
          ) : (
            <div className="cv-wrap" ref={wrapRef} onClick={(e) => {
              if (e.target.closest(".node") || e.target.closest(".rp-li") || e.target.closest(".search")) return;
              setSelected(null);
              setSearchOpen(false);
            }}>
              <div
                className="cv-scroller"
                style={{
                  width: layout?.width || "100%",
                  minHeight: layout?.totalHeight || "100%",
                }}
              >
                {model.stages.map(s => {
                  const sLayout = stageLayouts[s.id];
                  if (!sLayout) return null;
                  return (
                    <StageBlock
                      key={s.id}
                      stage={s}
                      layoutData={sLayout}
                      model={model}
                      selected={selected}
                      highlightSet={highlightSet}
                      dimSet={finalDimSet}
                      criticalSet={criticalSet}
                      criticalMode={criticalMode}
                      mode={mode}
                      onSelectNode={selectNode}
                      onToggleCollapse={toggleCollapse}
                      collapsed={collapsedStages.has(s.id)}
                      focused={activeStage === s.id}
                      edges={filteredEdges}
                      usesLaterVisible={usesLaterVisible}
                      onJumpToStage={jumpToStage}
                    />
                  );
                })}

                {usesLaterVisible && layout && (
                  <CrossEdgesOverlay
                    model={model}
                    layout={layout}
                    highlightSet={highlightSet}
                    criticalMode={criticalMode}
                    criticalSet={criticalSet}
                  />
                )}
              </div>
            </div>
          )}
          {toast && <div className="toast">{toast}</div>}
        </div>

        <Inspector
          selected={selected}
          model={model}
          onSelectNode={selectNode}
          mode={mode}
          drawerOpen={rightDrawerOpen}
          onClose={() => setRightDrawerOpen(false)}
        />
      </div>
      <BottomBar
        mode={mode}
        activeRoute={activeRoute}
        criticalMode={criticalMode}
        selected={selected}
        model={model}
        onResetView={resetView}
        onFitAll={fitAll}
      />

      {validationOpen && (
        <ValidationModal validation={validation} onClose={() => setValidationOpen(false)} />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
