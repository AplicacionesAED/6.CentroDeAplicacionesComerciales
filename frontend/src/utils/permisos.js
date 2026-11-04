// Permisos del Centro de Aplicaciones Comerciales. Mismo contrato que las apps base:
// `usuario.funcionalidadesPorRol` (mapa real que manda GET /usuarios/me) manda sobre
// cualquier mapa local, y `esAdmin` es un bypass total.
export function tienePermiso(roles, funcionalidadesAdicionales, funcionalidad, funcionalidadesPorRol = {}, esAdmin = false) {
  if (esAdmin) return true;
  const delRol = (roles ?? []).flatMap((rol) => funcionalidadesPorRol[rol] || []);
  return delRol.includes(funcionalidad) || (funcionalidadesAdicionales ?? []).includes(funcionalidad);
}

export function usuarioTienePermiso(usuario, funcionalidad) {
  return tienePermiso(usuario.roles, usuario.funcionalidades_adicionales, funcionalidad, usuario.funcionalidadesPorRol, usuario.esAdmin);
}
