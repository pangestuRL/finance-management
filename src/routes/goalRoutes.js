const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticateToken } = require('../middleware/authMiddleware');

// PASANG SATPAM DI DEPAN LORONG! 👮‍♂️
// Kode ini artinya: Semua rute di bawah baris ini WAJIB lapor satpam (bawa Token JWT)
// Kalau nggak bawa token, satpam akan langsung nolak sebelum mencapai Controller.
router.use(authenticateToken);

// 1. POST /api/goals -> Bikin target baru
router.post('/', goalController.createGoal);

// 2. GET /api/goals -> Lihat semua target
router.get('/', goalController.getGoals);

// 3. GET /api/goals/:id -> Lihat detail satu target (contoh: /api/goals/123)
router.get('/:id', goalController.getGoalDetail);

// 4. PUT /api/goals/:id/add-savings -> Setor uang ke target tabungan
router.put('/:id/add-savings', goalController.addSavings);

module.exports = router;
