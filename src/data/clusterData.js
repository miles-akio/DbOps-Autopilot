export const dbNodes = [
  {
    id: "node-01", name: "cassandra-prod-01", region: "us-west-2",
    type: "Cassandra", role: "Primary", status: "healthy",
    cpu: 42, memory: 67, disk: 55, replicationLag: 0,
    shards: 4, uptime: "32d 14h", version: "4.1.3",
    connections: 248, qps: 12400, p99Latency: 4.2,
    rack: "rack1", datacenter: "dc1"
  },
  {
    id: "node-02", name: "cassandra-prod-02", region: "us-west-2",
    type: "Cassandra", role: "Replica", status: "healthy",
    cpu: 38, memory: 61, disk: 53, replicationLag: 12,
    shards: 4, uptime: "32d 14h", version: "4.1.3",
    connections: 201, qps: 10800, p99Latency: 4.8,
    rack: "rack2", datacenter: "dc1"
  },
  {
    id: "node-03", name: "cassandra-prod-03", region: "us-east-1",
    type: "Cassandra", role: "Replica", status: "warning",
    cpu: 88, memory: 79, disk: 71, replicationLag: 340,
    shards: 4, uptime: "32d 14h", version: "4.1.3",
    connections: 178, qps: 9200, p99Latency: 18.7,
    rack: "rack1", datacenter: "dc2"
  },
  {
    id: "node-04", name: "redis-cache-01", region: "us-west-2",
    type: "Redis", role: "Primary", status: "healthy",
    cpu: 22, memory: 84, disk: 12, replicationLag: 0,
    shards: 1, uptime: "8d 2h", version: "7.2.4",
    connections: 1240, qps: 98000, p99Latency: 0.8,
    rack: "rack1", datacenter: "dc1"
  },
  {
    id: "node-05", name: "redis-cache-02", region: "us-west-2",
    type: "Redis", role: "Replica", status: "healthy",
    cpu: 18, memory: 82, disk: 11, replicationLag: 2,
    shards: 1, uptime: "8d 2h", version: "7.2.4",
    connections: 980, qps: 87000, p99Latency: 0.9,
    rack: "rack2", datacenter: "dc1"
  },
  {
    id: "node-06", name: "mysql-prod-01", region: "us-east-1",
    type: "MySQL", role: "Primary", status: "critical",
    cpu: 97, memory: 93, disk: 88, replicationLag: 0,
    shards: 1, uptime: "4d 6h", version: "8.0.35",
    connections: 512, qps: 4200, p99Latency: 142,
    rack: "rack1", datacenter: "dc2"
  },
  {
    id: "node-07", name: "mysql-prod-02", region: "us-east-1",
    type: "MySQL", role: "Replica", status: "critical",
    cpu: 91, memory: 89, disk: 85, replicationLag: 8200,
    shards: 1, uptime: "4d 6h", version: "8.0.35",
    connections: 488, qps: 3800, p99Latency: 198,
    rack: "rack2", datacenter: "dc2"
  },
  {
    id: "node-08", name: "kafka-broker-01", region: "us-west-2",
    type: "Kafka", role: "Broker", status: "healthy",
    cpu: 51, memory: 58, disk: 64, replicationLag: 0,
    shards: 12, uptime: "61d 3h", version: "3.6.1",
    connections: 86, qps: 55000, p99Latency: 2.1,
    rack: "rack1", datacenter: "dc1"
  },
  {
    id: "node-09", name: "kafka-broker-02", region: "us-west-2",
    type: "Kafka", role: "Broker", status: "healthy",
    cpu: 49, memory: 55, disk: 62, replicationLag: 8,
    shards: 12, uptime: "61d 3h", version: "3.6.1",
    connections: 84, qps: 52000, p99Latency: 2.3,
    rack: "rack2", datacenter: "dc1"
  },
  {
    id: "node-10", name: "victoria-metrics-01", region: "us-west-2",
    type: "VictoriaMetrics", role: "Single", status: "healthy",
    cpu: 31, memory: 44, disk: 78, replicationLag: 0,
    shards: 1, uptime: "14d 9h", version: "1.96.0",
    connections: 42, qps: 28000, p99Latency: 1.4,
    rack: "rack1", datacenter: "dc1"
  }
];

export const clusterSummary = {
  totalNodes: 10,
  healthy: 6,
  warning: 1,
  critical: 2,
  totalQPS: dbNodes.reduce((a, n) => a + n.qps, 0),
  avgCPU: Math.round(dbNodes.reduce((a, n) => a + n.cpu, 0) / dbNodes.length),
  avgMemory: Math.round(dbNodes.reduce((a, n) => a + n.memory, 0) / dbNodes.length),
  regions: ["us-west-2", "us-east-1"],
};

export const metricsHistory = Array.from({ length: 30 }, (_, i) => ({
  time: `${29 - i}m ago`,
  totalQPS: Math.round(350000 + Math.sin(i * 0.4) * 40000 + Math.random() * 20000),
  avgLatency: parseFloat((8 + Math.sin(i * 0.3) * 4 + Math.random() * 3).toFixed(1)),
  errorRate: parseFloat((0.2 + Math.random() * 0.8).toFixed(2)),
}));

export const playbook_templates = {
  rolling_restart: {
    name: "Rolling Restart",
    description: "Safely restart DB nodes one at a time with health checks between each",
    icon: "ti-refresh",
    risk: "low",
    duration: "10-30 min"
  },
  backup_restore: {
    name: "Backup & Restore",
    description: "Snapshot all nodes to S3, verify integrity, optional restore",
    icon: "ti-database",
    risk: "low",
    duration: "15-60 min"
  },
  failover: {
    name: "Automated Failover",
    description: "Promote replica to primary, reroute traffic, verify replication",
    icon: "ti-arrows-exchange",
    risk: "high",
    duration: "2-5 min"
  },
  scale_out: {
    name: "Horizontal Scale-Out",
    description: "Provision new nodes, join cluster, rebalance shards",
    icon: "ti-layout-grid-add",
    risk: "medium",
    duration: "20-45 min"
  },
  compaction: {
    name: "Force Compaction",
    description: "Trigger major compaction to reclaim disk space and improve read performance",
    icon: "ti-arrows-minimize",
    risk: "medium",
    duration: "30-120 min"
  },
  cert_rotation: {
    name: "TLS Cert Rotation",
    description: "Rotate TLS certificates across all nodes with zero-downtime",
    icon: "ti-lock",
    risk: "medium",
    duration: "5-15 min"
  }
};
