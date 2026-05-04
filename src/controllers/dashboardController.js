const prisma = require('../config/prisma');
const { injectGoalLogic } = require('./goalController');

const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Menentukan rentang waktu bulan ini (Dari tgl 1 sampai hari terakhir)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // =====================================
    // 1. SUMMARY BULANAN
    // =====================================
    const monthlyTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: firstDay,
          lte: lastDay,
        },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    monthlyTransactions.forEach(t => {
      if (t.type === 'INCOME') totalIncome += t.amount;
      else if (t.type === 'EXPENSE') totalExpense += t.amount;
    });

    const balance = totalIncome - totalExpense;

    // =====================================
    // 2. PROGRESS GOAL (SEMUA GOALS)
    // =====================================
    // Menjawab kekhawatiranmu: Kita kirimkan SEMUA goal, 
    // tapi kita urutkan dari deadline yang paling mendesak (asc).
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { deadline: 'asc' } 
    });

    const goalsProgress = goals.map(injectGoalLogic);

    // =====================================
    // 3. INSIGHTS / WARNINGS (Sistem Pintar)
    // =====================================
    const insights = [];

    // Aturan A: Rasio Pengeluaran vs Pemasukan
    if (totalIncome > 0) {
      const expenseRatio = (totalExpense / totalIncome) * 100;
      if (expenseRatio >= 80) {
        insights.push(`⚠️ Awas! Pengeluaranmu bulan ini sudah mencapai ${expenseRatio.toFixed(1)}% dari total pemasukan.`);
      } else if (expenseRatio <= 40) {
        insights.push(`✅ Keren! Pengeluaranmu sangat terkendali di bawah 40%. Pertahankan!`);
      }
    } else if (totalExpense > 0 && totalIncome === 0) {
      insights.push(`⚠️ Bahaya! Kamu sudah jajan/keluar uang, tapi belum ada pemasukan bulan ini.`);
    }

    // Aturan B: Target Tabungan yang "Behind"
    const behindGoals = goalsProgress.filter(g => g.status === 'Behind');
    if (behindGoals.length > 0) {
      insights.push(`🚨 Perhatian! Kamu punya ${behindGoals.length} target tabungan yang ketinggalan (Behind). Yuk nabung!`);
    }

    // Jika semuanya aman damai
    if (insights.length === 0) {
      insights.push(`🌟 Keuanganmu bulan ini terlihat sangat sehat! Semangat terus!`);
    }

    // =====================================
    // KEMBALIKAN 1 PAKET KOMPLIT KE FRONTEND
    // =====================================
    res.json({
      summary: {
        month: now.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
        totalIncome,
        totalExpense,
        balance
      },
      goalsProgress,
      insights
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat dashboard' });
  }
};

module.exports = {
  getDashboardSummary
};
