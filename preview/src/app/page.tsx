'use client';

import dynamic from 'next/dynamic';
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useId,
  type CSSProperties,
  type ReactNode,
} from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ── Types ────────────────────────────────────────────────────────────────────

type Frequency = 'daily' | 'weekly' | 'monthly';
type EmailType = 'normal' | 'warning' | 'disabled';
type Tab = 'form' | 'json' | 'jsx';

interface ExceededWindow {
  window: '24h' | '7d' | '30d';
  count: number;
  threshold: number;
}

interface DocumentEntry {
  id: string;
  title: string;
  url: string;
}

interface Counts {
  last24h: number;
  last7d: number;
  last30d: number;
}

interface PreviewState {
  title: string;
  totalHits: number;
  frequency: Frequency;
  emailType: EmailType;
  effectiveFailureCount: number;
  exceededWindows: ExceededWindow[];
  viewResultsUrl: string;
  notificationSettingsUrl: string;
  linksEnabled: boolean;
  documents: DocumentEntry[];
  countsEnabled: boolean;
  counts: Counts;
  userGuideUrl: string;
  feedbackEmail: string;
}

// ── Registries ───────────────────────────────────────────────────────────────

const TEMPLATE_NAMES = ['NotificationEmail'] as const;
type TemplateName = (typeof TEMPLATE_NAMES)[number];

const TEMPLATE_DEFAULTS: Record<TemplateName, PreviewState> = {
  NotificationEmail: {
    title: 'My Saved Search Alert',
    totalHits: 42,
    frequency: 'daily',
    emailType: 'normal',
    effectiveFailureCount: 0,
    exceededWindows: [],
    viewResultsUrl: 'https://example.com/results',
    notificationSettingsUrl: 'https://example.com/settings/notifications',
    linksEnabled: true,
    documents: [
      { id: 'd1', title: 'Example Document One', url: 'https://example.com/doc/1' },
      { id: 'd2', title: 'Example Document Two', url: 'https://example.com/doc/2' },
    ],
    countsEnabled: true,
    counts: { last24h: 5, last7d: 28, last30d: 120 },
    userGuideUrl: 'https://example.com/user-guide',
    feedbackEmail: 'feedback@example.com',
  },
};

const JSX_FILES = [
  { key: 'NotificationEmail', label: 'NotificationEmail.tsx' },
  { key: 'ResultsSummary', label: 'components/ResultsSummary.tsx' },
  { key: 'CountsTable', label: 'components/CountsTable.tsx' },
  { key: 'DocumentLinks', label: 'components/DocumentLinks.tsx' },
  { key: 'WarningBanner', label: 'components/WarningBanner.tsx' },
  { key: 'DisabledNotice', label: 'components/DisabledNotice.tsx' },
] as const;

// ── Main component ───────────────────────────────────────────────────────────

export default function PreviewPage() {
  const [template, setTemplate] = useState<TemplateName>('NotificationEmail');
  const [formState, setFormState] = useState<PreviewState>(TEMPLATE_DEFAULTS.NotificationEmail);
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [renderTick, setRenderTick] = useState(0);

  // JSON tab
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState('');

  // JSX tab — sources cached per file key
  const [jsxSources, setJsxSources] = useState<Record<string, string>>({});
  const [activeJsxFile, setActiveJsxFile] = useState('NotificationEmail');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'verifying' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  // Tracks files already fetched to prevent duplicate requests on rapid tab switching.
  const loadedJsxFiles = useRef(new Set<string>());
  // Tracks what is actually on disk for each file — used as the revert target if a save fails.
  const jsxOriginalsRef = useRef<Record<string, string>>({});

  // Resizable pane — undefined means 50%
  const [leftWidth, setLeftWidth] = useState<number | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHover, setDragHover] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const uid = useId();

  // Re-render on prop/template change
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, props: formState }),
      })
        .then((r) => r.text())
        .then((h) => {
          if (!cancelled) { setHtml(h); setLoading(false); }
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    }, 150);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [formState, template, renderTick]);

  // Load JSX source when JSX tab is active
  useEffect(() => {
    if (activeTab !== 'jsx') return;
    if (loadedJsxFiles.current.has(activeJsxFile)) return;
    loadedJsxFiles.current.add(activeJsxFile);

    fetch(`/api/source?file=${activeJsxFile}`)
      .then((r) => r.text())
      .then((src) => {
        setJsxSources((prev) => ({ ...prev, [activeJsxFile]: src }));
        jsxOriginalsRef.current[activeJsxFile] = src;
      })
      .catch(() => {
        loadedJsxFiles.current.delete(activeJsxFile);
        setJsxSources((prev) => ({ ...prev, [activeJsxFile]: '// Failed to load source' }));
      });
  }, [activeTab, activeJsxFile]);

  const switchTab = useCallback((tab: Tab) => {
    if (tab === 'json') {
      setJsonDraft(JSON.stringify(formState, null, 2));
      setJsonError('');
    }
    setActiveTab(tab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);

  const switchTemplate = useCallback((t: TemplateName) => {
    setTemplate(t);
    setFormState(TEMPLATE_DEFAULTS[t]);
    loadedJsxFiles.current.clear();
    setJsxSources({});
  }, []);

  const applyJson = useCallback(() => {
    try {
      setFormState(JSON.parse(jsonDraft) as PreviewState);
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON — check syntax and try again');
    }
  }, [jsonDraft]);

  /**
   * Saves the current editor content to disk, waits for Next.js HMR to reload
   * the module, then does a test render. If the render fails (HTTP 5xx) the
   * original source is restored to disk and in the editor — no broken file is
   * left behind. On success the iframe is updated directly without a second
   * render cycle.
   */
  const saveJsx = useCallback(async () => {
    const source = jsxSources[activeJsxFile];
    if (!source) return;
    const original = jsxOriginalsRef.current[activeJsxFile] ?? source;
    const currentTemplate = template;
    const currentProps = formState;

    setSaveStatus('saving');
    setSaveError('');

    await fetch('/api/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: activeJsxFile, source }),
    });

    setSaveStatus('verifying');
    await new Promise<void>((res) => setTimeout(res, 2000));

    const renderRes = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: currentTemplate, props: currentProps }),
    });

    if (!renderRes.ok) {
      await fetch('/api/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: activeJsxFile, source: original }),
      });
      setJsxSources((prev) => ({ ...prev, [activeJsxFile]: original }));
      setSaveError('Render failed — changes were reverted');
      setSaveStatus('error');
      setTimeout(() => { setSaveStatus('idle'); setSaveError(''); }, 5000);
    } else {
      const newHtml = await renderRes.text();
      setHtml(newHtml);
      jsxOriginalsRef.current[activeJsxFile] = source;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [activeJsxFile, jsxSources, template, formState]);

  // Drag-to-resize
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const onMove = (ev: MouseEvent) => {
      if (!bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      setLeftWidth(Math.max(300, Math.min(ev.clientX - rect.left, rect.width - 300)));
    };
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // Form callbacks
  const set = useCallback(<K extends keyof PreviewState>(key: K, value: PreviewState[K]) => {
    setFormState((s) => ({ ...s, [key]: value }));
  }, []);

  const addDocument = useCallback(() => {
    setFormState((s) => ({
      ...s,
      documents: [...s.documents, { id: String(Date.now()), title: '', url: '' }],
    }));
  }, []);

  const updateDocument = useCallback((idx: number, field: 'title' | 'url', value: string) => {
    setFormState((s) => ({
      ...s,
      documents: s.documents.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    }));
  }, []);

  const removeDocument = useCallback((idx: number) => {
    setFormState((s) => ({ ...s, documents: s.documents.filter((_, i) => i !== idx) }));
  }, []);

  const addWindow = useCallback(() => {
    setFormState((s) => ({
      ...s,
      exceededWindows: [...s.exceededWindows, { window: '24h', count: 150, threshold: 100 }],
    }));
  }, []);

  const updateWindow = useCallback((idx: number, field: keyof ExceededWindow, raw: string) => {
    setFormState((s) => ({
      ...s,
      exceededWindows: s.exceededWindows.map((w, i): ExceededWindow => {
        if (i !== idx) return w;
        if (field === 'window') return { ...w, window: raw as ExceededWindow['window'] };
        if (field === 'count') return { ...w, count: parseInt(raw, 10) || 0 };
        return { ...w, threshold: parseInt(raw, 10) || 0 };
      }),
    }));
  }, []);

  const removeWindow = useCallback((idx: number) => {
    setFormState((s) => ({ ...s, exceededWindows: s.exceededWindows.filter((_, i) => i !== idx) }));
  }, []);

  const showWarningFields = formState.emailType !== 'normal';
  const currentJsxSource = jsxSources[activeJsxFile];
  const jsxLoaded = currentJsxSource !== undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13 }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 44, borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginRight: 4 }}>Email Preview</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Template</span>
          <select style={{ ...input, padding: '3px 6px', fontSize: 12 }} value={template} onChange={(e) => { switchTemplate(e.target.value as TemplateName); }}>
            {TEMPLATE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button
          style={{ ...tabBtn, ...(darkMode ? tabBtnActive : {}), marginRight: 8 }}
          onClick={() => { setDarkMode((d) => !d); }}
          title="Toggle dark/light preview"
        >
          {darkMode ? 'LIGHT' : 'DARK'}
        </button>
        <div style={{ display: 'flex', gap: 2 }}>
          {(['form', 'json', 'jsx'] as Tab[]).map((t) => (
            <button key={t} style={{ ...tabBtn, ...(activeTab === t ? tabBtnActive : {}) }} onClick={() => { switchTab(t); }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div ref={bodyRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', userSelect: isDragging ? 'none' : undefined }}>

        {/* ── Left panel ── */}
        <div style={{ width: leftWidth ?? '50%', minWidth: 300, display: 'flex', flexDirection: 'column', background: '#f9fafb', overflow: 'hidden', flexShrink: 0 }}>

          {/* FORM TAB */}
          {activeTab === 'form' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Card title="Content">
                <Field label="Title" id={`${uid}title`}>
                  <input style={input} value={formState.title} onChange={(e) => { set('title', e.target.value); }} />
                </Field>
                <Row>
                  <Field label="Total hits" id={`${uid}hits`}>
                    <input style={input} type="number" min={0} value={formState.totalHits} onChange={(e) => { set('totalHits', parseInt(e.target.value, 10) || 0); }} />
                  </Field>
                  <Field label="Frequency" id={`${uid}freq`}>
                    <select style={input} value={formState.frequency} onChange={(e) => { set('frequency', e.target.value as Frequency); }}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </Field>
                </Row>
                <Field label="View results URL" id={`${uid}vru`}>
                  <input style={input} value={formState.viewResultsUrl} onChange={(e) => { set('viewResultsUrl', e.target.value); }} />
                </Field>
              </Card>

              <Card title="Email Type">
                <Field label="Type" id={`${uid}type`}>
                  <select style={input} value={formState.emailType} onChange={(e) => { set('emailType', e.target.value as EmailType); }}>
                    <option value="normal">Normal</option>
                    <option value="warning">Warning (strike 1–2)</option>
                    <option value="disabled">Disabled (strike 3)</option>
                  </select>
                </Field>
                {showWarningFields && (
                  <>
                    <Field label="Strike count" id={`${uid}fc`}>
                      <input style={input} type="number" min={1} max={3} value={formState.effectiveFailureCount} onChange={(e) => { set('effectiveFailureCount', parseInt(e.target.value, 10) || 1); }} />
                    </Field>
                    <div>
                      <div style={labelStyle}>Exceeded windows</div>
                      {formState.exceededWindows.map((w, i) => (
                        <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                          <select style={{ ...input, flex: '0 0 60px' }} value={w.window} onChange={(e) => { updateWindow(i, 'window', e.target.value); }}>
                            <option value="24h">24h</option>
                            <option value="7d">7d</option>
                            <option value="30d">30d</option>
                          </select>
                          <input style={{ ...input, flex: 1 }} type="number" placeholder="Count" value={w.count} onChange={(e) => { updateWindow(i, 'count', e.target.value); }} />
                          <input style={{ ...input, flex: 1 }} type="number" placeholder="Limit" value={w.threshold} onChange={(e) => { updateWindow(i, 'threshold', e.target.value); }} />
                          <button style={iconBtn} onClick={() => { removeWindow(i); }}>×</button>
                        </div>
                      ))}
                      <button style={addBtn} onClick={addWindow}>+ Add window</button>
                    </div>
                  </>
                )}
              </Card>

              <Card title="Result Counts">
                <Toggle label="Show counts section" checked={formState.countsEnabled} onChange={(v) => { set('countsEnabled', v); }} />
                {formState.countsEnabled && (
                  <Row>
                    <Field label="Last 24h" id={`${uid}c24`}>
                      <input style={input} type="number" min={0} value={formState.counts.last24h} onChange={(e) => { set('counts', { ...formState.counts, last24h: parseInt(e.target.value, 10) || 0 }); }} />
                    </Field>
                    <Field label="Last 7d" id={`${uid}c7`}>
                      <input style={input} type="number" min={0} value={formState.counts.last7d} onChange={(e) => { set('counts', { ...formState.counts, last7d: parseInt(e.target.value, 10) || 0 }); }} />
                    </Field>
                    <Field label="Last 30d" id={`${uid}c30`}>
                      <input style={input} type="number" min={0} value={formState.counts.last30d} onChange={(e) => { set('counts', { ...formState.counts, last30d: parseInt(e.target.value, 10) || 0 }); }} />
                    </Field>
                  </Row>
                )}
              </Card>

              <Card title="Document Links">
                <Toggle label="Show links section" checked={formState.linksEnabled} onChange={(v) => { set('linksEnabled', v); }} />
                {formState.linksEnabled && (
                  <div>
                    {formState.documents.map((doc, i) => (
                      <div key={doc.id} style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                          <input style={{ ...input, flex: 1 }} placeholder="Document title" value={doc.title} onChange={(e) => { updateDocument(i, 'title', e.target.value); }} />
                          <button style={iconBtn} onClick={() => { removeDocument(i); }}>×</button>
                        </div>
                        <input style={{ ...input, width: '100%', boxSizing: 'border-box' }} placeholder="https://..." value={doc.url} onChange={(e) => { updateDocument(i, 'url', e.target.value); }} />
                      </div>
                    ))}
                    <button style={addBtn} onClick={addDocument}>+ Add document</button>
                  </div>
                )}
              </Card>

              <Card title="Notification Settings">
                <Field label="Settings URL" id={`${uid}su`}>
                  <input style={input} value={formState.notificationSettingsUrl} onChange={(e) => { set('notificationSettingsUrl', e.target.value); }} />
                </Field>
              </Card>

              <Card title="Footer Links">
                <Field label="User Guide URL" id={`${uid}ug`}>
                  <input style={input} value={formState.userGuideUrl} onChange={(e) => { set('userGuideUrl', e.target.value); }} />
                </Field>
                <Field label="Feedback email" id={`${uid}fe`}>
                  <input style={input} placeholder="feedback@example.com" value={formState.feedbackEmail} onChange={(e) => { set('feedbackEmail', e.target.value); }} />
                </Field>
              </Card>
            </div>
          )}

          {/* JSON TAB */}
          {activeTab === 'json' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, gap: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>Edit props as JSON, then Apply</span>
                <button style={primaryBtn} onClick={applyJson}>Apply</button>
              </div>
              {jsonError && (
                <div style={{ fontSize: 11, color: '#dc2626', padding: '4px 8px', background: '#fef2f2', borderRadius: 4 }}>
                  {jsonError}
                </div>
              )}
              <textarea
                style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, padding: 8, resize: 'none', outline: 'none', lineHeight: 1.5 }}
                value={jsonDraft}
                onChange={(e) => { setJsonDraft(e.target.value); setJsonError(''); }}
                spellCheck={false}
              />
            </div>
          )}

          {/* JSX TAB */}
          {activeTab === 'jsx' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                <select
                  style={{ ...input, fontSize: 11, padding: '2px 6px', flex: 1 }}
                  value={activeJsxFile}
                  onChange={(e) => { setActiveJsxFile(e.target.value); }}
                >
                  {JSX_FILES.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
                {saveStatus === 'saved' && (
                  <span style={{ fontSize: 11, color: '#16a34a', whiteSpace: 'nowrap' }}>Saved</span>
                )}
                {saveStatus === 'verifying' && (
                  <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>Verifying…</span>
                )}
                {saveError && (
                  <span style={{ fontSize: 11, color: '#dc2626', whiteSpace: 'nowrap' }}>{saveError}</span>
                )}
                <button
                  style={{ ...primaryBtn, opacity: saveStatus !== 'idle' || !jsxLoaded ? 0.6 : 1, flexShrink: 0 }}
                  disabled={saveStatus !== 'idle' || !jsxLoaded}
                  onClick={() => { void saveJsx(); }}
                >
                  {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'verifying' ? 'Verifying…' : 'Save'}
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {jsxLoaded ? (
                  <MonacoEditor
                    height="100%"
                    language="typescriptreact"
                    value={currentJsxSource}
                    onChange={(v) => { setJsxSources((prev) => ({ ...prev, [activeJsxFile]: v ?? '' })); }}
                    theme="vs"
                    options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'off', tabSize: 2 }}
                  />
                ) : (
                  <div style={{ padding: 24, color: '#9ca3af', fontSize: 12 }}>Loading source…</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Drag handle ── */}
        <div
          style={{ width: 6, flexShrink: 0, cursor: 'col-resize', background: isDragging ? '#3b82f6' : dragHover ? '#d1d5db' : 'transparent', borderLeft: '1px solid #e5e7eb', transition: 'background 0.1s' }}
          onMouseDown={startDrag}
          onMouseEnter={() => { setDragHover(true); }}
          onMouseLeave={() => { setDragHover(false); }}
        />

        {/* ── Right panel: preview ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#d1d5db', overflow: 'hidden', minWidth: 300 }}>
          <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Live preview</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,.15)', overflow: 'hidden' }}>
              <iframe
                srcDoc={html || '<div style="padding:48px;text-align:center;color:#9ca3af;font-family:system-ui">Loading…</div>'}
                style={{ width: '100%', height: 720, border: 'none', display: 'block', pointerEvents: isDragging ? 'none' : 'auto', filter: darkMode ? 'invert(1) hue-rotate(180deg)' : undefined }}
                title="Email preview"
              />
              {loading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(249,250,251,0.8)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Rendering…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Internal components ──────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 8 }}>{children}</div>;
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
      <input type="checkbox" checked={checked} onChange={(e) => { onChange(e.target.checked); }} style={{ width: 14, height: 14, margin: 0 }} />
      <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
    </label>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const input: CSSProperties = {
  width: '100%', padding: '4px 7px', border: '1px solid #d1d5db', borderRadius: 4,
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 3,
};

const addBtn: CSSProperties = {
  fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2,
};

const iconBtn: CSSProperties = {
  width: 26, height: 28, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff',
  cursor: 'pointer', fontSize: 15, color: '#9ca3af', padding: 0, flexShrink: 0, lineHeight: 1,
};

const primaryBtn: CSSProperties = {
  padding: '4px 12px', background: '#2563eb', color: '#fff', border: 'none',
  borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
};

const tabBtn: CSSProperties = {
  padding: '4px 10px', fontSize: 11, fontWeight: 500, border: '1px solid #e5e7eb',
  borderRadius: 4, background: '#fff', color: '#6b7280', cursor: 'pointer', letterSpacing: '0.04em',
};

const tabBtnActive: CSSProperties = {
  background: '#111827', color: '#fff', borderColor: '#111827',
};
