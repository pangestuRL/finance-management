const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const authRoutes = require('./routes/authRoutes');

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Memasang rute otentikasi di alamat /api/auth
app.use('/api/auth', authRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'Finance Management API' });
});

module.exports = app;
