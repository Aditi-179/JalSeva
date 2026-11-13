# AquaAlert — AWS Cost Analysis & Optimization Breakdown

AquaAlert is deliberately architected to be **100% Free Tier Eligible** or under **$15–$25 per month** if deployed beyond the introductory AWS 12-Month Free Tier.

---

## 1. Itemized Monthly Cost Matrix

| AWS Service | Resource / Tier Configuration | Usage Estimate | Free Tier Covered? | Estimated Cost (Within 12 Mo Free Tier) | Estimated Cost (Post-Free Tier) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Amazon EC2** | `t4g.micro` or `t3.micro` (1 vCPU, 1 GiB RAM) | 750 hours/month (24x7 runtime) | **Yes** (750 hrs/mo free) | **$0.00** | ~$7.50 / month |
| **Amazon EBS** | 20 GiB General Purpose SSD (gp3) root volume | 20 GiB-months | **Yes** (30 GiB free) | **$0.00** | ~$1.60 / month |
| **Amazon RDS** | `db.t4g.micro` MySQL 8.0, Single-AZ, 20 GiB gp3 | 750 hours/month (24x7 runtime) | **Yes** (750 hrs/mo free) | **$0.00** | ~$13.00 / month |
| **Amazon S3** | Standard Storage for photos & backups | 2 GiB storage, 5,000 PUT/GET requests | **Yes** (5 GiB, 20k GET, 2k PUT free) | **$0.00** | ~$0.08 / month |
| **Amazon SNS** | Disruption event notifications & CW alarms | ~500 notifications/month | **Yes** (1M publishes, 1,000 emails free) | **$0.00** | **$0.00** |
| **Systems Manager** | Parameter Store (Standard parameters) | 2 parameters (`db/password`, `jwt/secret`) | **Yes** (Free standard tier) | **$0.00** | **$0.00** |
| **Amazon CloudWatch**| 1 Alarm, 3 log streams, basic metrics | 1 custom alarm, ~100 MB logs | **Yes** (10 alarms, 5GB logs free) | **$0.00** | **$0.00** |
| **VPC & Data Out** | Internet Gateway, 5 GB egress to internet | 5 GB monthly transfer | **Yes** (100 GB egress/mo free) | **$0.00** | **$0.00** |
| **Total Estimated** | **Full Application Stack** | **Continuous Production** | — | **$0.00 / month** | **~$22.18 / month** |

---

## 2. Key Cost-Conscious Architectural Decisions

1. **Elimination of NAT Gateway**:
   - A single AWS NAT Gateway incurs a base hourly charge of ~$0.045/hour (~$32.40/month) plus data processing fees, which is unaffordable for student, prototype, or mini-projects.
   - **AquaAlert Decision**: Deploy EC2 directly into a Public Subnet with a public IP, communicating with RDS through internal private subnet routes. This eliminates the NAT Gateway entirely while keeping RDS strictly private.
2. **Single-AZ RDS Deployment**:
   - Multi-AZ RDS doubles database costs (~$26+/month instead of ~$13/month).
   - **AquaAlert Decision**: Use Single-AZ RDS with automated daily snapshots (7-day retention) and S3 JSON backups, delivering sufficient resilience for non-enterprise civic reporting at zero additional cost.
3. **Pre-Signed URLs Instead of CloudFront CDN**:
   - For small-to-medium municipal volumes, S3 Pre-Signed URLs eliminate the need for an active CloudFront distribution, reducing configuration complexity and DNS latency overhead.
4. **ARM-Based Graviton (t4g.micro)**:
   - Where available in your region, `t4g.micro` instances offer ~20% better performance-per-dollar over equivalent `t3.micro` x86 instances.

---

## 3. Configuring AWS Budgets for Zero-Surprise Protection

To guarantee no unexpected billing spikes occur:

1. Open **AWS Billing & Cost Management** > **Budgets** > **Create budget**.
2. Select **Cost budget (recommended)**.
3. Configuration:
   - **Budget name**: `AquaAlert-Monthly-Limit`
   - **Period**: Monthly
   - **Budgeted amount**: `$10.00`
4. Configure Alerts:
   - Trigger at **80% of budgeted amount ($8.00)**.
   - Enter your email address to receive immediate warning if charges begin accruing.
5. Save budget.

