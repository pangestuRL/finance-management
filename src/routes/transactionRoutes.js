const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// PASANG SATPAM DI DEPAN LORONG! 👮‍♂️
// Semua akses ke transaksi wajib bawa tiket (Token JWT) dari hasil Login
router.use(authenticateToken);

// 1. POST /api/transactions -> Catat transaksi baru
router.post('/', transactionController.createTransaction);

// 2. GET /api/transactions -> Lihat daftar riwayat transaksi
// Bisa ditambah query di URL: /api/transactions?type=INCOME
router.get('/', transactionController.getTransactions);

module.exports = router;
