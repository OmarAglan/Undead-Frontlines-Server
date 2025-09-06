// src/index.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/auth');

const prisma = new PrismaClient();
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
