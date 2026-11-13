# AquaAlert — AWS EC2 & Cloud Deployment Guide

This guide walks through deploying the complete **AquaAlert** system on Amazon Web Services using Amazon EC2, Amazon RDS MySQL, Amazon S3, Amazon SNS, and AWS Systems Manager Parameter Store.

---

## Prerequisites
- An active AWS Account with administrator access.
- AWS CLI configured locally (`aws configure`) or using AWS Management Console.
- SSH Key Pair created in your target AWS Region (e.g., `us-east-1`).

---

## Step 1: Create Custom Amazon VPC & Networking

1. Open **VPC Console** > **Create VPC**.
2. Select **VPC and more**:
   - **Name tag**: `AquaAlert-VPC`
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - **Number of Availability Zones (AZs)**: `2`
   - **Number of public subnets**: `1` (CIDR: `10.0.1.0/24` in `us-east-1a`)
   - **Number of private subnets**: `2` (CIDR: `10.0.2.0/24` in `us-east-1a`, `10.0.3.0/24` in `us-east-1b`)
   - **NAT gateways**: `None` *(Saves ~$32/month; EC2 is in public subnet)*
   - **VPC Endpoints**: `None`
3. Click **Create VPC**.

---

## Step 2: Configure Security Groups

### 1. EC2 Web Security Group (`AquaAlert-EC2-SG`)
- **VPC**: `AquaAlert-VPC`
- **Inbound Rules**:
  - `HTTP` (Port 80) from `0.0.0.0/0`
  - `HTTPS` (Port 443) from `0.0.0.0/0`
  - `SSH` (Port 22) from `Your-IP/32` (or authorized administrative CIDR)
- **Outbound Rules**:
  - `All traffic` to `0.0.0.0/0`

### 2. RDS Database Security Group (`AquaAlert-RDS-SG`)
- **VPC**: `AquaAlert-VPC`
- **Inbound Rules**:
  - `MySQL/Aurora` (Port 3306) -> **Source**: Select `AquaAlert-EC2-SG` (Custom security group reference `sg-xxxx`)
- **Outbound Rules**: None needed.

---

## Step 3: Create Amazon RDS MySQL Instance

1. Open **RDS Console** > **Subnet groups** > **Create DB Subnet Group**:
   - **Name**: `aquaalert-rds-subnet-group`
   - **VPC**: `AquaAlert-VPC`
   - **Subnets**: Select the 2 Private Subnets created in Step 1 (`10.0.2.0/24` and `10.0.3.0/24`).
2. Open **RDS Console** > **Databases** > **Create database**:
   - **Engine**: MySQL (Version 8.0)
   - **Templates**: **Free tier**
   - **DB instance identifier**: `aquaalert-db`
   - **Master username**: `aquaadmin`
   - **Master password**: Generate a secure password (e.g., `AquaSecure2026!`)
   - **Instance configuration**: `db.t4g.micro` or `db.t3.micro`
   - **Storage**: General Purpose SSD (gp3), 20 GiB (Disable storage autoscaling to avoid unexpected costs)
   - **Connectivity**:
     - **VPC**: `AquaAlert-VPC`
     - **DB Subnet Group**: `aquaalert-rds-subnet-group`
     - **Public access**: **No** *(strictly private)*
     - **VPC security group**: Choose `AquaAlert-RDS-SG`
   - **Initial database name**: `aquaalert_db`
   - **Backup retention**: 7 days (Automated daily snapshot)
3. Click **Create database** (Takes ~5-10 minutes to become available).
4. Note the generated **Endpoint** (e.g., `aquaalert-db.cxxxx.us-east-1.rds.amazonaws.com`).

---

## Step 4: Create Private Amazon S3 Bucket

1. Open **S3 Console** > **Create bucket**:
   - **Bucket name**: `aquaalert-incident-photos-[YOUR_ACCOUNT_ID]` (Must be globally unique)
   - **Region**: Same as EC2/RDS (e.g., `us-east-1`)
   - **Block Public Access**: Keep **all 4 checkboxes checked** *(strict private bucket)*
   - **Default encryption**: SSE-S3
2. Click **Create bucket**.
3. Configure **CORS** (Permissions tab > Cross-origin resource sharing):
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## Step 5: Create Amazon SNS Alert Topic

1. Open **SNS Console** > **Topics** > **Create topic**:
   - **Type**: Standard
   - **Name**: `AquaAlert-Incidents-Topic`
2. Open the created topic > **Create subscription**:
   - **Protocol**: Email
   - **Endpoint**: Enter the municipal response email address (e.g., your email for testing)
3. Check your inbox and click **Confirm subscription** in the AWS confirmation email.
4. Copy the **Topic ARN** (e.g., `arn:aws:sns:us-east-1:123456789012:AquaAlert-Incidents-Topic`).

---

## Step 6: Create Systems Manager (SSM) Parameters

1. Open **Systems Manager Console** > **Parameter Store** > **Create parameter**:
   - **Name**: `/aquaalert/prod/db/password`
   - **Type**: `SecureString`
   - **Value**: Your RDS Master Password from Step 3
2. Create second parameter:
   - **Name**: `/aquaalert/prod/jwt/secret`
   - **Type**: `SecureString`
   - **Value**: A random 64-character secret key for JWT signing

---

## Step 7: Create IAM Role for EC2

1. Open **IAM Console** > **Roles** > **Create role**.
2. **Trusted entity**: AWS service -> **EC2**.
3. **Permissions**: Click **Create policy**, paste the contents of `aws/iam-policy.json` (replacing bucket name and SNS ARN with your actual values), name it `AquaAlert-EC2-Policy`.
4. Attach `AquaAlert-EC2-Policy` to your new role.
5. Name the role: `AquaAlert-EC2-Role` and finish.

---

## Step 8: Launch Amazon EC2 Instance

1. Open **EC2 Console** > **Launch Instances**:
   - **Name**: `AquaAlert-Web-Server`
   - **AMI**: Ubuntu Server 22.04 LTS (HVM) or Amazon Linux 2023
   - **Instance type**: `t4g.micro` (ARM) or `t3.micro` (x86) — Free Tier eligible
   - **Key pair**: Select your SSH key
   - **Network settings**:
     - **VPC**: `AquaAlert-VPC`
     - **Subnet**: Select **Public Subnet** (`10.0.1.0/24`)
     - **Auto-assign public IP**: **Enable**
     - **Select existing security group**: `AquaAlert-EC2-SG`
   - **Advanced details**:
     - **IAM instance profile**: Select `AquaAlert-EC2-Role`
2. Launch instance.

---

## Step 9: Configure and Deploy Application on EC2

SSH into your EC2 instance:
```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

Update system and install Node.js 20 & Nginx:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo npm install -g pm2
```

Clone and configure the repository:
```bash
git clone https://github.com/your-org/AquaAlert.git
cd AquaAlert

# 1. Build Frontend
cd frontend
npm install
npm run build
cd ..

# 2. Configure Backend
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with production cloud values:
```bash
nano .env
```
Set:
```ini
PORT=5000
NODE_ENV=production

# Amazon RDS MySQL Endpoint
DB_HOST=aquaalert-db.cxxxx.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=aquaadmin
DB_PASSWORD=AquaSecure2026!
DB_NAME=aquaalert_db
DB_SSL=true

# Amazon S3
AWS_REGION=us-east-1
S3_BUCKET_NAME=aquaalert-incident-photos-[YOUR_ACCOUNT_ID]
USE_LOCAL_STORAGE=false

# Amazon SNS
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:AquaAlert-Incidents-Topic
ENABLE_SNS_NOTIFICATIONS=true

# Systems Manager Parameter Store
USE_SSM_PARAMETER_STORE=true
SSM_DB_PASSWORD_PATH=/aquaalert/prod/db/password
SSM_JWT_SECRET_PATH=/aquaalert/prod/jwt/secret
```

Run database initialization and start with PM2:
```bash
# Initialize RDS tables and seed initial admin user
npm run init-db

# Start backend application process with PM2
pm2 start src/app.js --name "aquaalert"
pm2 save
pm2 startup
```

Configure Nginx reverse proxy to forward port 80 to port 5000:
```bash
sudo nano /etc/nginx/sites-available/aquaalert
```
Add configuration:
```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Enable site and restart Nginx:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/aquaalert /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 10: Verification & Health Check

Open your browser and navigate to:
```
http://<EC2-PUBLIC-IP>/api/health
```
Expected response:
```json
{
  "status": "OK",
  "service": "AquaAlert Cloud API",
  "environment": "production",
  "database": {
    "status": "healthy",
    "engine": "mysql"
  },
  "cloud_services": {
    "s3_bucket": "aquaalert-incident-photos-...",
    "storage_mode": "amazon_s3",
    "sns_notifications": "enabled",
    "ssm_parameter_store": "enabled"
  }
}
```

Now access `http://<EC2-PUBLIC-IP>` to view the live AquaAlert dashboard!

