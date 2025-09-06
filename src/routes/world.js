// src/routes/world.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/world/countries
router.get('/countries', async (req, res) => {
  const countries = await prisma.country.findMany({
    select: { id: true, name: true, progress: true, safeZoneHost: true }
  });
  res.json(countries);
});

// GET /api/world/sectors/:countryId
router.get('/sectors/:countryId', async (req, res) => {
  const { countryId } = req.params;
  const sectors = await prisma.sector.findMany({ where: { countryId } });
  res.json(sectors);
});

// POST /api/world/join-sector
router.post('/join-sector', async (req, res) => {
  // in prod matchmaker assigns a FishNet server instance
  const { sectorId } = req.body;
  // Temporary: return a placeholder FishNet server address (replace with real matchmaker)
  return res.json({ success: true, sectorServer: process.env.SECTOR_FISHNET || '127.0.0.1:7777' });
});

module.exports = router;
