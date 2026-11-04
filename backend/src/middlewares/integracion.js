// Acceso de otras aplicaciones de AED (hoy solo Cartera) a rutas de solo lectura: la cabecera `X-API-Key` debe ser
// igual a la variable de entorno INTEGRACION_API_KEY. La llave NO abre ninguna otra ruta que no use este middleware.
// Si la variable no está definida (o tiene menos de 32 caracteres) la vía queda deshabilitada. Comparación en tiempo
// constante.
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

function requireIntegracion(req, res, next) {
  const esperada = process.env.INTEGRACION_API_KEY;
  if (!esperada || esperada.length < 32) return next(new ApiError(401, 'La integración por API key no está configurada'));
  const recibida = req.get('x-api-key');
  if (!recibida) return next(new ApiError(401, 'Falta la API key'));
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return next(new ApiError(401, 'API key inválida'));
  next();
}

module.exports = { requireIntegracion };
