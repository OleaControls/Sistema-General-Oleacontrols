import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-change-this';

/**
 * Signs a JWT for a user.
 * @param {Object} user 
 * @returns {String} token
 */
export function signToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      roles: user.roles 
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  );
}

/**
 * Verifies a JWT token.
 * @param {String} token 
 * @returns {Object|null} decoded payload or null
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Hashes a plain text password.
 * @param {String} password 
 * @returns {Promise<String>} hashed password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * Compares a plain text password with a hashed password.
 * @param {String} password 
 * @param {String} hashed 
 * @returns {Promise<Boolean>}
 */
export async function comparePassword(password, hashed) {
  return await bcrypt.compare(password, hashed);
}

/**
 * API Middleware/Helper to ensure the user is authenticated.
 * @param {import('http').IncomingMessage} req 
 * @param {import('http').ServerResponse} res 
 * @returns {Object|null} user if authenticated, otherwise null
 */
export function authMiddleware(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token missing or invalid' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Token expired or invalid' });
    return null;
  }

  return decoded;
}
