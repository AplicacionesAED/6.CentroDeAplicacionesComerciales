// Sin auto-registro a proposito: solo un admin crea usuarios (ver scripts/crearAdmin.js para el primero).
// Nunca expone `hashed_password` en la respuesta (`_enrich`).
const ApiError = require('../../utils/ApiError');
const { getRolesFuncionalidades } = require('../../utils/permisos');
const Usuario = require('./usuario.model');

function _enrich(usuario) {
  const data = usuario.toJSON();
  delete data.hashed_password;
  return data;
}

// `funcionalidadesPorRol` es el mapa REAL de la tabla Rol: el frontend evalua permisos contra el
// mismo mapa que el backend. `esAdmin` lo resuelve requireAuth contra roles.es_admin.
async function getMe(usuario) {
  const data = _enrich(usuario);
  data.funcionalidadesPorRol = await getRolesFuncionalidades();
  data.esAdmin = usuario.esAdmin;
  return data;
}

// ── Vinculacion de cuenta Microsoft (usada por modules/auth/auth.azure.js) ──

async function buscarPorMicrosoftId(microsoftId) {
  return Usuario.findOne({ where: { microsoft_id: microsoftId } });
}

async function vincularMicrosoft(usuarioId, microsoftId, microsoftEmail) {
  const yaVinculada = await Usuario.findOne({ where: { microsoft_id: microsoftId } });
  if (yaVinculada && yaVinculada.id !== Number(usuarioId)) {
    throw new ApiError(409, 'Esta cuenta de Microsoft ya está vinculada a otro usuario.');
  }
  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  await usuario.update({ microsoft_id: microsoftId, microsoft_email: microsoftEmail?.toLowerCase() ?? null });
  return _enrich(usuario);
}

async function desvincularMicrosoft(usuarioId) {
  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  await usuario.update({ microsoft_id: null, microsoft_email: null });
  return _enrich(usuario);
}

async function registrarConexion(usuario) {
  // No bloquea el login si falla.
  try {
    await usuario.update({ ultima_conexion: new Date() });
  } catch {
    // ignorar errores de registro de conexion
  }
}

module.exports = { getMe, buscarPorMicrosoftId, vincularMicrosoft, desvincularMicrosoft, registrarConexion };
