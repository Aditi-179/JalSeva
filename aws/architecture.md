# AquaAlert — AWS Cloud Architecture

## 1. Architecture Overview

AquaAlert is architected as a secure, cost-conscious, tier-isolated web application hosted on Amazon Web Services (AWS). It leverages an Amazon EC2 instance deployed inside a public subnet to host both the React/Vite frontend and Node.js Express backend, connected securely to a managed Amazon RDS MySQL instance residing in an isolated private subnet. Citizen-submitted photographic evidence is stored in a private Amazon S3 bucket, with access mediated via IAM instance credentials and time-limited Pre-Signed URLs.

### Architectural Highlights
- **VPC Tier Isolation**: Database is unreachable from the public internet. Only the EC2 instance's security group is permitted access to MySQL port 3306.
- **Cost Conscious**: Eliminates expensive NAT Gateways (~$32+/month) by deploying EC2 directly in a public subnet with an Internet Gateway, while RDS remains protected in private subnets.
- **Zero Hardcoded Secrets**: Secrets (RDS master password, JWT signing secret) can be fetched at startup from AWS Systems Manager (SSM) Parameter Store using the EC2 instance's IAM Role.
- **Event-Driven Alerts**: Amazon SNS publishes immediate alerts to municipal engineers when severe disruptions (High/Critical) are reported.
- **Observability**: CloudWatch monitors EC2 CPU utilization, disk metrics, and application logs with integrated SNS alarm triggers.

---

## 2. Architecture Diagram (Mermaid)

```mermaid
flowchart TD
  subgraph Internet["Public Internet / Citizens & Administrators"]
    Resident["Residents / Citizens<br>(Web Browser)"]
    Admin["Municipal Administrators<br>(Admin Portal)"]
  end

  subgraph AWSCloud["AWS Cloud Platform"]
    subgraph VPC["Custom Amazon VPC (10.0.0.0/16)"]
      IGW["Internet Gateway (IGW)"]

      subgraph PublicSubnet["Public Subnet (10.0.1.0/24)"]
        direction TB
        EC2["Amazon EC2 Instance (t4g.micro / t3.micro)<br>• Nginx Web Proxy (Ports 80/443)<br>• React (Vite Production Build)<br>• Express.js REST API Server (Port 5000)"]
        EC2_SG["EC2 Security Group<br>In: 80, 443, 22<br>Out: 0.0.0.0/0"]
      end

      subgraph PrivateSubnets["Private Subnet Group (10.0.2.0/24 & 10.0.3.0/24)"]
        direction TB
        RDS["Amazon RDS MySQL 8.0 (db.t4g.micro)<br>• aquaalert_db<br>• incidents & admin_users tables<br>• Automated 7-Day Backups"]
        RDS_SG["RDS Security Group<br>In: Port 3306 ONLY from EC2_SG<br>Out: None"]
      end
    end

    subgraph AWSManagedServices["AWS Managed Services"]
      S3["Amazon S3 Bucket<br>• Private Access Only<br>• Incident Photos (/incidents)<br>• Archival Backups (/backups)<br>• Pre-Signed URLs (1h expiry)"]
      SSM["AWS Systems Manager (SSM)<br>Parameter Store<br>• /aquaalert/prod/db/password<br>• /aquaalert/prod/jwt/secret"]
      SNS["Amazon Simple Notification Service (SNS)<br>• Topic: AquaAlert-Incidents-Topic<br>• Email Subscriptions to On-Duty Team"]
      CW["Amazon CloudWatch<br>• CPU Utilization Alarm (> 80%)<br>• Application Error Logs"]
      IAMRole["EC2 IAM Instance Profile<br>• Least-Privilege Policy<br>• S3, SSM, SNS, CloudWatch"]
    end
  end

  %% Traffic Flows
  Resident -->|HTTP/HTTPS Reports & Tracking| IGW
  Admin -->|HTTPS Authenticated Dashboard| IGW
  IGW -->|Route to EC2| EC2
  EC2 -.->|Attached IAM Role| IAMRole
  EC2 -->|SSM Parameter Fetch at Boot| SSM
  EC2 -->|TCP Port 3306 Parameterized Queries| RDS
  EC2 -->|PutObject File Upload| S3
  EC2 -->|Generate Pre-Signed View URL| S3
  EC2 -->|Publish Disruption Alert| SNS
  SNS -->|Email / SMS Dispatch| Admin
  EC2 -->|Metrics & Application Logs| CW
  CW -->|Alarm Trigger (High CPU)| SNS
```

---

## 3. Network & Security Topology

| Component | Subnet / Zone | CIDR Block | Inbound Rules | Outbound Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Internet Gateway** | VPC Edge | `0.0.0.0/0` | Public Traffic | Routed to Public Subnet |
| **Public Subnet** | AZ-a | `10.0.1.0/24` | 80 (HTTP), 443 (HTTPS), 22 (SSH from Admin IP) | `0.0.0.0/0` via IGW |
| **Private Subnet 1** | AZ-a | `10.0.2.0/24` | 3306 from `EC2-Security-Group` | None |
| **Private Subnet 2** | AZ-b | `10.0.3.0/24` | 3306 from `EC2-Security-Group` (RDS Subnet Group requirement) | None |

---

## 4. Security Architecture

1. **Defense in Depth**:
   - RDS has `PubliclyAccessible = false`. Even if credentials were leaked, the database cannot be queried from outside the VPC.
   - RDS Security Group references the **Security Group ID** of EC2 (`sg-xxxx`), preventing IP spoofing.
2. **S3 Private Bucket Policy**:
   - `BlockPublicAcls: true`, `BlockPublicPolicy: true`, `IgnorePublicAcls: true`, `RestrictPublicBuckets: true`.
   - Photos can never be scraped or viewed publicly.
   - Viewing is only allowed through pre-signed URLs generated securely by the backend with a strict 3600-second expiration.
3. **Application Layer Security**:
   - Centralized input validation and parameterized SQL queries to prevent SQL injection.
   - Helmet HTTP headers enabled for XSS, MIME sniffing, and clickjacking protection.
   - Rate limiting on sensitive endpoints (e.g., maximum 10 admin login attempts per 15 minutes).
   - Password hashing via bcrypt with salt rounds of 10.
   - Signed JSON Web Tokens (JWT) for stateless administrator authentication.

