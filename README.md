# DbOps Autopilot 🗄️

> **Distributed Database Operations Command Center** — a full-stack operations platform for managing fleets of distributed database nodes with real-time health visibility, Ansible playbook generation, storage engine advisory, and guided runbook automation.

![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Vite-orange)

---

## Overview

Database engineers and DBAs managing large-scale distributed systems face a common challenge: visibility and automation are fragmented. You might have Grafana for metrics, separate Ansible repos for playbooks, scattered runbooks in Confluence, and no unified place to make decisions about storage engine tradeoffs.

**DbOps Autopilot** solves this by combining four critical operational workflows into a single, purpose-built interface:

1. **Fleet Dashboard** — Real-time visibility into every node's health, resource usage, and replication state
2. **Ansible Playbook Generator** — Production-grade YAML playbooks generated from form inputs, covering the most common DB operational tasks
3. **Storage Engine Advisor** — Data-driven recommendation engine for B+-Tree vs LSM-Tree based on workload profiling
4. **Runbook Automation Panel** — Guided, step-by-step execution of operational workflows with live output simulation

---

## Why This Project Exists

This project directly addresses the real-world infrastructure challenges described in cloud software engineering and DBA roles at companies managing distributed databases at scale:

| JD Requirement | How DbOps Autopilot Addresses It |
|---|---|
| Ansible playbook authoring for DB fleets | Playbook Generator outputs production-ready YAML for 6 operations × 6 DB types |
| Distributed systems observability | Fleet Dashboard shows CPU, memory, disk, QPS, p99 latency, and replication lag per node |
| Storage engine internals (B+-Tree, LSM-Tree) | Storage Advisor quantifies tradeoffs based on real access-pattern inputs |
| Rolling upgrades, backup/restore, failover | All three modeled as runbook templates with step-by-step execution |
| Multi-region architecture awareness | Nodes display region + datacenter + rack topology |
| Replication, sharding, fault tolerance | Replication lag monitoring, shard counts, and status-based alerting built in |
| Collaboration between SWE and DBA teams | Storage Advisor outputs language and tradeoffs DBAs use in architecture reviews |

---

## Features

### Fleet Dashboard
- Live node card grid for all database nodes across types (Cassandra, Redis, MySQL, Kafka, VictoriaMetrics)
- Per-node metrics: CPU%, memory%, disk%, QPS, p99 latency, replication lag
- Visual health status with color-coded indicators (healthy / warning / critical)
- Filter by DB type, status, and region
- Click any node for detailed drill-down: sparklines, topology info, alert diagnosis
- Cluster summary bar: total nodes, healthy/warning/critical counts, aggregate QPS

### Ansible Playbook Generator
- Select DB type, operation, host pattern, remote user, and privilege escalation options
- Generates syntax-highlighted, production-annotated YAML for:
  - Rolling Restart (serial: 1, health checks between each node)
  - Backup & Restore (snapshot → compress → S3 upload → checksum verify → retention cleanup)
  - Automated Failover (lag check → STONITH fence → replica promote → DNS update → Slack notify)
  - Force Compaction (async execution with disk-space reporting before/after)
  - Horizontal Scale-Out (provision → join cluster → shard rebalance)
  - TLS Certificate Rotation (Vault PKI integration → cert verify → no-downtime SIGHUP reload)
- One-click copy to clipboard and `.yml` file download
- Risk level and estimated runtime shown per operation template

### Storage Engine Advisor
- Workload profiling form:
  - Read/Write ratio slider (0–100%)
  - Workload type: OLTP, analytics, time-series, log, cache, search
  - Update pattern: random, append-only, bulk loads, delete-heavy
  - Dataset size: small / medium / large / x-large
  - Latency requirement: ultra-low / low / medium / relaxed
  - Consistency model: strong / eventual / causal
- Outputs B+-Tree vs LSM-Tree suitability scores (0–100)
- Explains reasoning in plain language tied to the specific profile inputs
- Head-to-head tradeoff table: write amplification, read amplification, space amplification, update cost, range scan performance
- Lists real databases using the recommended engine
- Includes a nuanced dissent: when to reconsider the recommendation

### Runbook Automation Panel
- Choose operation (Rolling Restart, Backup & Restore, Automated Failover)
- Filter and select target nodes by DB type with visual status indicators
- Dry Run mode: simulate execution step-by-step without applying changes
- Live execution simulation: each step advances with mock output (exactly what real output looks like)
- Per-step risk labels: none / low / medium / high
- Command preview: shows the exact shell command each step runs
- Live execution log with timestamps, matching what you'd see in a CI/CD pipeline
- Safeguards: high-risk operations require explicit confirmation before live execution

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 with hooks |
| Build tool | Vite 5 |
| Icon library | Tabler Icons (webfont) |
| Fonts | Inter (Google Fonts) |
| Styling | Inline CSS-in-JS (no external CSS framework) |
| State management | React `useState` (no Redux needed) |
| Data layer | In-memory JS modules (swap for real API calls) |
| Deployment target | Any static host (Vercel, Netlify, GitHub Pages, S3+CloudFront) |

> **No backend required to run.** All data is simulated to enable instant demos. See [Connecting a Real Backend](#connecting-a-real-backend) for how to wire up live data.

---

## Project Structure

```
dbops-autopilot/
├── index.html                     # HTML entry point, loads fonts + icons
├── vite.config.js                 # Vite build config
├── package.json                   # Dependencies and scripts
├── README.md                      # This file
└── src/
    ├── main.jsx                   # React root mount
    ├── App.jsx                    # Navigation shell, top bar, tab routing
    ├── components/
    │   ├── FleetDashboard.jsx     # Node grid, filters, summary bar, detail panel
    │   ├── PlaybookGenerator.jsx  # Playbook config form + syntax-highlighted output
    │   ├── StorageAdvisor.jsx     # Workload profile form + recommendation engine UI
    │   └── RunbookPanel.jsx       # Operation selector, node picker, step runner, log
    ├── data/
    │   └── clusterData.js         # Simulated node fleet, metrics history, playbook metadata
    └── utils/
        └── playbookGenerator.js   # Ansible YAML generation, storage engine analysis logic, runbook steps
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+

### Install & Run

```bash
# Clone the repo
git clone https://github.com/yourusername/dbops-autopilot.git
cd dbops-autopilot

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app loads instantly with simulated cluster data.

### Build for Production

```bash
npm run build
# Output in ./dist — deploy anywhere that serves static files
```

### Preview Production Build Locally

```bash
npm run preview
```

---

## Usage Guide

### Fleet Dashboard
1. Open the **Fleet Dashboard** tab
2. Use the Type / Status / Region filters to narrow the node list
3. Click any node card to open the detail panel (closes on second click)
4. Critical and warning nodes display a diagnosis card with the most likely root cause

### Playbook Generator
1. Navigate to **Playbook Generator**
2. Select a **Database Type** and **Operation** from the left panel
3. Optionally customize the host pattern, remote user, and privilege escalation
4. Click **Generate Playbook** — the YAML appears with syntax highlighting in under 1 second
5. Use **Copy** to paste into your Ansible project, or **Download** to save the `.yml` file directly
6. The operation cards show estimated runtime and risk level to inform your decision

### Storage Engine Advisor
1. Navigate to **Storage Advisor**
2. Adjust the sliders and dropdowns to match your real workload:
   - If you're building a write-heavy IoT pipeline: set reads to ~20%, workload to Time-series, pattern to Append
   - If you're on a transactional OLTP system: reads ~70%, OLTP, random updates, strong consistency
3. Click **Analyze Workload**
4. Review the suitability scores, reasoning, tradeoff table, and the list of real databases using that engine
5. Use the "When to reconsider" note to pressure-test the recommendation

### Runbook Automation
1. Navigate to **Runbook Automation**
2. Select an **Operation** from the left panel (color-coded by risk)
3. Choose a DB type and check the target nodes you want to operate on
4. Leave **Dry Run Mode** enabled for safe simulation (recommended first run)
5. Click **Simulate Runbook** to watch each step execute with mock outputs
6. When confident, uncheck Dry Run and execute for real (high-risk ops prompt for confirmation)

---

## Connecting a Real Backend

The simulated data layer makes swapping in real data straightforward:

### 1. Replace `clusterData.js` with API calls

```js
// src/data/clusterData.js — swap static data for API fetch
export async function fetchNodes() {
  const res = await fetch("/api/v1/nodes");
  return res.json();
}
```

Recommended backend stack:
- **Python + FastAPI** — most compatible with Ansible + cloud tooling
- **Go** — matches TP-Link JD requirements, high-performance API
- **Node.js + Express** — quick iteration for prototyping

### 2. Real metrics sources

| Data | Integration |
|---|---|
| Node CPU/memory/disk | Prometheus + node_exporter |
| DB-specific metrics | Prometheus exporters (mysqld_exporter, redis_exporter, cassandra_exporter) |
| Replication lag | Direct DB queries (SHOW SLAVE STATUS, INFO replication) |
| QPS / latency | VictoriaMetrics or Grafana Mimir |

### 3. Real playbook execution

Replace the simulated `setTimeout` loops in `RunbookPanel.jsx` with:

```js
// Execute playbook via Ansible AWX / Tower API
const res = await fetch("/api/v1/playbooks/execute", {
  method: "POST",
  body: JSON.stringify({ operation, nodes, dbType, dryRun })
});
// Stream output via WebSocket or Server-Sent Events
```

---

## Concepts Demonstrated

This project is a hands-on demonstration of the following distributed systems and infrastructure engineering concepts:

**Distributed Systems**
- CAP theorem implications in replication lag monitoring
- Eventual vs. strong consistency tradeoffs in the Storage Advisor
- Shard distribution and cluster topology awareness

**Storage Engine Internals**
- B+-Tree: clustered index layout, in-place updates, low read amplification
- LSM-Tree: MemTable → SSTable pipeline, write amplification, compaction overhead
- Amplification factors: write, read, and space — how they're measured and traded off

**Ansible Automation**
- Idempotent task design (`systemd`, `file`, `copy` modules)
- Serial execution for rolling operations
- `async`/`poll` for long-running tasks (compaction)
- Vault integration for secret management (TLS cert rotation playbook)
- Handler patterns for event-driven side effects

**Observability**
- The four golden signals: latency (p99), traffic (QPS), errors, saturation (CPU/mem/disk)
- Replication lag as a leading indicator of node health degradation
- Alerting thresholds and diagnosis logic

**Operational Runbooks**
- Pre-flight checks before destructive operations
- STONITH (Shoot The Other Node In The Head) for safe failover
- Graceful drain patterns vs. hard stops
- Quorum validation before rolling restarts

---

## Extending the Project

Ideas for next features to add for deeper impact:

- **Schema change planner** — online DDL risk assessment for MySQL, Cassandra, etc.
- **Capacity planner** — extrapolate current growth curves to predict when nodes will saturate
- **Multi-region failover diagram** — interactive architecture diagram with latency heatmap
- **Query analyzer** — paste a SQL/CQL query and get index strategy recommendations
- **Terraform module generator** — complement Ansible playbooks with infrastructure provisioning code
- **Slack / PagerDuty integration** — fire real alerts when simulated node status changes

---

## License

MIT — free to use, modify, and deploy.
