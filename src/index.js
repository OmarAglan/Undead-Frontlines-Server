// src/index.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// --- Import new modules ---
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/player'); // New player routes
const worldRoutes = require('./routes/world');

const prisma = new PrismaClient();
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// --- Setup Routes ---
// Public routes (no authentication needed)
app.use('/api/auth', authRoutes);
app.use('/api/world', worldRoutes);

// Protected routes (authentication required)
app.use('/api/player', authenticateToken, playerRoutes); // Apply middleware here

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});