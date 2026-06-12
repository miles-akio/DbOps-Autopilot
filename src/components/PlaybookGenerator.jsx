import { useState } from "react";
import { generateAnsiblePlaybook } from "../utils/playbookGenerator";
import { playbook_templates } from "../data/clusterData";

const DB_TYPES = ["Cassandra", "MySQL", "Redis", "Kafka", "VictoriaMetrics", "PostgreSQL"];

function RiskBadge({ risk }) {
  const colors = {
    low: { bg: "#e8f5e9", text: "#2e7d32" },
    medium: { bg: "#fff8e1", text: "#f57f17" },
    high: { bg: "#ffebee", text: "#c62828" },
  };
  const c = colors[risk] || colors.low;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: c.bg, color: c.text, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {risk} risk
    </span>
  );
}

function OperationCard({ id, tpl, selected, onClick }) {
  return (
    <div
      onClick={() => onClick(id)}
      style={{
        border: `1.5px solid ${selected ? "#1565c0" : "#e0e0e0"}`,
        borderRadius: 10, padding: "12px 14px", cursor: "pointer",
        background: selected ? "#e8f0fe" : "#fff",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className={`ti ${tpl.icon}`} style={{ fontSize: 18, color: selected ? "#1565c0" : "#555" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: selected ? "#1565c0" : "#212121" }}>{tpl.name}</span>
        </div>
        <RiskBadge risk={tpl.risk} />
      </div>
      <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>{tpl.description}</div>
      <div style={{ fontSize: 10, color: "#999", marginTop: 6 }}>⏱ {tpl.duration}</div>
    </div>
  );
}

export default function PlaybookGenerator() {
  const [dbType, setDbType] = useState("Cassandra");
  const [operation, setOperation] = useState("rolling_restart");
  const [hosts, setHosts] = useState("");
  const [user, setUser] = useState("ubuntu");
  const [become, setBecome] = useState(true);
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerated(null);
    await new Promise(r => setTimeout(r, 600));
    const yaml = generateAnsiblePlaybook({ dbType, operation, hosts, user, become });
    setGenerated(yaml);
    setGenerating(false);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generated], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dbops-${operation}-${dbType.toLowerCase()}.yml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, height: "100%" }}>
      {/* Config Panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#212121", marginBottom: 14 }}>Configuration</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 5 }}>Database Type</label>
            <select
              value={dbType}
              onChange={e => setDbType(e.target.value)}
              style={{ width: "100%", fontSize: 13, border: "1px solid #ddd", borderRadius: 7, padding: "8px 10px", background: "#fafafa" }}
            >
              {DB_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 5 }}>Ansible Host Pattern</label>
            <input
              value={hosts}
              onChange={e => setHosts(e.target.value)}
              placeholder={`${dbType.toLowerCase()}_nodes`}
              style={{ width: "100%", fontSize: 12, fontFamily: "monospace", border: "1px solid #ddd", borderRadius: 7, padding: "8px 10px", boxSizing: "border-box", background: "#fafafa" }}
            />
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>e.g. cassandra_nodes, prod_db, all</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 5 }}>Remote User</label>
            <input
              value={user}
              onChange={e => setUser(e.target.value)}
              style={{ width: "100%", fontSize: 12, fontFamily: "monospace", border: "1px solid #ddd", borderRadius: 7, padding: "8px 10px", boxSizing: "border-box", background: "#fafafa" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <input type="checkbox" id="become" checked={become} onChange={e => setBecome(e.target.checked)} style={{ accentColor: "#1565c0" }} />
            <label htmlFor="become" style={{ fontSize: 12, color: "#555", cursor: "pointer" }}>
              Use privilege escalation (become: yes)
            </label>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 600,
              background: "#1565c0", color: "#fff", border: "none", borderRadius: 8,
              cursor: generating ? "not-allowed" : "pointer",
              opacity: generating ? 0.7 : 1, transition: "all 0.15s"
            }}
          >
            {generating ? "Generating..." : "⚡ Generate Playbook"}
          </button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#212121", marginBottom: 12 }}>Select Operation</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(playbook_templates).map(([id, tpl]) => (
              <OperationCard key={id} id={id} tpl={tpl} selected={operation === id} onClick={setOperation} />
            ))}
          </div>
        </div>
      </div>

      {/* Output Panel */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>Generated Playbook</span>
            {generated && (
              <span style={{ fontSize: 11, background: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                YAML
              </span>
            )}
          </div>
          {generated && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleCopy}
                style={{ fontSize: 12, padding: "5px 12px", border: "1px solid #ddd", borderRadius: 6, background: copied ? "#e8f5e9" : "#fff", color: copied ? "#2e7d32" : "#555", cursor: "pointer" }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                style={{ fontSize: 12, padding: "5px 12px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#555", cursor: "pointer" }}
              >
                ↓ Download .yml
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 0 }}>
          {!generated && !generating && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#bbb", gap: 10 }}>
              <i className="ti ti-file-code" style={{ fontSize: 40 }} />
              <div style={{ fontSize: 13 }}>Configure options and click Generate</div>
            </div>
          )}
          {generating && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#999", gap: 10 }}>
              <div style={{ fontSize: 13 }}>Building playbook for {dbType} — {playbook_templates[operation]?.name}...</div>
            </div>
          )}
          {generated && (
            <pre style={{
              margin: 0, padding: "16px 20px", fontSize: 12, lineHeight: 1.65,
              fontFamily: "monospace", color: "#212121", background: "#fafeff",
              overflowX: "auto", whiteSpace: "pre",
            }}>
              <code style={{ color: "inherit" }}>
                {generated.split("\n").map((line, i) => {
                  let color = "#212121";
                  if (line.trim().startsWith("#")) color = "#888";
                  else if (line.trim().startsWith("- name:")) color = "#1565c0";
                  else if (line.trim().match(/^[a-zA-Z_]+:/)) color = "#6a1b9a";
                  else if (line.includes(":") && !line.trim().startsWith("-")) {
                    const [k] = line.split(":");
                    if (k.trim() && !line.trim().startsWith("command") && !line.trim().startsWith("msg") && !line.trim().startsWith("line") && !line.trim().startsWith("content")) color = "#0277bd";
                  }
                  return (
                    <span key={i} style={{ display: "block", color }}>
                      {line || " "}
                    </span>
                  );
                })}
              </code>
            </pre>
          )}
        </div>

        {generated && (
          <div style={{ padding: "10px 18px", borderTop: "1px solid #f0f0f0", background: "#fafafa", display: "flex", gap: 16 }}>
            <span style={{ fontSize: 11, color: "#888" }}>
              {generated.split("\n").length} lines
            </span>
            <span style={{ fontSize: 11, color: "#888" }}>
              {playbook_templates[operation]?.duration} estimated runtime
            </span>
            <span style={{ fontSize: 11, color: "#888" }}>
              Risk: <RiskBadge risk={playbook_templates[operation]?.risk} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
