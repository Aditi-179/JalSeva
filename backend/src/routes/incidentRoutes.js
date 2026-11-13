const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const incidentController = require('../controllers/incidentController');

// POST /api/incidents - Submit a new incident with optional photo
router.post('/', upload.single('photo'), incidentController.createIncident);

// GET /api/incidents - Retrieve incidents with filters and search
router.get('/', incidentController.getIncidents);

// GET /api/incidents/:id - Retrieve incident details
router.get('/:id', incidentController.getIncidentById);

module.exports = router;

