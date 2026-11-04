// Permisos por rol. La tabla `Rol` es la fuente real; `esAdmin` (resuelto contra roles.es_admin en
// middlewares/auth.js) es un bypass total. El frontend evalua los permisos contra el mapa que devuelve /usuarios/me.
const Rol = require('../modules/rol/rol.model');

// { NOMBRE_ROL: [slugs] } leido de la tabla Rol en cada llamada.
async function getRolesFuncionalidades() {
  const roles = await Rol.findAll({ attributes: ['nombre', 'permisos'] });
  return Object.fromEntries(roles.map((r) => [r.nombre, r.permisos ?? []]));
}

module.exports = { getRolesFuncionalidades };
