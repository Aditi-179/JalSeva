# AquaAlert — CloudWatch Monitoring & Alarm Guide

This guide describes configuring real-time observability, application logging, and automated CloudWatch alarms for the AquaAlert system.

---

## 1. Monitoring Strategy

AquaAlert utilizes Amazon CloudWatch across three observability pillars:
1. **Infrastructure Metrics**: EC2 CPU utilization, network I/O, disk read/write throughput.
2. **Health Check Alarm**: Triggered when EC2 CPU exceeds 80% over a 5-minute evaluation window.
3. **Automated SNS Alerts**: CloudWatch publishes alarm states directly to the `AquaAlert-Incidents-Topic` SNS topic, notifying engineering staff via email.
4. **Application Logs**: PM2 / systemd / Express logs forwarded to CloudWatch Logs group `/aws/ec2/aquaalert`.

---

## 2. Step-by-Step AWS Console Setup: High CPU CloudWatch Alarm

### Step 1: Open CloudWatch Alarms
1. Navigate to the **CloudWatch Console** in your AWS region.
2. In the left navigation pane, select **Alarms** > **All alarms**.
3. Click **Create alarm**.

### Step 2: Select Metric
1. Click **Select metric**.
2. Select **EC2** > **Per-Instance Metrics**.
3. Locate your AquaAlert EC2 instance by Instance ID or Name (`AquaAlert-Web-Server`).
4. Select the metric named **CPUUtilization**.
5. Click **Select metric**.

### Step 3: Configure Alarm Conditions
- **Metric Name**: `CPUUtilization`
- **InstanceId**: `<Your-EC2-Instance-ID>`
- **Statistic**: `Average`
- **Period**: `5 minutes`
- **Threshold type**: `Static`
- **Whenever CPUUtilization is**: `Greater than...`
- **Define threshold value**: `80` (Represents 80% average CPU usage)
- **Datapoints to alarm**: `1 out of 1` (Trigger if average remains above 80% for 5 minutes).
- Click **Next**.

### Step 4: Configure Alarm Notification Actions
1. Under **Alarm state trigger**, choose **In alarm**.
2. Under **Send a notification to the following SNS topic**:
   - Choose **Select an existing SNS topic**.
   - Select: `AquaAlert-Incidents-Topic`.
3. *(Optional)* Add a notification for **OK** state so administrators are alerted when CPU stabilizes.
4. Click **Next**.

### Step 5: Name and Review
- **Alarm name**: `AquaAlert-EC2-HighCPU-Utilization`
- **Alarm description**: `Triggers an alert when the AquaAlert EC2 instance exceeds 80% CPU utilization for 5 continuous minutes, indicating traffic spike, denial-of-service, or compute exhaustion.`
- Click **Next**, review summary, and click **Create alarm**.

---

## 3. Configuring CloudWatch Unified Logs Agent on EC2 (Optional)

To stream Express application access logs and errors to CloudWatch:

1. SSH into the EC2 instance:
```bash
sudo apt install -y amazon-cloudwatch-agent
```

2. Create agent configuration file:
```bash
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```
Paste configuration:
```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/aquaalert/nginx/access",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/aquaalert/nginx/error",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/root/.pm2/logs/aquaalert-error.log",
            "log_group_name": "/aquaalert/app/error",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

3. Start and enable CloudWatch Agent:
```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

---

## 4. Testing the Alarm Simulation

You can simulate a brief CPU spike on EC2 using the standard Linux `stress` tool to verify SNS notification delivery:
```bash
sudo apt install -y stress
# Run 100% CPU load across 2 cores for 6 minutes
stress --cpu 2 --timeout 360s
```

After 5 minutes, CloudWatch will transition `AquaAlert-EC2-HighCPU-Utilization` to the **ALARM** state and transmit an alert email to your subscribed address.

