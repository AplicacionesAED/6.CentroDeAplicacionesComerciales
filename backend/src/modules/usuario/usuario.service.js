// Sin auto-registro a proposito: solo un admin crea usuarios (ver scripts/crearAdmin.js para el primero).
// Nunca expone `hashed_password` en la respuesta (`_enrich`).
const ApiError = require('../../utils/ApiError');
const { getRolesFuncionalidades } = require('../../utils/permisos');
const { hashPassword } = require('../../utils/security');
const { generateRandomPassword } = require('../../utils/passwordRules');
const Usuario = require('./usuario.model');
const Rol = require('../rol/rol.model');
const AsesorProyecto = require('../asesorProyecto/asesorProyecto.model');

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

// ── Administracion de usuarios (solo admin; ver las rutas) ──

async function nombresRolesAdmin() {
  const admins = await Rol.findAll({ where: { es_admin: true }, attributes: ['nombre'] });
  return admins.map((r) => r.nombre);
}

const esAdminPorRoles = (roles, nombresAdmin) => (roles ?? []).some((r) => nombresAdmin.includes(r));

async function validarRoles(roles) {
  const existentes = new Set((await Rol.findAll({ attributes: ['nombre'] })).map((r) => r.nombre));
  const invalidos = roles.filter((r) => !existentes.has(r));
  if (invalidos.length) throw new ApiError(422, `Rol(es) inexistente(s): ${invalidos.join(', ')}`);
}

// Siempre debe quedar al menos un administrador activo: si no, nadie podria volver a gestionar la app.
async function exigirAdminActivo(excluirId, nombresAdmin) {
  const activos = await Usuario.findAll({ where: { activo: true } });
  const quedan = activos.filter((u) => u.id !== excluirId && esAdminPorRoles(u.roles, nombresAdmin));
  if (quedan.length === 0) throw new ApiError(400, 'Debe quedar al menos un administrador activo.');
}

async function listarRoles() {
  const roles = await Rol.findAll({ order: [['nombre', 'ASC']] });
  return roles.map((r) => ({ nombre: r.nombre, esAdmin: r.es_admin }));
}

async function listar() {
  const usuarios = await Usuario.findAll({ include: [{ model: AsesorProyecto, as: 'proyectos' }], order: [['nombre', 'ASC']] });
  return usuarios.map((u) => ({ ..._enrich(u), proyectos: u.proyectos.map((p) => p.proyecto) }));
}

// Crea el usuario con una contrasena temporal aleatoria que se devuelve UNA sola vez; debe cambiarla al entrar.
// Si entra con Microsoft o HubSpot, la contrasena nunca se usa.
async function crear(data) {
  const email = data.email.toLowerCase();
  if (await Usuario.findOne({ where: { email } })) throw new ApiError(409, 'Ya existe un usuario con ese correo.');
  await validarRoles(data.roles);
  const password = generateRandomPassword();
  const usuario = await Usuario.create({
    email,
    nombre: data.nombre,
    hashed_password: await hashPassword(password),
    roles: data.roles,
    cargo: data.cargo ?? null,
    telefono: data.telefono ?? null,
    activo: true,
    debe_cambiar_password: true,
  });
  return { usuario: { ..._enrich(usuario), proyectos: [] }, password };
}

async function actualizar(id, data, actorId) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');

  if (data.roles) await validarRoles(data.roles);
  const nombresAdmin = await nombresRolesAdmin();
  const seraAdmin = data.roles ? esAdminPorRoles(data.roles, nombresAdmin) : esAdminPorRoles(usuario.roles, nombresAdmin);
  const seraActivo = data.activo ?? usuario.activo;
  const eraAdminActivo = usuario.activo && esAdminPorRoles(usuario.roles, nombresAdmin);

  if (id === actorId && data.activo === false) throw new ApiError(400, 'No puedes desactivar tu propia cuenta.');
  if (eraAdminActivo && !(seraAdmin && seraActivo)) await exigirAdminActivo(id, nombresAdmin);

  await usuario.update(data);
  return { ..._enrich(usuario), proyectos: (await AsesorProyecto.findAll({ where: { usuario_id: id } })).map((p) => p.proyecto) };
}

// Nueva contrasena temporal (se devuelve una sola vez) y cambio obligatorio al entrar.
async function regenerarPassword(id) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  const password = generateRandomPassword();
  await usuario.update({ hashed_password: await hashPassword(password), debe_cambiar_password: true });
  return { password };
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

module.exports = { listarRoles, listar, crear, actualizar, regenerarPassword, getMe, buscarPorMicrosoftId, vincularMicrosoft, desvincularMicrosoft, registrarConexion };
