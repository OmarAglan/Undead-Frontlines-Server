const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// POST /api/player/character
// This route will be protected by our middleware
router.post('/character', async (req, res) => {
  // The middleware has already verified the user and attached it to req.user
  const userId = req.user.id;
  const { name, countryId } = req.body;

  if (!name || !countryId) {
    return res.status(400).json({ error: 'Character name and countryId are required.' });
  }

  try {
    // Check if the country exists
    const country = await prisma.country.findUnique({ where: { id: countryId } });
    if (!country) {
      return res.status(404).json({ error: 'Country not found.' });
    }

    // Check if the user already has a character with that name
    const existingCharacter = await prisma.character.findFirst({
        where: { userId: userId, name: name }
    });

    if(existingCharacter) {
        return res.status(409).json({ error: 'You already have a character with that name.' });
    }

    const character = await prisma.character.create({
      data: {
        name: name,
        userId: userId,
        countryId: countryId,
        // Optional: add default appearance, class, etc. here
      },
    });

    res.status(201).json(character);
  } catch (error) {
    console.error("Error creating character:", error);
    res.status(500).json({ error: 'Failed to create character.' });
  }
});

module.exports = router;