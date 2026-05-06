const prisma = require('../config/prisma');

// ==========================================
// HELPER: LOGIKA INTI TABUNGAN (CORE LOGIC)
// ==========================================
const injectGoalLogic = (goal) => {
  // 1. Hitung Progress (%)
  let progress = (goal.currentAmount / goal.targetAmount) * 100;
  progress = parseFloat(progress.toFixed(2)); // Bulatkan max 2 angka di belakang koma

  // 2. Hitung Expected Saving (Harapan Tabungan)
  const today = new Date();
  const createdDate = new Date(goal.createdAt);
  
  // Hitung sudah berapa bulan berlalu sejak dibuat
  let monthsElapsed = (today.getFullYear() - createdDate.getFullYear()) * 12;
  monthsElapsed -= createdDate.getMonth();
  monthsElapsed += today.getMonth();

  if (monthsElapsed < 0) monthsElapsed = 0;

  // Harapan tabungan = bulan berlalu dikali target bulanan
  const expectedSaving = monthsElapsed * goal.monthlyTarget;

  // 3. Tentukan Status
  let status = 'Behind';
  if (goal.currentAmount >= goal.targetAmount) {
    status = 'Completed'; // Sudah lunas!
  } else if (goal.currentAmount >= expectedSaving) {
    status = 'On Track'; // Tepat waktu / Aman
  }

  // Kembalikan semua data asli ditambah 3 data hasil hitungan
  return {
    ...goal,
    progressPercent: progress,
    expectedSaving: expectedSaving,
    status: status
  };
};

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

    // Menyuntikkan Core Logic ke setiap tabungan yang ditemukan
    const goalsWithLogic = goals.map(injectGoalLogic);

    res.json({ goals: goalsWithLogic });
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

    // Menyuntikkan Core Logic ke detail tabungan
    const goalWithLogic = injectGoalLogic(goal);

    res.json({ goal: goalWithLogic });
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

    // ==========================================
    // SINKRONISASI KE RIWAYAT TRANSAKSI 🪄
    // ==========================================
    // Catat setoran ini sebagai pengeluaran (karena uang keluar dari dompet utama ke tabungan)
    await prisma.transaction.create({
      data: {
        userId,
        type: 'EXPENSE',
        amount: parseFloat(amount),
        category: `Setor Tabungan: ${existingGoal.name}`,
        date: new Date(),
        goalId: existingGoal.id
      }
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
  addSavings,
  injectGoalLogic // Diekspor untuk dipakai oleh dashboard
};
