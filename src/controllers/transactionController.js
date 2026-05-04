const prisma = require('../config/prisma');

// 1. Buat Transaksi Baru
const createTransaction = async (req, res) => {
  try {
    const { type, amount, category, date, goalId } = req.body;
    const userId = req.user.userId;

    // Validasi sederhana
    if (!type || !amount || !category || !date) {
      return res.status(400).json({ message: 'Tipe, nominal, kategori, dan tanggal wajib diisi!' });
    }

    // Simpan riwayat transaksi ke database
    const newTransaction = await prisma.transaction.create({
      data: {
        userId,
        type, // Isinya harus "INCOME" atau "EXPENSE"
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        goalId: goalId || null // Opsional: kalau kosong, nilainya null
      }
    });

    // ==========================================
    // OTOMATISASI SULAP TABUNGAN (MAGIC) 🪄
    // ==========================================
    // Kalau user mencatat Pengeluaran (EXPENSE) dan menyelipkan ID Tabungan (goalId)
    if (goalId && type === 'EXPENSE') {
      // Cari tabungan aslinya
      const existingGoal = await prisma.goal.findUnique({
        where: { id: goalId }
      });

      if (existingGoal) {
        // Otomatis tambahkan saldo ke dalam tabungan tersebut!
        await prisma.goal.update({
          where: { id: goalId },
          data: {
            currentAmount: existingGoal.currentAmount + parseFloat(amount)
          }
        });
      }
    }

    res.status(201).json({ 
      message: 'Transaksi berhasil dicatat dan disinkronkan!', 
      transaction: newTransaction 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// 2. Lihat Riwayat Transaksi
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Fitur tambahan: bisa filter berdasarkan tipe (Pemasukan aja atau Pengeluaran aja)
    // Lewat URL, misal: /api/transactions?type=INCOME
    const { type } = req.query;

    // Menyiapkan keranjang filter
    const filter = { userId };
    if (type) {
      filter.type = type; 
    }

    const transactions = await prisma.transaction.findMany({
      where: filter,
      orderBy: { date: 'desc' }, // Urutkan dari yang terbaru
      include: {
        goal: true // Tampilkan sekalian data tabungannya (kalau ada)
      }
    });

    res.json({ transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

module.exports = {
  createTransaction,
  getTransactions
};
