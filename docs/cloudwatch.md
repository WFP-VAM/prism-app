# CloudWatch Monitoring

The PRISM API EC2 instance runs the [Amazon CloudWatch Agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html) to collect system-level metrics and ship logs to CloudWatch. This page documents the current setup and how to create your own dashboards.

## What's Currently Being Collected

### Metrics (namespace `PRISM/EC2`)

| Metric | Interval | Notes |
|--------|----------|-------|
| `cpu_usage_user` | 60 s | User-space CPU (total, not per-core) |
| `cpu_usage_system` | 60 s | Kernel CPU |
| `cpu_usage_idle` | 60 s | Idle CPU |
| `mem_used_percent` | 60 s | RAM usage |
| `mem_available_percent` | 60 s | RAM available |
| `swap_used_percent` | 60 s | Swap usage |
| `disk_used_percent` | 300 s | Root `/` (ext4, `nvme0n1p1`) |
| `disk_inodes_free` | 300 s | Free inodes on `/` |

All metrics are dimensioned by `InstanceId`. Disk metrics also carry `path`, `device`, and `fstype` dimensions.

> **Built-in EC2 metrics** (namespace `AWS/EC2`) like `NetworkIn` / `NetworkOut` are available without the agent — AWS publishes them automatically.

### Log Groups

| Log Group | Source File | Purpose |
|-----------|------------|---------|
| `/prism/ec2/syslog` | `/var/log/syslog` | OS-level system logs |
| `/prism/api/auto-deploy` | `/home/ubuntu/prism-app/api/auto_deploy.log` | Auto-deploy cron output |

Both log streams are named after the instance ID (`i-081e7445cfb0cc47b`).

## Existing Dashboards

| Dashboard | Contents |
|-----------|----------|
| [PRISM-API](https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#dashboards/dashboard/PRISM-API) | CPU utilization, memory usage, disk usage, network I/O, auto-deploy log tail |
| [PrismServerContainer](https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#dashboards/dashboard/PrismServerContainer) | Empty placeholder (reserved for future container metrics) |

## Quick Start: Creating Your Own Dashboard

### Option A: AWS Console (fastest)

1. Open [CloudWatch → Dashboards](https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#dashboards:) in `eu-central-1`.
2. Click **Create dashboard**, pick a name (e.g. `PRISM-MyFeature`).
3. Add a widget → **Metrics** → browse the `PRISM/EC2` namespace → select metrics and instance.
4. For log widgets, choose **Logs table** and query from `/prism/ec2/syslog` or `/prism/api/auto-deploy`.

### Option B: AWS CLI

Create a dashboard from a JSON definition:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name "PRISM-MyFeature" \
  --dashboard-body file://my-dashboard.json
```

Here's a minimal dashboard body to get started — a single memory widget:

```json
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Memory Usage",
        "metrics": [
          ["PRISM/EC2", "mem_used_percent", "InstanceId", "i-081e7445cfb0cc47b"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "eu-central-1",
        "view": "timeSeries",
        "yAxis": { "left": { "min": 0, "max": 100 } }
      }
    }
  ]
}
```

To add a Logs Insights widget:

```json
{
  "type": "log",
  "x": 0,
  "y": 6,
  "width": 24,
  "height": 6,
  "properties": {
    "title": "Recent Syslog",
    "query": "SOURCE '/prism/ec2/syslog' | fields @timestamp, @message | sort @timestamp desc | limit 50",
    "region": "eu-central-1",
    "view": "table"
  }
}
```

### Useful Logs Insights queries

```sql
-- Errors in syslog (last 1 hour)
SOURCE '/prism/ec2/syslog'
| fields @timestamp, @message
| filter @message like /(?i)error/
| sort @timestamp desc
| limit 100
```

```sql
-- Auto-deploy activity
SOURCE '/prism/api/auto-deploy'
| fields @timestamp, @message
| sort @timestamp desc
| limit 25
```

## Where to Find Things

| What | Console URL |
|------|-------------|
| All dashboards | [CloudWatch → Dashboards](https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#dashboards:) |
| PRISM/EC2 metrics | [CloudWatch → Metrics → PRISM/EC2](https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#metricsV2?graph=~()&namespace=PRISM/EC2) |
| Syslog log group | [CloudWatch → Log groups → /prism/ec2/syslog](https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#logsV2:log-groups/log-group/$252Fprism$252Fec2$252Fsyslog) |
| Auto-deploy log group | [CloudWatch → Log groups → /prism/api/auto-deploy](https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#logsV2:log-groups/log-group/$252Fprism$252Fapi$252Fauto-deploy) |
| Logs Insights | [CloudWatch → Logs Insights](https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#logsV2:logs-insights) |

## Adding New Metrics or Logs

The agent config lives on the instance at:

```
/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/file_amazon-cloudwatch-agent.json
```

Current configuration:

```json
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "namespace": "PRISM/EC2",
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}"
    },
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60,
        "totalcpu": true
      },
      "mem": {
        "measurement": ["mem_used_percent", "mem_available_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["used_percent", "inodes_free"],
        "metrics_collection_interval": 300,
        "resources": ["/"]
      },
      "swap": {
        "measurement": ["swap_used_percent"]
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/prism/ec2/syslog",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/home/ubuntu/prism-app/api/auto_deploy.log",
            "log_group_name": "/prism/api/auto-deploy",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
```

### To add a new log file

Add an entry to `logs.logs_collected.files.collect_list`:

```json
{
  "file_path": "/path/to/your/logfile.log",
  "log_group_name": "/prism/your-service/name",
  "log_stream_name": "{instance_id}",
  "timezone": "UTC"
}
```

### To add a new metric

Add a section under `metrics.metrics_collected`. See the [CloudWatch Agent configuration reference](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html) for available plugins (e.g. `net`, `netstat`, `processes`, `procstat` for per-process monitoring).

### Apply changes

SSH into the instance and restart the agent:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/file_amazon-cloudwatch-agent.json
```

Verify it's running:

```bash
sudo systemctl status amazon-cloudwatch-agent
```

## Setting Up Alarms (future)

No alarms are configured yet. When you're ready, create alarms on key metrics:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "PRISM-HighMemory" \
  --namespace "PRISM/EC2" \
  --metric-name "mem_used_percent" \
  --dimensions Name=InstanceId,Value={instance id} \
  --statistic Average \
  --period 300 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions "arn:aws:sns:eu-central-1:{account id}:your-topic"
```

See [Creating CloudWatch Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html) for SNS integration and notification setup.

## AWS Documentation References

| Topic | Link |
|-------|------|
| CloudWatch Agent overview | [Installing the CloudWatch Agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html) |
| Installing on EC2 (command line) | [Download and Configure the Agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-cloudwatch-agent-commandline.html) |
| Agent configuration reference | [Agent Configuration File Reference](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html) |
| Metrics collected by the agent | [Metrics Collected by the Agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html) |
| CloudWatch concepts (metrics, namespaces, dimensions) | [Amazon CloudWatch Concepts](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html) |
| Creating dashboards | [Create a CloudWatch Dashboard](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create_dashboard.html) |
| Dashboard body structure | [Dashboard Body Structure and Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html) |
| Logs Insights query syntax | [CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html) |
| Custom metrics via StatsD | [Retrieve Custom Metrics with StatsD](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-custom-metrics-statsd.html) |
| Creating alarms | [Using Amazon CloudWatch Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html) |
