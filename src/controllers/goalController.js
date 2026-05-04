const prisma = require('../config/prisma');

// 1. Buat Target Tabungan Baru (Create)
const createGoal = async (req, res) => {
  try {
    const { name, targetAmount, deadline } = req.body;
    // req.user.userId didapat dari "Satpam" (authMiddleware) yang sudah memeriksa token
    const userId = req.user.userId; 

    // Validasi input: Semuanya harus diisi
    if (!name || !targetAmount || !deadline) {
      return res.status(400).json({ message: 'Nama, Target Uang, dan Tenggat Waktu harus diisi!' });
    }

    // HITUNG OTOMATIS: monthly_target
    const deadlineDate = new Date(deadline);
    const today = new Date();
    
    // Hitung selisih bulan (misal sekarang Jan 2026, deadline Des 2026 = 11 bulan)
    let monthsDiff = (deadlineDate.getFullYear() - today.getFullYear()) * 12;
    monthsDiff -= today.getMonth();
    monthsDiff += deadlineDate.getMonth();

    // Kalau deadlinenya terlalu mepet (kurang dari sebulan), hitung 1 bulan saja
    if (monthsDiff <= 0) {
      monthsDiff = 1;
    }

    // Uang yang harus ditabung tiap bulan = Target Uang / Sisa Bulan
    const monthlyTarget = targetAmount / monthsDiff;

    // Simpan ke database
    const newGoal = await prisma.goal.create({
      data: {
        userId,
        name,
        targetAmount: parseFloat(targetAmount),
        deadline: deadlineDate,
        monthlyTarget: monthlyTarget,
        // currentAmount tidak perlu ditulis di sini, karena otomatis dikasih nilai 0 oleh database
      },
    });

    res.status(201).json({ message: 'Target berhasil dibuat!', goal: newGoal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// 2. Lihat Semua Target Tabungan (Read All)
const getGoals = async (req, res) => {
  try {
    const userId = req.user.userId;

    const goals = await prisma.goal.findMany({
      where: { userId }, // Cuma ambil tabungan milik si user ini aja
      orderBy: { createdAt: 'desc' } // Urutkan dari yang paling baru dibuat
    });

    res.json({ goals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// 3. Lihat Detail Satu Target Tabungan (Read One)
const getGoalDetail = async (req, res) => {
  try {
    const { id } = req.params; // Ambil ID tabungan dari alamat URL
    const userId = req.user.userId;

    const goal = await prisma.goal.findFirst({
      where: { 
        id: id,
        userId: userId // Pastikan target ini benar-benar milik user yang sedang login
      },
    });

    if (!goal) {
      return res.status(404).json({ message: 'Target tabungan tidak ditemukan!' });
    }

    res.json({ goal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// 4. Setor Uang ke Tabungan (Add Savings)
const addSavings = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const userId = req.user.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Nominal setoran tidak valid!' });
    }

    // Cek dulu, targetnya ada nggak? Dan apakah ini milik si user?
    const existingGoal = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existingGoal) {
      return res.status(404).json({ message: 'Target tabungan tidak ditemukan!' });
    }

    // Hitung uang yang terkumpul sekarang (Saldo Lama + Setoran Baru)
    const newCurrentAmount = existingGoal.currentAmount + parseFloat(amount);

    // Update saldonya di database
    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        currentAmount: newCurrentAmount,
      },
    });

    res.json({ message: 'Setoran berhasil dicatat!', goal: updatedGoal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

module.exports = {
  createGoal,
  getGoals,
  getGoalDetail,
  addSavings
};
