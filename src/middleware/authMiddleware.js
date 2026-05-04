const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // 1. Ambil header 'Authorization' dari request yang dikirim frontend
  const authHeader = req.headers['authorization'];
  
  // 2. Pisahkan tulisan "Bearer" dan ambil tokennya saja
  // (Format normalnya: "Bearer <token_jwt_yang_panjang>")
  const token = authHeader && authHeader.split(' ')[1];

  // 3. Kalau token tidak ada, langsung tolak (401 Unauthorized)
  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak! Token tidak ditemukan.' });
  }

  try {
    // 4. Periksa keaslian token menggunakan kunci rahasia
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rahasia_negara');
    
    // 5. Kalau token asli, simpan data (userId & email) ke dalam req.user
    // Biar nanti bisa dibaca oleh fungsi lain yang membutuhkannya
    req.user = decoded;
    
    // 6. Silakan lewat! (Pindah ke fungsi selanjutnya)
    next();
  } catch (error) {
    // Kalau token palsu, hasil editan, atau sudah basi (kedaluwarsa)
    return res.status(403).json({ message: 'Token tidak valid atau sudah kedaluwarsa!' });
  }
};

module.exports = {
  authenticateToken
};
