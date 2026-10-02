import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { rolesEfectivos } from './permisos.js';

/* El .env se lee aquí y no solo en prisma.js. En ESM los imports se evalúan
   antes del cuerpo del módulo, así que si un handler importara este archivo
   antes que prisma.js, el JWT_SECRET todavía no estaría cargado y el arranque
   fallaría por un problema de orden, no de configuración. dotenv no pisa lo ya
   cargado, así que llamarlo dos veces no cuesta nada. */
dotenv.config();

/* Sin valor por defecto, a propósito.
 *
 * Antes esto era `process.env.JWT_SECRET || 'your-default-secret-change-this'`.
 * Si la variable faltaba en cualquier entorno, el sistema arrancaba igual y
 * firmaba las sesiones con un secreto escrito en el repositorio: cualquiera que
 * lo leyera podía emitirse un token de ADMIN válido, y nada lo delataba —todo
 * funcionaba con normalidad—.
 *
 * Un despliegue mal configurado tiene que fallar al arrancar, no seguir
 * atendiendo con la puerta abierta. */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'Falta JWT_SECRET. Sin el secreto no se pueden firmar ni verificar sesiones. ' +
    'Defínelo en el .env (local) y en las variables de entorno de Vercel (producción). ' +
    'Debe ser el mismo valor que usa realtime-server, y sin comillas alrededor.'
  );
}

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
 * Throws an error if the request is not authenticated.
 * Use in handlers that want try/catch-based auth instead of null checks.
 * @param {import('http').IncomingMessage} req
 * @returns {Object} decoded JWT payload
 */
export function requireAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Token missing or invalid');
    err.status = 401;
    throw err;
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    const err = new Error('Token expired or invalid');
    err.status = 401;
    throw err;
  }
  return decoded;
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

  // Los puestos que heredan otro rol (p. ej. Publicidad → SALES) llegan a los
  // handlers con ambos, así las comprobaciones de siempre los reconocen. La
  // revisión de sesión del gateway compara los roles crudos, no estos.
  decoded.roles = rolesEfectivos(decoded.roles);
  return decoded;
}
