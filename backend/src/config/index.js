const dotenv = require('dotenv');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'aquaalert_db',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    useSqliteFallback: process.env.USE_SQLITE_FALLBACK !== 'false'
  },

  // Auth / JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'aquaalert_jwt_secret_dev_key_1234567890',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Default Admin Credentials
  initialAdmin: {
    username: process.env.INITIAL_ADMIN_USERNAME || 'admin',
    email: process.env.INITIAL_ADMIN_EMAIL || 'admin@aquaalert.gov',
    password: process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123'
  },

  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.S3_BUCKET_NAME || 'aquaalert-incident-photos',
    useLocalStorage: process.env.USE_LOCAL_STORAGE !== 'false',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    snsTopicArn: process.env.SNS_TOPIC_ARN || '',
    enableSns: process.env.ENABLE_SNS_NOTIFICATIONS === 'true'
  },

  // SSM Parameter Store
  ssm: {
    enabled: process.env.USE_SSM_PARAMETER_STORE === 'true',
    dbPasswordPath: process.env.SSM_DB_PASSWORD_PATH || '/aquaalert/prod/db/password',
    jwtSecretPath: process.env.SSM_JWT_SECRET_PATH || '/aquaalert/prod/jwt/secret'
  }
};

/**
 * Optionally initialize secrets from AWS Systems Manager Parameter Store
 * when running on Amazon EC2 with IAM Role.
 */
async function loadSsmParameters() {
  if (!config.ssm.enabled) {
    return;
  }

  try {
    const ssmClient = new SSMClient({ region: config.aws.region });

    // Fetch DB Password
    if (config.ssm.dbPasswordPath) {
      const dbCmd = new GetParameterCommand({
        Name: config.ssm.dbPasswordPath,
        WithDecryption: true
      });
      const dbRes = await ssmClient.send(dbCmd);
      if (dbRes.Parameter && dbRes.Parameter.Value) {
        config.db.password = dbRes.Parameter.Value;
        console.log('[SSM] Successfully loaded DB password from Parameter Store.');
      }
    }

    // Fetch JWT Secret
    if (config.ssm.jwtSecretPath) {
      const jwtCmd = new GetParameterCommand({
        Name: config.ssm.jwtSecretPath,
        WithDecryption: true
      });
      const jwtRes = await ssmClient.send(jwtCmd);
      if (jwtRes.Parameter && jwtRes.Parameter.Value) {
        config.jwt.secret = jwtRes.Parameter.Value;
        console.log('[SSM] Successfully loaded JWT secret from Parameter Store.');
      }
    }
  } catch (err) {
    console.warn('[SSM Warning] Could not retrieve parameters from Parameter Store:', err.message);
    console.warn('[SSM Warning] Continuing with environment variables / fallback.');
  }
}

module.exports = {
  config,
  loadSsmParameters
};

