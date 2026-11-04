// Permisos por rol. La tabla `Rol` es la fuente real; `esAdmin` (resuelto contra roles.es_admin en
// middlewares/auth.js) es un bypass total. Los slugs de abajo son los que la UI puede conceder.
const Rol = require('../modules/rol/rol.model');

const FUNCIONALIDADES_DISPONIBLES = {
  ver_cotizador: { nombre: 'Ver Cotizador', descripcion: 'Usar el cotizador' },
  ver_seguimiento: { nombre: 'Ver Seguimiento', descripcion: 'Ver el seguimiento de negocios' },
  ver_tramites: { nombre: 'Ver Trámites', descripcion: 'Ver los trámites' },
  ver_documentacion: { nombre: 'Ver Documentación', descripcion: 'Ver la documentación' },
};

// { NOMBRE_ROL: [slugs] } leido de la tabla Rol en cada llamada.
async function getRolesFuncionalidades() {
  const roles = await Rol.findAll({ attributes: ['nombre', 'permisos'] });
  return Object.fromEntries(roles.map((r) => [r.nombre, r.permisos ?? []]));
}

function tienePermiso(roles, funcionalidadesAdicionales, funcionalidad, funcionalidadesPorRol = {}, esAdmin = false) {
  if (esAdmin) return true;
  const delRol = (roles ?? []).flatMap((rol) => funcionalidadesPorRol[rol] || []);
  return delRol.includes(funcionalidad) || (funcionalidadesAdicionales ?? []).includes(funcionalidad);
}

module.exports = { FUNCIONALIDADES_DISPONIBLES, getRolesFuncionalidades, tienePermiso };
