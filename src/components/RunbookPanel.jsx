import { useState } from "react";
import { getRunbookSteps } from "../utils/playbookGenerator";
import { dbNodes } from "../data/clusterData";

const OPERATIONS = [
  { id: "rolling_restart", label: "Rolling Restart", icon: "ti-refresh", risk: "low", color: "#2e7d32" },
  { id: "backup_restore", label: "Backup & Restore", icon: "ti-database", risk: "low", color: "#0277bd" },
  { id: "failover", label: "Automated Failover", icon: "ti-arrows-exchange", risk: "high", color: "#c62828" },
];

const RISK_COLORS = {
  none: { bg: "#f5f5f5", text: "#888" },
  low: { bg: "#e8f5e9", text: "#2e7d32" },
  medium: { bg: "#fff8e1", text: "#f57f17" },
  high: { bg: "#ffebee", text: "#c62828" },
};

function StepRow({ step, isActive, isDone, isRunning, output }) {
  const rc = RISK_COLORS[step.risk];
  return (
    <div style={{
      border: `1px solid ${isActive ? "#1565c0" : isDone ? "#e8f5e9" : "#f0f0f0"}`,
      borderRadius: 9, padding: "12px 14px", marginBottom: 8,
      background: isDone ? "#fafff9" : isActive ? "#e8f0fe" : "#fff",
      transition: "all 0.2s"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: step.cmd ? 6 : 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: isDone ? "#2e7d32" : isActive ? "#1565c0" : "#e0e0e0",
          color: "#fff", fontSize: 12, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {isDone ? "✓" : step.step}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>{step.action}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, background: rc.bg, color: rc.text, padding: "2px 7px", borderRadius: 4 }}>
          {step.risk} risk
        </span>
        {isRunning && (
          <span style={{ fontSize: 11, color: "#1565c0", fontWeight: 600 }}>Running...</span>
        )}
        {isDone && output && (
          <span style={{ fontSize: 11, color: "#2e7d32", fontWeight: 600 }}>Done</span>
        )}
      </div>
      {step.cmd && (
        <div style={{
          background: "#1a1a2e", borderRadius: 6, padding: "6px 10px",
          fontFamily: "monospace", fontSize: 11, color: "#00e5ff",
          marginLeft: 38, overflowX: "auto", whiteSpace: "pre"
        }}>
          $ {step.cmd}
        </div>
      )}
      {output && isDone && (
        <div style={{
          background: "#f0fff4", borderRadius: 6, padding: "6px 10px",
          fontFamily: "monospace", fontSize: 11, color: "#2e7d32",
          marginLeft: 38, marginTop: 4
        }}>
          {output}
        </div>
      )}
    </div>
  );
}

const MOCK_OUTPUTS = {
  rolling_restart: [
    "cluster_size=10  reachable=10",
    "Seconds_Behind_Master: 0",
    "max_connections set to 0",
    "Service stopped gracefully",
    "Port closed confirmed",
    "Service started — pid 48231",
    "PONG — node healthy",
    "max_connections restored to 500",
  ],
  backup_restore: [
    "/dev/sda1: 48G used of 200G (24%)",
    "mysqldump complete — 14.2 GB written",
    "snapshot.tar.gz — 4.1 GB compressed",
    "Upload complete — s3://dbops-backups/mysql-prod-01/2024-01-15/",
    "sha256: a3f8c2e1... ✓ verified",
    "Restore test passed in staging",
  ],
  failover: [
    "Connection refused on primary — confirmed unreachable",
    "Seconds_Behind_Master: 2 — replica is near real-time",
    "Instance i-0abc123 stopped",
    "RESET SLAVE ALL — replica now operates as primary",
    "DNS TTL=30 — propagating...",
    "INSERT succeeded on new primary",
    "Slack notification sent to #database-ops",
  ],
};

export default function RunbookPanel() {
  const [selectedOp, setSelectedOp] = useState("rolling_restart");
  const [selectedDbType, setSelectedDbType] = useState("MySQL");
  const [targetNodes, setTargetNodes] = useState([]);
  const [runState, setRunState] = useState("idle"); // idle | running | done | failed
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [stepOutputs, setStepOutputs] = useState({});
  const [dryRun, setDryRun] = useState(true);
  const [log, setLog] = useState([]);

  const dbTypes = [...new Set(dbNodes.map(n => n.type))];
  const nodesOfType = dbNodes.filter(n => n.type === selectedDbType);
  const steps = getRunbookSteps(selectedOp, selectedDbType);
  const opMeta = OPERATIONS.find(o => o.id === selectedOp);
  const outputs = MOCK_OUTPUTS[selectedOp] || [];

  const toggleNode = (id) => {
    setTargetNodes(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const handleRun = async () => {
    if (targetNodes.length === 0) {
      alert("Select at least one target node.");
      return;
    }
    if (opMeta.risk === "high" && !dryRun) {
      const ok = window.confirm(`⚠ This is a HIGH RISK operation (${opMeta.label}).\n\nAre you sure you want to execute against ${targetNodes.length} node(s)?`);
      if (!ok) return;
    }

    setRunState("running");
    setCurrentStep(0);
    setCompletedSteps([]);
    setStepOutputs({});
    const nodeNames = targetNodes.map(id => dbNodes.find(n => n.id === id)?.name).filter(Boolean);
    setLog([`[${new Date().toISOString()}] Starting ${opMeta.label} on: ${nodeNames.join(", ")}`, dryRun ? "[DRY RUN — no changes applied]" : "[LIVE EXECUTION]"]);

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      const delay = 800 + Math.random() * 700;
      await new Promise(r => setTimeout(r, delay));

      const output = outputs[i] || "OK";
      setStepOutputs(prev => ({ ...prev, [i]: output }));
      setCompletedSteps(prev => [...prev, i]);
      setLog(prev => [...prev, `[Step ${i + 1}] ${steps[i].action}: ${output}`]);
    }

    setRunState("done");
    setLog(prev => [...prev, `[${new Date().toISOString()}] ✅ ${opMeta.label} completed successfully.`]);
  };

  const handleReset = () => {
    setRunState("idle");
    setCurrentStep(0);
    setCompletedSteps([]);
    setStepOutputs({});
    setLog([]);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, height: "100%" }}>
      {/* Config */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#212121", marginBottom: 12 }}>Select Operation</div>
          {OPERATIONS.map(op => (
            <div
              key={op.id}
              onClick={() => { setSelectedOp(op.id); handleReset(); }}
              style={{
                border: `1.5px solid ${selectedOp === op.id ? op.color : "#e0e0e0"}`,
                borderRadius: 9, padding: "10px 12px", marginBottom: 8,
                cursor: "pointer", background: selectedOp === op.id ? `${op.color}10` : "#fff",
                transition: "all 0.15s"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className={`ti ${op.icon}`} style={{ fontSize: 16, color: selectedOp === op.id ? op.color : "#888" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: selectedOp === op.id ? op.color : "#333" }}>{op.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: RISK_COLORS[op.risk].text, background: RISK_COLORS[op.risk].bg, padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                  {op.risk}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#212121", marginBottom: 10 }}>Target Nodes</div>
          <select
            value={selectedDbType}
            onChange={e => { setSelectedDbType(e.target.value); setTargetNodes([]); }}
            style={{ width: "100%", fontSize: 12, border: "1px solid #ddd", borderRadius: 7, padding: "7px 10px", marginBottom: 10, background: "#fafafa" }}
          >
            {dbTypes.map(t => <option key={t}>{t}</option>)}
          </select>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
            {nodesOfType.map(node => {
              const checked = targetNodes.includes(node.id);
              const sc = { healthy: "#43a047", warning: "#ffb300", critical: "#e53935" };
              return (
                <label key={node.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 8px", borderRadius: 7, background: checked ? "#e8f0fe" : "#fafafa", border: "1px solid " + (checked ? "#1565c0" : "#eee") }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleNode(node.id)} style={{ accentColor: "#1565c0" }} />
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc[node.status], flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#212121" }}>{node.name}</span>
                  <span style={{ fontSize: 10, color: "#888", marginLeft: "auto" }}>{node.region}</span>
                </label>
              );
            })}
          </div>
          {targetNodes.length > 0 && (
            <div style={{ fontSize: 11, color: "#1565c0", marginTop: 8, fontWeight: 600 }}>
              {targetNodes.length} node{targetNodes.length > 1 ? "s" : ""} selected
            </div>
          )}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 18px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 14 }}>
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} style={{ accentColor: "#1565c0" }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#212121" }}>Dry Run Mode</div>
              <div style={{ fontSize: 11, color: "#888" }}>Simulate steps without executing</div>
            </div>
          </label>
          {runState === "idle" || runState === "done" ? (
            <button
              onClick={runState === "done" ? handleReset : handleRun}
              style={{
                width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700,
                background: runState === "done" ? "#f5f5f5" : opMeta?.color || "#1565c0",
                color: runState === "done" ? "#555" : "#fff",
                border: "none", borderRadius: 8, cursor: "pointer"
              }}
            >
              {runState === "done" ? "Reset" : dryRun ? "▶ Simulate Runbook" : "▶ Execute Runbook"}
            </button>
          ) : (
            <button disabled style={{ width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, background: "#e0e0e0", color: "#888", border: "none", borderRadius: 8 }}>
              Running...
            </button>
          )}
        </div>
      </div>

      {/* Steps + Log */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 18px", flex: 1, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>
              Runbook Steps — {opMeta?.label}
            </div>
            {runState === "done" && (
              <span style={{ fontSize: 11, background: "#e8f5e9", color: "#2e7d32", padding: "3px 10px", borderRadius: 6, fontWeight: 700 }}>
                ✓ Completed
              </span>
            )}
          </div>
          {steps.map((step, i) => (
            <StepRow
              key={i}
              step={step}
              isActive={runState === "running" && currentStep === i}
              isDone={completedSteps.includes(i)}
              isRunning={runState === "running" && currentStep === i}
              output={stepOutputs[i]}
            />
          ))}
        </div>

        {log.length > 0 && (
          <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "14px 16px", maxHeight: 160, overflowY: "auto" }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontFamily: "monospace" }}>EXECUTION LOG</div>
            {log.map((line, i) => (
              <div key={i} style={{ fontFamily: "monospace", fontSize: 11, color: line.includes("✅") ? "#00e676" : line.includes("DRY RUN") ? "#ffeb3b" : "#9e9e9e", marginBottom: 3 }}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
