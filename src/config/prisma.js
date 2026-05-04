require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Membuat satu "jembatan" utama ke database
const prisma = new PrismaClient();

module.exports = prisma;
