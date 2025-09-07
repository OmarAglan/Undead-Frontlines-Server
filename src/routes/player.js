const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// === NEW: GET /api/player/profile ===
// Fetches the main user profile and a list of their characters.
// Useful for the character selection screen.
router.get('/profile', async (req, res) => {
  const userId = req.user.id;
  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        characters: {
          select: {
            id: true,
            name: true,
            level: true,
            country: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.json(userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// === NEW: GET /api/player/characters ===
// A simpler route to just get the list of characters.
router.get('/characters', async (req, res) => {
  const userId = req.user.id;
  try {
    const characters = await prisma.character.findMany({
      where: { userId: userId },
      select: {
        id: true,
        name: true,
        level: true,
        country: {
          select: {
            name: true,
          },
        },
      },
    });
    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters.' });
  }
});

// POST /api/player/character (from previous step)
// Creates a new character for the logged-in user.
router.post('/character', async (req, res) => {
  const userId = req.user.id;
  const { name, countryId } = req.body;

  if (!name || !countryId) {
    return res.status(400).json({ error: 'Character name and countryId are required.' });
  }

  try {
    const country = await prisma.country.findUnique({ where: { id: countryId } });
    if (!country) {
      return res.status(404).json({ error: 'Country not found.' });
    }

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