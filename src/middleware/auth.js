const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../services/auth');

const prisma = new PrismaClient();

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // Unauthorized
  }

  const payload = verifyToken(token);
  if (payload == null) {
    return res.sendStatus(403); // Forbidden (invalid token)
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.sendStatus(403); // Forbidden (user not found)
    }

    req.user = user; // Attach user to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Error authenticating token:", error);
    return res.sendStatus(500);
  }
}

module.exports = {
  authenticateToken,
};