// Cifrado simetrico (AES-256-GCM) para guardar secretos de terceros en la BD, como los tokens de
// HubSpot de cada usuario. La clave sale de HUBSPOT_TOKEN_KEY: 32 bytes en hexadecimal (64
// caracteres). Generar una con:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Formato guardado: iv(12) + authTag(16) + cifrado, todo en base64.
const crypto = require('crypto');

function obtenerClave() {
  const hex = process.env.HUBSPOT_TOKEN_KEY ?? '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('HUBSPOT_TOKEN_KEY debe ser una clave de 32 bytes en hexadecimal (64 caracteres).');
  }
  return Buffer.from(hex, 'hex');
}

function cifrar(texto) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', obtenerClave(), iv);
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), cifrado]).toString('base64');
}

function descifrar(guardado) {
  const datos = Buffer.from(guardado, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', obtenerClave(), datos.subarray(0, 12));
  decipher.setAuthTag(datos.subarray(12, 28));
  return Buffer.concat([decipher.update(datos.subarray(28)), decipher.final()]).toString('utf8');
}

module.exports = { cifrar, descifrar };
