import { useState } from "react";
import FleetDashboard from "./components/FleetDashboard";
import PlaybookGenerator from "./components/PlaybookGenerator";
import StorageAdvisor from "./components/StorageAdvisor";
import RunbookPanel from "./components/RunbookPanel";
import { dbNodes } from "./data/clusterData";

const NAV_ITEMS = [
  { id: "fleet", label: "Fleet Dashboard", icon: "ti-server-2", description: "Node health & metrics" },
  { id: "playbook", label: "Playbook Generator", icon: "ti-file-code", description: "Generate Ansible YAML" },
  { id: "storage", label: "Storage Advisor", icon: "ti-topology-star-2", description: "B+-Tree vs LSM-Tree" },
  { id: "runbook", label: "Runbook Automation", icon: "ti-player-play", description: "Execute ops workflows" },
];

const criticalCount = dbNodes.filter(n => n.status === "critical").length;
const warningCount = dbNodes.filter(n => n.status === "warning").length;

export default function App() {
  const [activeTab, setActiveTab] = useState("fleet");

  const active = NAV_ITEMS.find(n => n.id === activeTab);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#f4f6fa", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Bar */}
      <div style={{
        background: "#0d1b2a",
        borderBottom: "1px solid #1a2d42",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        height: 54,
        gap: 20,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 12 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: "linear-gradient(135deg, #1565c0, #4a148c)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <i className="ti ti-database" style={{ fontSize: 15, color: "#fff" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>DbOps Autopilot</div>
            <div style={{ fontSize: 10, color: "#546e7a", letterSpacing: "0.5px" }}>DISTRIBUTED DB COMMAND CENTER</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 14px",
                background: activeTab === item.id ? "#1565c0" : "transparent",
                color: activeTab === item.id ? "#fff" : "#78909c",
                border: "none", borderRadius: 7, cursor: "pointer",
                fontSize: 12, fontWeight: activeTab === item.id ? 600 : 400,
                transition: "all 0.15s"
              }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 15 }} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Status Indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {criticalCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#e53935", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 11, color: "#ef9a9a", fontWeight: 600 }}>{criticalCount} critical</span>
            </div>
          )}
          {warningCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ffb300" }} />
              <span style={{ fontSize: 11, color: "#ffe082", fontWeight: 600 }}>{warningCount} warning</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#43a047" }} />
            <span style={{ fontSize: 11, color: "#a5d6a7", fontWeight: 600 }}>Live</span>
          </div>
          <div style={{ fontSize: 11, color: "#546e7a", borderLeft: "1px solid #1a2d42", paddingLeft: 12 }}>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e8e8e8",
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className={`ti ${active?.icon}`} style={{ fontSize: 20, color: "#1565c0" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#212121" }}>{active?.label}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{active?.description}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#bbb" }}>
          10 nodes · 2 regions · us-west-2, us-east-1
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "20px 24px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "fleet" && <FleetDashboard />}
        {activeTab === "playbook" && <PlaybookGenerator />}
        {activeTab === "storage" && <StorageAdvisor />}
        {activeTab === "runbook" && <RunbookPanel />}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        * { box-sizing: border-box; }
        select, input[type="text"], input[type="range"] { outline: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
      `}</style>
    </div>
  );
}
