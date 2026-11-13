const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { config, loadSsmParameters } = require('./config');
const { connectDb, query, getActiveEngine } = require('./database/db');
const incidentRoutes = require('./routes/incidentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security and utility middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows frontend to fetch uploaded images
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Static serving for local file uploads (fallback when S3 is disabled or local)
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend build if dist folder exists (EC2 single-instance deployment mode)
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// GET /api/health - Application & Cloud Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'healthy';
  let dbError = null;
  let activeEngine = 'unknown';

  try {
    await query('SELECT 1');
    activeEngine = getActiveEngine();
  } catch (err) {
    dbStatus = 'unhealthy';
    dbError = err.message;
  }

  res.status(dbStatus === 'healthy' ? 200 : 503).json({
    status: dbStatus === 'healthy' ? 'OK' : 'DEGRADED',
    service: 'AquaAlert Cloud API',
    environment: config.nodeEnv,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      engine: activeEngine,
      error: dbError
    },
    cloud_services: {
      s3_bucket: config.aws.s3Bucket,
      storage_mode: config.aws.useLocalStorage ? 'local_storage' : 'amazon_s3',
      sns_notifications: config.aws.enableSns ? 'enabled' : 'disabled',
      ssm_parameter_store: config.ssm.enabled ? 'enabled' : 'disabled'
    }
  });
});

// Centralized 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Resource not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Centralized Error Handler]', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds maximum allowed limit of 5 MB.'
      });
    }
    return res.status(400).json({ success: false, error: err.message });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server Function
async function startServer() {
  try {
    // Optionally load secrets from AWS SSM Parameter Store
    await loadSsmParameters();

    // Connect to Database
    const engine = await connectDb();
    console.log(`[AquaAlert] Database ready with engine: ${engine}`);

    const server = app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(` AquaAlert Server running on port ${config.port}`);
      console.log(` Environment: ${config.nodeEnv}`);
      console.log(` Storage: ${config.aws.useLocalStorage ? 'Local Disk' : 'Amazon S3'}`);
      console.log(` Database: ${engine.toUpperCase()}`);
      console.log(` Health Check: http://localhost:${config.port}/api/health`);
      console.log(`====================================================`);
    });

    // Graceful Shutdown
    const gracefulShutdown = () => {
      console.log('\n[AquaAlert] Initiating graceful shutdown...');
      server.close(() => {
        console.log('[AquaAlert] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    return server;
  } catch (err) {
    console.error('[AquaAlert Startup Error]', err);
    process.exit(1);
  }
}

// Auto-start if run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
