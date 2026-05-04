const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const authRoutes = require('./routes/authRoutes');
const goalRoutes = require('./routes/goalRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Memasang rute otentikasi di alamat /api/auth
app.use('/api/auth', authRoutes);

// Memasang rute goals di alamat /api/goals
app.use('/api/goals', goalRoutes);

// Memasang rute transaksi di alamat /api/transactions
app.use('/api/transactions', transactionRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'Finance Management API' });
});

module.exports = app;
