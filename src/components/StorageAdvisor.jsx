import { useState } from "react";
import { analyzeStorageEngine } from "../utils/playbookGenerator";

function ScoreBar({ label, score, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}/100</span>
      </div>
      <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function SliderField({ label, min, max, value, onChange, unit = "%", description }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{label}</label>
        <span style={{ fontSize: 12, color: "#1565c0", fontWeight: 700 }}>{value}{unit}</span>
      </div>
      {description && <div style={{ fontSize: 11, color: "#888", marginBottom: 6, lineHeight: 1.4 }}>{description}</div>}
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#1565c0" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#bbb" }}>{min}{unit}</span>
        <span style={{ fontSize: 10, color: "#bbb" }}>{max}{unit}</span>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, description }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#333", display: "block", marginBottom: 4 }}>{label}</label>
      {description && <div style={{ fontSize: 11, color: "#888", marginBottom: 6, lineHeight: 1.4 }}>{description}</div>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", fontSize: 12, border: "1px solid #ddd", borderRadius: 7, padding: "8px 10px", background: "#fafafa" }}
      >
        {options.map(({ value: v, label: l }) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export default function StorageAdvisor() {
  const [profile, setProfile] = useState({
    readWriteRatio: 60,
    dataSize: "medium",
    updatePattern: "random",
    latencyReq: "low",
    consistencyReq: "strong",
    workloadType: "oltp",
  });
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const update = (key) => (val) => setProfile(p => ({ ...p, [key]: val }));

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 800));
    setResult(analyzeStorageEngine(profile));
    setAnalyzing(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, height: "100%" }}>
      {/* Profile Config */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 20px", overflowY: "auto" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#212121", marginBottom: 16 }}>Workload Profile</div>

        <SliderField
          label="Read/Write Ratio"
          min={0} max={100} value={profile.readWriteRatio}
          onChange={update("readWriteRatio")} unit="% reads"
          description="What percent of operations are reads vs writes?"
        />

        <SelectField
          label="Workload Type"
          value={profile.workloadType}
          onChange={update("workloadType")}
          description="What best describes your primary use case?"
          options={[
            { value: "oltp", label: "OLTP — transactional (e-commerce, banking)" },
            { value: "analytics", label: "Analytics — heavy range scans, aggregations" },
            { value: "timeseries", label: "Time-series — IoT, metrics, monitoring" },
            { value: "logs", label: "Log storage — append-heavy, high ingest" },
            { value: "cache", label: "Cache — high QPS, short TTL" },
            { value: "search", label: "Full-text search — inverted index heavy" },
          ]}
        />

        <SelectField
          label="Update Pattern"
          value={profile.updatePattern}
          onChange={update("updatePattern")}
          description="How does data change over its lifetime?"
          options={[
            { value: "random", label: "Random updates — frequent in-place mutations" },
            { value: "append", label: "Append-only — new records, no updates" },
            { value: "bulk", label: "Bulk loads — periodic large imports" },
            { value: "delete_heavy", label: "Delete-heavy — frequent deletes / TTL expiry" },
          ]}
        />

        <SelectField
          label="Dataset Size"
          value={profile.dataSize}
          onChange={update("dataSize")}
          options={[
            { value: "small", label: "Small — under 10GB" },
            { value: "medium", label: "Medium — 10GB to 1TB" },
            { value: "large", label: "Large — 1TB to 100TB" },
            { value: "xlarge", label: "X-Large — 100TB+" },
          ]}
        />

        <SelectField
          label="Latency Requirement"
          value={profile.latencyReq}
          onChange={update("latencyReq")}
          options={[
            { value: "ultra-low", label: "Ultra-low — p99 < 1ms" },
            { value: "low", label: "Low — p99 < 10ms" },
            { value: "medium", label: "Medium — p99 < 100ms" },
            { value: "relaxed", label: "Relaxed — p99 < 1s acceptable" },
          ]}
        />

        <SelectField
          label="Consistency Requirement"
          value={profile.consistencyReq}
          onChange={update("consistencyReq")}
          options={[
            { value: "strong", label: "Strong — ACID, no stale reads" },
            { value: "eventual", label: "Eventual — BASE, slight staleness OK" },
            { value: "causal", label: "Causal — session consistency" },
          ]}
        />

        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          style={{
            width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 600, marginTop: 8,
            background: "#4a148c", color: "#fff", border: "none", borderRadius: 8,
            cursor: analyzing ? "not-allowed" : "pointer", opacity: analyzing ? 0.7 : 1
          }}
        >
          {analyzing ? "Analyzing..." : "🔍 Analyze Workload"}
        </button>
      </div>

      {/* Result Panel */}
      <div style={{ overflowY: "auto" }}>
        {!result && !analyzing && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#bbb", gap: 12 }}>
            <i className="ti ti-topology-star-2" style={{ fontSize: 44 }} />
            <div style={{ fontSize: 13 }}>Configure your workload profile and click Analyze</div>
            <div style={{ fontSize: 11, maxWidth: 320, textAlign: "center", lineHeight: 1.6 }}>
              The advisor will recommend between B+-Tree and LSM-Tree storage engines based on your specific access patterns, consistency requirements, and operational constraints.
            </div>
          </div>
        )}

        {analyzing && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#888", gap: 12 }}>
            <div style={{ fontSize: 13 }}>Analyzing workload profile...</div>
          </div>
        )}

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Recommendation Header */}
            <div style={{
              background: result.recommendation === "B+-Tree" ? "#e8f0fe" : result.recommendation === "LSM-Tree" ? "#e8f5e9" : "#fff8e1",
              border: `2px solid ${result.recommendation === "B+-Tree" ? "#1565c0" : result.recommendation === "LSM-Tree" ? "#2e7d32" : "#f57f17"}`,
              borderRadius: 12, padding: "20px 22px"
            }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: "1px" }}>Recommended Storage Engine</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: result.recommendation === "B+-Tree" ? "#1565c0" : result.recommendation === "LSM-Tree" ? "#2e7d32" : "#f57f17", marginBottom: 8 }}>
                {result.recommendation}
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Based on your {profile.readWriteRatio}% read ratio, {profile.workloadType} workload, and {profile.consistencyReq} consistency requirements.
              </div>
            </div>

            {/* Score Comparison */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#212121", marginBottom: 14 }}>Suitability Score</div>
              <ScoreBar label="B+-Tree" score={result.score.bplus} color="#1565c0" />
              <ScoreBar label="LSM-Tree" score={result.score.lsm} color="#2e7d32" />
            </div>

            {/* Reasoning */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#212121", marginBottom: 12 }}>Why This Engine?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.reasoning.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#e8f0fe", color: "#1565c0", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 12, color: "#333", lineHeight: 1.6 }}>{r}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tradeoff Table */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#212121", marginBottom: 12 }}>Head-to-Head Tradeoffs</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#555", fontWeight: 600, borderRadius: "6px 0 0 6px" }}>Dimension</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#1565c0", fontWeight: 600 }}>B+-Tree</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#2e7d32", fontWeight: 600, borderRadius: "0 6px 6px 0" }}>LSM-Tree</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tradeoffs.map((t, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "9px 12px", color: "#555", fontWeight: 500 }}>{t.label}</td>
                      <td style={{ padding: "9px 12px", color: "#1565c0", fontFamily: "monospace", fontSize: 11 }}>{t.bplus}</td>
                      <td style={{ padding: "9px 12px", color: "#2e7d32", fontFamily: "monospace", fontSize: 11 }}>{t.lsm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Databases that use this */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#212121", marginBottom: 10 }}>Databases Using This Engine</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.bestFor.map(db => (
                  <span key={db} style={{ fontSize: 12, background: "#f0f4ff", color: "#1565c0", padding: "4px 12px", borderRadius: 6, fontWeight: 500 }}>
                    {db}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 12, lineHeight: 1.6, padding: "10px 12px", background: "#fafafa", borderRadius: 8 }}>
                💡 {result.alternatives}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
