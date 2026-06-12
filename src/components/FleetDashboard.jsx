import { useState } from "react";
import { dbNodes, clusterSummary, metricsHistory } from "../data/clusterData";

const STATUS_COLORS = {
  healthy: { bg: "#e8f5e9", text: "#2e7d32", dot: "#43a047" },
  warning: { bg: "#fff8e1", text: "#f57f17", dot: "#ffb300" },
  critical: { bg: "#ffebee", text: "#c62828", dot: "#e53935" },
};

const TYPE_COLORS = {
  Cassandra: "#1565c0",
  Redis: "#b71c1c",
  MySQL: "#0277bd",
  Kafka: "#4a148c",
  VictoriaMetrics: "#1b5e20",
};

function MetricBar({ value, warn = 70, critical = 85 }) {
  const color = value >= critical ? "#e53935" : value >= warn ? "#ffb300" : "#43a047";
  return (
    <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
    </div>
  );
}

function MiniSparkline({ data, color = "#1565c0" }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function NodeCard({ node, onClick, selected }) {
  const sc = STATUS_COLORS[node.status];
  const tc = TYPE_COLORS[node.type] || "#555";
  return (
    <div
      onClick={() => onClick(node)}
      style={{
        background: "#fff",
        border: `1.5px solid ${selected ? tc : "#e0e0e0"}`,
        borderRadius: 10,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all 0.15s",
        boxShadow: selected ? `0 0 0 2px ${tc}22` : "none",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: tc, padding: "2px 7px", borderRadius: 4 }}>
            {node.type}
          </span>
          <span style={{ fontSize: 11, color: "#888" }}>{node.role}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: sc.text, background: sc.bg, padding: "2px 7px", borderRadius: 4 }}>
            {node.status}
          </span>
        </div>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#212121", marginBottom: 2 }}>{node.name}</div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>{node.region} · {node.datacenter} · {node.rack}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 12px" }}>
        {[
          { label: "CPU", value: node.cpu },
          { label: "MEM", value: node.memory },
          { label: "DISK", value: node.disk },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: "#999" }}>{label}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: value >= 85 ? "#e53935" : value >= 70 ? "#ffb300" : "#555" }}>
                {value}%
              </span>
            </div>
            <MetricBar value={value} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
        <span style={{ fontSize: 11, color: "#888" }}>
          <span style={{ fontWeight: 600, color: "#212121" }}>{(node.qps / 1000).toFixed(1)}K</span> QPS
        </span>
        <span style={{ fontSize: 11, color: "#888" }}>
          p99 <span style={{ fontWeight: 600, color: node.p99Latency > 50 ? "#e53935" : node.p99Latency > 10 ? "#ffb300" : "#212121" }}>
            {node.p99Latency}ms
          </span>
        </span>
        {node.replicationLag > 0 && (
          <span style={{ fontSize: 11, color: node.replicationLag > 1000 ? "#e53935" : "#ffb300" }}>
            lag {node.replicationLag}ms
          </span>
        )}
      </div>
    </div>
  );
}

function NodeDetail({ node, onClose }) {
  if (!node) return null;
  const sc = STATUS_COLORS[node.status];
  const tc = TYPE_COLORS[node.type] || "#555";

  const fakeHistory = metricsHistory.slice(0, 20).map(m => Math.round(m.totalQPS / 10));

  return (
    <div style={{
      background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 12,
      padding: "20px 22px", height: "100%", boxSizing: "border-box"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#212121" }}>{node.name}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{node.version} · Up {node.uptime}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#999", lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: tc, padding: "3px 9px", borderRadius: 5 }}>{node.type}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: sc.text, background: sc.bg, padding: "3px 9px", borderRadius: 5 }}>{node.status}</span>
        <span style={{ fontSize: 11, color: "#888", padding: "3px 9px", background: "#f5f5f5", borderRadius: 5 }}>{node.role}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "QPS", value: node.qps.toLocaleString() },
          { label: "p99 Latency", value: `${node.p99Latency}ms` },
          { label: "Connections", value: node.connections },
          { label: "Shards", value: node.shards },
          { label: "Replication Lag", value: node.replicationLag ? `${node.replicationLag}ms` : "None" },
          { label: "Datacenter", value: `${node.datacenter} / ${node.rack}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#f8f8f8", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#999", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#212121" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>QPS (last 20 samples)</div>
        <MiniSparkline data={fakeHistory} color={tc} />
      </div>

      {[
        { label: "CPU", value: node.cpu },
        { label: "Memory", value: node.memory },
        { label: "Disk", value: node.disk },
      ].map(({ label, value }) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{value}%</span>
          </div>
          <MetricBar value={value} />
        </div>
      ))}

      {node.status !== "healthy" && (
        <div style={{
          marginTop: 14, padding: "10px 12px",
          background: node.status === "critical" ? "#ffebee" : "#fff8e1",
          borderRadius: 8, borderLeft: `3px solid ${node.status === "critical" ? "#e53935" : "#ffb300"}`
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: node.status === "critical" ? "#c62828" : "#f57f17", marginBottom: 4 }}>
            {node.status === "critical" ? "⚠ Critical Alert" : "⚡ Warning"}
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>
            {node.cpu > 90 ? `CPU at ${node.cpu}% — consider rebalancing load or scaling out.` :
              node.replicationLag > 1000 ? `Replication lag ${node.replicationLag}ms — check network or primary throughput.` :
                node.p99Latency > 100 ? `p99 latency ${node.p99Latency}ms — investigate slow queries or I/O saturation.` :
                  "Node metrics exceed safe thresholds."}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FleetDashboard() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRegion, setFilterRegion] = useState("All");

  const dbTypes = ["All", ...new Set(dbNodes.map(n => n.type))];
  const regions = ["All", ...new Set(dbNodes.map(n => n.region))];

  const filtered = dbNodes.filter(n =>
    (filterType === "All" || n.type === filterType) &&
    (filterStatus === "All" || n.status === filterStatus) &&
    (filterRegion === "All" || n.region === filterRegion)
  );

  const totalQPSK = Math.round(clusterSummary.totalQPS / 1000);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
      {/* Summary Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {[
          { label: "Total Nodes", value: clusterSummary.totalNodes, color: "#1565c0" },
          { label: "Healthy", value: clusterSummary.healthy, color: "#2e7d32" },
          { label: "Warning", value: clusterSummary.warning, color: "#f57f17" },
          { label: "Critical", value: clusterSummary.critical, color: "#c62828" },
          { label: "Total QPS", value: `${totalQPSK}K`, color: "#4a148c" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Type", options: dbTypes, value: filterType, set: setFilterType },
          { label: "Status", options: ["All", "healthy", "warning", "critical"], value: filterStatus, set: setFilterStatus },
          { label: "Region", options: regions, value: filterRegion, set: setFilterRegion },
        ].map(({ label, options, value, set }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#888" }}>{label}:</span>
            <select
              value={value}
              onChange={e => set(e.target.value)}
              style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 6, padding: "4px 8px", background: "#fff", cursor: "pointer" }}
            >
              {options.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <span style={{ fontSize: 12, color: "#888", marginLeft: "auto", alignSelf: "center" }}>
          {filtered.length} / {dbNodes.length} nodes
        </span>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: selectedNode ? "1fr 320px" : "1fr", gap: 14, flex: 1, minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, alignContent: "start", overflowY: "auto" }}>
          {filtered.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              onClick={n => setSelectedNode(selectedNode?.id === n.id ? null : n)}
              selected={selectedNode?.id === node.id}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#bbb", padding: 40, fontSize: 14 }}>
              No nodes match the current filters.
            </div>
          )}
        </div>
        {selectedNode && (
          <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}
