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

// GET /api/world/governorates/:countryId
router.get('/governorates/:countryId', async (req, res) => {
  const { countryId } = req.params;
  const governorates = await prisma.governorate.findMany({
    where: { countryId },
    select: { id: true, name: true, progress: true }
  });
  res.json(governorates);
});

// GET /api/world/cities/:governorateId
router.get('/cities/:governorateId', async (req, res) => {
  const { governorateId } = req.params;
  const cities = await prisma.city.findMany({
    where: { governorateId },
    select: { id: true, name: true, status: true, progress: true }
  });
  res.json(cities);
});

// POST /api/world/join-city
router.post('/join-city', (req, res) => {
  // In production, a matchmaker would assign a FishNet server instance here
  const { cityId } = req.body;
  if (!cityId) {
    return res.status(400).json({ error: 'cityId is required' });
  }
  // For now, return a placeholder FishNet server address
  return res.json({ success: true, cityServer: process.env.SECTOR_FISHNET || '127.0.0.1:7777' });
});

module.exports = router;