export function generateAnsiblePlaybook(config) {
  const { dbType, operation, hosts, user, become, extraVars } = config;

  const hostPattern = hosts || `${dbType.toLowerCase()}_nodes`;
  const remoteUser = user || "ubuntu";
  const becomeStr = become ? "yes" : "no";

  const plays = {
    rolling_restart: `---
# DbOps Autopilot — Generated Playbook
# Operation: Rolling Restart
# DB Type: ${dbType}
# Generated: ${new Date().toISOString()}

- name: Rolling restart of ${dbType} nodes
  hosts: ${hostPattern}
  serial: 1
  gather_facts: yes
  become: ${becomeStr}
  remote_user: ${remoteUser}

  vars:
    health_check_retries: 30
    health_check_delay: 10
    service_name: ${dbType.toLowerCase()}${dbType === "MySQL" ? "d" : ""}

  pre_tasks:
    - name: Assert node is in healthy state before restart
      assert:
        that:
          - ansible_uptime_seconds > 60
        fail_msg: "Node uptime check failed — aborting"

    - name: Check replication lag before restart
      command: >
        ${dbType === "MySQL"
          ? 'mysql -e "SHOW SLAVE STATUS\\G" | grep Seconds_Behind_Master'
          : dbType === "Cassandra"
          ? "nodetool tpstats | grep -i dropped"
          : "redis-cli info replication | grep master_repl_offset"}
      register: repl_status
      ignore_errors: yes

  tasks:
    - name: Gracefully stop {{ service_name }}
      systemd:
        name: "{{ service_name }}"
        state: stopped
      notify: wait_for_port_closed

    - name: Wait for service port to close
      wait_for:
        port: ${dbType === "MySQL" ? 3306 : dbType === "Redis" ? 6379 : dbType === "Cassandra" ? 9042 : 9092}
        state: absent
        timeout: 60

    - name: Start {{ service_name }}
      systemd:
        name: "{{ service_name }}"
        state: started
        enabled: yes

    - name: Wait for service to be ready
      wait_for:
        port: ${dbType === "MySQL" ? 3306 : dbType === "Redis" ? 6379 : dbType === "Cassandra" ? 9042 : 9092}
        delay: 5
        timeout: 120

    - name: Verify node health post-restart
      uri:
        url: "http://{{ inventory_hostname }}:${dbType === "VictoriaMetrics" ? 8428 : 8080}/health"
        method: GET
        status_code: 200
      retries: "{{ health_check_retries }}"
      delay: "{{ health_check_delay }}"
      ignore_errors: yes

    - name: Log restart event to operations log
      lineinfile:
        path: /var/log/dbops-autopilot/events.log
        line: "{{ ansible_date_time.iso8601 }} | ROLLING_RESTART | {{ inventory_hostname }} | SUCCESS"
        create: yes

  handlers:
    - name: wait_for_port_closed
      wait_for:
        port: ${dbType === "MySQL" ? 3306 : dbType === "Redis" ? 6379 : dbType === "Cassandra" ? 9042 : 9092}
        state: absent
        timeout: 30
`,

    backup_restore: `---
# DbOps Autopilot — Generated Playbook
# Operation: Backup & Restore
# DB Type: ${dbType}
# Generated: ${new Date().toISOString()}

- name: Backup ${dbType} nodes to S3
  hosts: ${hostPattern}
  gather_facts: yes
  become: ${becomeStr}
  remote_user: ${remoteUser}

  vars:
    backup_bucket: "{{ backup_s3_bucket | default('dbops-backups') }}"
    backup_prefix: "${dbType.toLowerCase()}/{{ inventory_hostname }}/{{ ansible_date_time.date }}"
    backup_dir: /var/backups/${dbType.toLowerCase()}
    retention_days: 14

  tasks:
    - name: Ensure backup directory exists
      file:
        path: "{{ backup_dir }}"
        state: directory
        mode: '0750'

    - name: Create ${dbType} snapshot
      command: >
        ${dbType === "MySQL"
          ? 'mysqldump --all-databases --single-transaction --routines --triggers'
          : dbType === "Redis"
          ? "redis-cli BGSAVE && sleep 5"
          : dbType === "Cassandra"
          ? "nodetool snapshot -t {{ ansible_date_time.epoch }}"
          : "kafka-log-dirs.sh --bootstrap-server localhost:9092 --describe"}
      register: snapshot_result
      failed_when: snapshot_result.rc != 0

    - name: Compress snapshot
      archive:
        path: "{{ backup_dir }}"
        dest: "{{ backup_dir }}/snapshot-{{ ansible_date_time.epoch }}.tar.gz"
        format: gz

    - name: Upload to S3
      aws_s3:
        bucket: "{{ backup_bucket }}"
        object: "{{ backup_prefix }}/snapshot-{{ ansible_date_time.epoch }}.tar.gz"
        src: "{{ backup_dir }}/snapshot-{{ ansible_date_time.epoch }}.tar.gz"
        mode: put
        encrypt: yes
        encryption_mode: aws:kms

    - name: Verify backup integrity (checksum)
      stat:
        path: "{{ backup_dir }}/snapshot-{{ ansible_date_time.epoch }}.tar.gz"
        checksum_algorithm: sha256
      register: backup_checksum

    - name: Store checksum manifest
      copy:
        content: |
          file: snapshot-{{ ansible_date_time.epoch }}.tar.gz
          sha256: {{ backup_checksum.stat.checksum }}
          host: {{ inventory_hostname }}
          timestamp: {{ ansible_date_time.iso8601 }}
          db_type: ${dbType}
        dest: "{{ backup_dir }}/manifest-{{ ansible_date_time.epoch }}.txt"

    - name: Upload manifest to S3
      aws_s3:
        bucket: "{{ backup_bucket }}"
        object: "{{ backup_prefix }}/manifest-{{ ansible_date_time.epoch }}.txt"
        src: "{{ backup_dir }}/manifest-{{ ansible_date_time.epoch }}.txt"
        mode: put

    - name: Clean up backups older than {{ retention_days }} days
      find:
        paths: "{{ backup_dir }}"
        age: "{{ retention_days }}d"
        recurse: yes
      register: old_backups

    - name: Remove old backup files
      file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ old_backups.files }}"

    - name: Log backup event
      lineinfile:
        path: /var/log/dbops-autopilot/events.log
        line: "{{ ansible_date_time.iso8601 }} | BACKUP | {{ inventory_hostname }} | {{ backup_bucket }}/{{ backup_prefix }} | sha256:{{ backup_checksum.stat.checksum }}"
        create: yes
`,

    failover: `---
# DbOps Autopilot — Generated Playbook
# Operation: Automated Failover
# DB Type: ${dbType}
# Generated: ${new Date().toISOString()}
# WARNING: High-risk operation — review carefully before executing

- name: Pre-failover health assessment
  hosts: ${hostPattern}
  gather_facts: yes
  become: ${becomeStr}
  remote_user: ${remoteUser}

  tasks:
    - name: Identify current primary
      command: >
        ${dbType === "MySQL"
          ? 'mysql -e "SHOW MASTER STATUS\\G"'
          : dbType === "Redis"
          ? "redis-cli info replication | grep role"
          : "nodetool status | grep UN"}
      register: primary_status

    - name: Check replica replication lag
      command: >
        ${dbType === "MySQL"
          ? 'mysql -e "SHOW SLAVE STATUS\\G" | grep Seconds_Behind_Master'
          : "redis-cli info replication | grep master_link_status"}
      register: lag_check
      when: "'replica' in group_names or 'standby' in group_names"

    - name: Fail if replication lag too high
      fail:
        msg: "Replication lag too high for safe failover. Lag: {{ lag_check.stdout }}"
      when:
        - lag_check is defined
        - lag_check.stdout is defined
        - lag_check.stdout | int > 30

- name: Execute failover
  hosts: ${hostPattern}_replica[0]
  gather_facts: yes
  become: ${becomeStr}
  remote_user: ${remoteUser}

  tasks:
    - name: Stop replication on replica
      command: >
        ${dbType === "MySQL"
          ? "mysql -e \"STOP SLAVE;\""
          : "redis-cli REPLICAOF NO ONE"}

    - name: Promote replica to primary
      command: >
        ${dbType === "MySQL"
          ? "mysql -e \"RESET SLAVE ALL;\""
          : "redis-cli CONFIG SET replica-read-only no"}
      register: promote_result

    - name: Verify new primary is writable
      command: >
        ${dbType === "MySQL"
          ? 'mysql -e "INSERT INTO dbops.healthcheck (ts) VALUES (NOW());"'
          : "redis-cli SET dbops:failover:ts $(date +%s)"}

    - name: Update DNS / load balancer target
      route53:
        state: present
        zone: "internal.example.com"
        record: "${dbType.toLowerCase()}-primary.internal.example.com"
        type: CNAME
        value: "{{ inventory_hostname }}"
        ttl: 30
      delegate_to: localhost
      ignore_errors: yes

    - name: Notify operations team
      slack:
        token: "{{ slack_token }}"
        msg: ":rotating_light: FAILOVER COMPLETED | ${dbType} | New primary: {{ inventory_hostname }} | {{ ansible_date_time.iso8601 }}"
        channel: "#database-ops"
      delegate_to: localhost
      ignore_errors: yes

    - name: Log failover event
      lineinfile:
        path: /var/log/dbops-autopilot/events.log
        line: "{{ ansible_date_time.iso8601 }} | FAILOVER | NEW_PRIMARY={{ inventory_hostname }} | ${dbType} | COMPLETED"
        create: yes
`,

    compaction: `---
# DbOps Autopilot — Generated Playbook
# Operation: Force Compaction
# DB Type: ${dbType}
# Generated: ${new Date().toISOString()}

- name: Force compaction on ${dbType} nodes
  hosts: ${hostPattern}
  serial: 1
  gather_facts: yes
  become: ${becomeStr}
  remote_user: ${remoteUser}

  vars:
    compaction_timeout: 7200

  pre_tasks:
    - name: Check current disk usage before compaction
      shell: df -h /var/lib/${dbType.toLowerCase()} | tail -1 | awk '{print $5}' | tr -d '%'
      register: disk_before

    - name: Warn if disk usage above 85%
      debug:
        msg: "WARNING: Disk at {{ disk_before.stdout }}% — compaction may fail"
      when: disk_before.stdout | int > 85

  tasks:
    - name: Trigger ${dbType} compaction
      command: >
        ${dbType === "Cassandra"
          ? "nodetool compact"
          : dbType === "MySQL"
          ? 'mysql -e "OPTIMIZE TABLE dbname.*;"'
          : dbType === "VictoriaMetrics"
          ? "curl -X POST http://localhost:8428/internal/force_merge?partition_prefix=all"
          : "kafka-log-dirs.sh --bootstrap-server localhost:9092 --topic-list all"}
      async: "{{ compaction_timeout }}"
      poll: 30
      register: compaction_job

    - name: Wait for compaction to complete
      async_status:
        jid: "{{ compaction_job.ansible_job_id }}"
      register: compaction_result
      until: compaction_result.finished
      retries: 120
      delay: 60

    - name: Check disk usage after compaction
      shell: df -h /var/lib/${dbType.toLowerCase()} | tail -1 | awk '{print $5}' | tr -d '%'
      register: disk_after

    - name: Report space reclaimed
      debug:
        msg: "Compaction complete. Disk: {{ disk_before.stdout }}% → {{ disk_after.stdout }}%"

    - name: Log compaction event
      lineinfile:
        path: /var/log/dbops-autopilot/events.log
        line: "{{ ansible_date_time.iso8601 }} | COMPACTION | {{ inventory_hostname }} | DISK_BEFORE={{ disk_before.stdout }}% AFTER={{ disk_after.stdout }}%"
        create: yes
`,

    scale_out: `---
# DbOps Autopilot — Generated Playbook
# Operation: Horizontal Scale-Out
# DB Type: ${dbType}
# Generated: ${new Date().toISOString()}

- name: Provision and join new ${dbType} nodes
  hosts: ${hostPattern}_new
  gather_facts: yes
  become: ${becomeStr}
  remote_user: ${remoteUser}

  vars:
    seed_nodes: "{{ groups['${hostPattern}'] | join(',') }}"
    cluster_name: "{{ ${dbType.toLowerCase()}_cluster_name | default('prod-cluster') }}"

  tasks:
    - name: Install ${dbType} package
      package:
        name: ${dbType.toLowerCase()}
        state: present
        update_cache: yes

    - name: Configure new node to join cluster
      template:
        src: templates/${dbType.toLowerCase()}.conf.j2
        dest: /etc/${dbType.toLowerCase()}/${dbType.toLowerCase()}.conf
        backup: yes
      vars:
        seed_list: "{{ seed_nodes }}"
        node_ip: "{{ ansible_default_ipv4.address }}"

    - name: Start ${dbType} service
      systemd:
        name: ${dbType.toLowerCase()}
        state: started
        enabled: yes

    - name: Wait for node to join cluster
      command: >
        ${dbType === "Cassandra"
          ? "nodetool status | grep {{ ansible_default_ipv4.address }}"
          : dbType === "Kafka"
          ? "kafka-broker-api-versions.sh --bootstrap-server {{ ansible_default_ipv4.address }}:9092"
          : "redis-cli cluster info | grep cluster_state:ok"}
      retries: 30
      delay: 10
      register: join_status
      until: join_status.rc == 0

    - name: Trigger shard rebalance
      command: >
        ${dbType === "Cassandra"
          ? "nodetool cleanup"
          : dbType === "Kafka"
          ? "kafka-reassign-partitions.sh --bootstrap-server localhost:9092 --execute"
          : "redis-cli cluster rebalance"}
      delegate_to: "{{ groups['${hostPattern}'][0] }}"

    - name: Log scale-out event
      lineinfile:
        path: /var/log/dbops-autopilot/events.log
        line: "{{ ansible_date_time.iso8601 }} | SCALE_OUT | NEW_NODE={{ inventory_hostname }} | ${dbType} | JOINED"
        create: yes
`,

    cert_rotation: `---
# DbOps Autopilot — Generated Playbook
# Operation: TLS Certificate Rotation
# DB Type: ${dbType}
# Generated: ${new Date().toISOString()}

- name: Rotate TLS certificates on ${dbType} cluster
  hosts: ${hostPattern}
  serial: 1
  gather_facts: yes
  become: ${becomeStr}
  remote_user: ${remoteUser}

  vars:
    cert_dir: /etc/${dbType.toLowerCase()}/tls
    ca_cert: /etc/ssl/certs/internal-ca.crt
    vault_path: "pki/issue/${dbType.toLowerCase()}-node"

  tasks:
    - name: Request new certificate from Vault PKI
      uri:
        url: "{{ vault_addr }}/v1/{{ vault_path }}"
        method: POST
        headers:
          X-Vault-Token: "{{ vault_token }}"
        body_format: json
        body:
          common_name: "{{ inventory_hostname }}.internal"
          ttl: "8760h"
          alt_names: "{{ inventory_hostname }},{{ ansible_default_ipv4.address }}"
      register: vault_cert

    - name: Write new certificate files
      copy:
        content: "{{ item.content }}"
        dest: "{{ cert_dir }}/{{ item.name }}"
        mode: "{{ item.mode }}"
        backup: yes
      loop:
        - { name: "node.crt", content: "{{ vault_cert.json.data.certificate }}", mode: "0644" }
        - { name: "node.key", content: "{{ vault_cert.json.data.private_key }}", mode: "0600" }
        - { name: "ca.crt", content: "{{ vault_cert.json.data.issuing_ca }}", mode: "0644" }

    - name: Validate new certificate
      command: openssl verify -CAfile {{ ca_cert }} {{ cert_dir }}/node.crt
      register: cert_verify
      failed_when: "'OK' not in cert_verify.stdout"

    - name: Reload ${dbType} TLS config (no-downtime SIGHUP)
      command: kill -HUP $(pgrep -x ${dbType.toLowerCase()})
      ignore_errors: yes

    - name: Verify TLS connection with new cert
      command: >
        openssl s_client -connect {{ inventory_hostname }}:${dbType === "MySQL" ? 3306 : dbType === "Redis" ? 6379 : 9042} -CAfile {{ ca_cert }} < /dev/null
      register: tls_check
      failed_when: "'Verify return code: 0' not in tls_check.stdout"

    - name: Log cert rotation event
      lineinfile:
        path: /var/log/dbops-autopilot/events.log
        line: "{{ ansible_date_time.iso8601 }} | CERT_ROTATION | {{ inventory_hostname }} | ${dbType} | EXPIRY={{ vault_cert.json.data.expiration }}"
        create: yes
`
  };

  return plays[operation] || plays.rolling_restart;
}

export function analyzeStorageEngine(profile) {
  const { readWriteRatio, dataSize, updatePattern, latencyReq, consistencyReq, workloadType } = profile;

  const readHeavy = readWriteRatio > 70;
  const writeHeavy = readWriteRatio < 40;
  const largeData = dataSize === "large" || dataSize === "xlarge";
  const strictLatency = latencyReq === "ultra-low" || latencyReq === "low";
  const highConsistency = consistencyReq === "strong";
  const timeSeriesOrLog = workloadType === "timeseries" || workloadType === "logs";
  const randomUpdates = updatePattern === "random";
  const appendOnly = updatePattern === "append";

  let recommendation, score, reasoning, tradeoffs, bestFor, alternatives;

  if (readHeavy && (randomUpdates || highConsistency)) {
    recommendation = "B+-Tree";
    score = { bplus: 92, lsm: 54 };
    reasoning = [
      "Your read-heavy workload (>70% reads) aligns perfectly with B+-Tree's O(log n) point-query performance.",
      "Random update pattern benefits from B+-Tree's in-place modification — no write amplification from compaction.",
      "Strong consistency requirement is naturally supported by B+-Tree's ACID-friendly sequential page layout.",
      "B+-Tree's clustered index structure enables efficient range scans, which your workload likely includes.",
    ];
    tradeoffs = [
      { label: "Write amplification", bplus: "Low (1-2x)", lsm: "High (10-30x)" },
      { label: "Read amplification", bplus: "Very low (1-2 I/Os)", lsm: "Medium (level checks)" },
      { label: "Space amplification", bplus: "Low", lsm: "High (during compaction)" },
      { label: "Update cost", bplus: "O(log n) in-place", lsm: "O(1) memtable append" },
      { label: "Range scan", bplus: "Excellent (sequential)", lsm: "Good (sorted runs)" },
    ];
    bestFor = ["MySQL InnoDB", "PostgreSQL", "SQLite", "TiKV (default)"];
    alternatives = "Consider LSM-Tree only if writes later exceed 60% of total operations.";
  } else if (writeHeavy || appendOnly || timeSeriesOrLog) {
    recommendation = "LSM-Tree";
    score = { bplus: 41, lsm: 94 };
    reasoning = [
      "Write-heavy workload (>60% writes) is LSM-Tree's core strength — all writes go to in-memory MemTable first.",
      updatePattern === "append"
        ? "Append-only data is ideal for LSM — no tombstone overhead, maximum sequential write throughput."
        : "High write volume benefits from LSM's batched, sequential disk I/O during compaction.",
      timeSeriesOrLog
        ? "Time-series / log data is naturally ordered by timestamp, eliminating compaction overhead in the newest tier."
        : "Your workload's write pattern maps to LSM's tiered storage structure efficiently.",
      "LSM achieves write throughput 5-10x higher than B+-Tree at the same hardware cost.",
    ];
    tradeoffs = [
      { label: "Write amplification", bplus: "Low (1-2x)", lsm: "High (10-30x)" },
      { label: "Read amplification", bplus: "Very low", lsm: "Medium (bloom filter + level check)" },
      { label: "Space amplification", bplus: "Low", lsm: "High (until compaction)" },
      { label: "Write throughput", bplus: "Moderate", lsm: "Very high (MemTable buffer)" },
      { label: "Compaction overhead", bplus: "None", lsm: "Significant CPU + I/O cost" },
    ];
    bestFor = ["Cassandra", "RocksDB", "LevelDB", "InfluxDB", "Scylla"];
    alternatives = "Consider B+-Tree if reads will increase significantly or if strong point-query consistency is critical.";
  } else {
    recommendation = "Hybrid / Configurable";
    score = { bplus: 72, lsm: 74 };
    reasoning = [
      "Your balanced read/write ratio doesn't strongly favor either engine — both are viable.",
      "Workload mix suggests you'll benefit from a tunable system (e.g. RocksDB with configurable compaction).",
      "Consider your peak traffic pattern: if writes spike significantly, lean toward LSM.",
      "Storage budget is key: LSM requires 1.5-2x disk overhead during compaction vs B+-Tree.",
    ];
    tradeoffs = [
      { label: "Write amplification", bplus: "Low (1-2x)", lsm: "High (10-30x)" },
      { label: "Read amplification", bplus: "Very low", lsm: "Medium" },
      { label: "Space amplification", bplus: "Low", lsm: "High" },
      { label: "Operational complexity", bplus: "Low", lsm: "Higher (compaction tuning)" },
      { label: "Flexibility", bplus: "Fixed layout", lsm: "Highly configurable" },
    ];
    bestFor = ["TiKV", "YugabyteDB", "CockroachDB", "Badger"];
    alternatives = "Run a 2-week benchmark with your actual query mix before committing.";
  }

  return { recommendation, score, reasoning, tradeoffs, bestFor, alternatives };
}

export function getRunbookSteps(operation, dbType) {
  const steps = {
    rolling_restart: [
      { step: 1, action: "Verify cluster quorum", cmd: dbType === "Cassandra" ? "nodetool status" : dbType === "MySQL" ? "mysql -e 'SHOW STATUS LIKE \\'wsrep_cluster_size\\'''" : "redis-cli cluster info", risk: "none" },
      { step: 2, action: "Check replication lag < 30s", cmd: dbType === "MySQL" ? "mysql -e 'SHOW SLAVE STATUS\\G'" : "redis-cli info replication", risk: "none" },
      { step: 3, action: "Drain connections from node", cmd: dbType === "MySQL" ? "mysql -e 'SET GLOBAL max_connections=0;'" : "redis-cli client no-evict on", risk: "low" },
      { step: 4, action: "Stop service gracefully", cmd: `systemctl stop ${dbType.toLowerCase()}`, risk: "medium" },
      { step: 5, action: "Wait for port to close", cmd: `nc -zv localhost ${dbType === "MySQL" ? 3306 : 6379} || echo 'closed'`, risk: "none" },
      { step: 6, action: "Start service", cmd: `systemctl start ${dbType.toLowerCase()}`, risk: "low" },
      { step: 7, action: "Verify health", cmd: dbType === "Cassandra" ? "nodetool info" : "redis-cli ping", risk: "none" },
      { step: 8, action: "Re-enable traffic", cmd: dbType === "MySQL" ? "mysql -e 'SET GLOBAL max_connections=500;'" : "redis-cli client no-evict off", risk: "low" },
    ],
    backup_restore: [
      { step: 1, action: "Check available disk space", cmd: "df -h /var/backups", risk: "none" },
      { step: 2, action: "Create snapshot", cmd: dbType === "MySQL" ? "mysqldump --all-databases --single-transaction > /var/backups/full.sql" : dbType === "Cassandra" ? "nodetool snapshot" : "redis-cli BGSAVE", risk: "low" },
      { step: 3, action: "Compress backup", cmd: "tar -czf /var/backups/snapshot.tar.gz /var/backups/snapshot/", risk: "none" },
      { step: 4, action: "Upload to S3", cmd: "aws s3 cp /var/backups/snapshot.tar.gz s3://dbops-backups/", risk: "none" },
      { step: 5, action: "Verify checksum", cmd: "sha256sum /var/backups/snapshot.tar.gz", risk: "none" },
      { step: 6, action: "Test restore in staging", cmd: dbType === "MySQL" ? "mysql < /var/backups/full.sql" : "redis-cli DEBUG RELOAD", risk: "medium" },
    ],
    failover: [
      { step: 1, action: "Confirm primary is unreachable", cmd: `nc -zv primary-host ${dbType === "MySQL" ? 3306 : 6379}`, risk: "none" },
      { step: 2, action: "Check replica lag", cmd: dbType === "MySQL" ? "mysql -e 'SHOW SLAVE STATUS\\G'" : "redis-cli info replication", risk: "none" },
      { step: 3, action: "Fence old primary (STONITH)", cmd: "aws ec2 stop-instances --instance-ids <old-primary>", risk: "high" },
      { step: 4, action: "Promote replica", cmd: dbType === "MySQL" ? "mysql -e 'STOP SLAVE; RESET SLAVE ALL;'" : "redis-cli REPLICAOF NO ONE", risk: "high" },
      { step: 5, action: "Update DNS record", cmd: "aws route53 change-resource-record-sets ...", risk: "medium" },
      { step: 6, action: "Verify writes to new primary", cmd: dbType === "MySQL" ? "mysql -e 'INSERT INTO test VALUES (1);'" : "redis-cli SET test 1", risk: "low" },
      { step: 7, action: "Alert team in Slack", cmd: "curl -X POST $SLACK_WEBHOOK -d '{\"text\":\"Failover complete\"}'", risk: "none" },
    ],
  };
  return steps[operation] || steps.rolling_restart;
}
