const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Wajib Login!
router.use(authenticateToken);

// GET /api/dashboard -> Ambil 1 paket data lengkap
router.get('/', dashboardController.getDashboardSummary);

module.exports = router;
