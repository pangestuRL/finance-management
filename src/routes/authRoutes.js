const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Menerima kiriman data pendaftaran di alamat: POST /api/auth/register
router.post('/register', authController.register);

// Menerima kiriman data login di alamat: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;
