const ApiError = require('../../utils/ApiError');
const sequelize = require('../../config/db');
const Usuario = require('../usuario/usuario.model');
const AsesorProyecto = require('./asesorProyecto.model');

// Proyectos asignados a un usuario. [] = sin restriccion.
async function proyectosAsignados(usuarioId) {
  const filas = await AsesorProyecto.findAll({ where: { usuario_id: usuarioId } });
  return filas.map((f) => f.proyecto);
}

async function misProyectos(usuario) {
  return { isAdmin: Boolean(usuario.esAdmin), projects: await proyectosAsignados(usuario.id) };
}

// Todos los asesores con al menos una asignacion: [{ usuarioId, email, nombre, projects }].
async function listar() {
  const filas = await AsesorProyecto.findAll({ include: [{ model: Usuario, attributes: ['id', 'email', 'nombre'] }], order: [['usuario_id', 'ASC']] });
  const porUsuario = new Map();
  for (const fila of filas) {
    if (!porUsuario.has(fila.usuario_id)) {
      porUsuario.set(fila.usuario_id, { usuarioId: fila.usuario_id, email: fila.Usuario.email, nombre: fila.Usuario.nombre, projects: [] });
    }
    porUsuario.get(fila.usuario_id).projects.push(fila.proyecto);
  }
  return { assignments: [...porUsuario.values()] };
}

// Reemplaza el conjunto completo de proyectos del asesor. [] lo deja sin restriccion.
async function asignar(usuarioId, projects) {
  if (!(await Usuario.findByPk(usuarioId))) throw new ApiError(404, 'Usuario no encontrado');
  await sequelize.transaction(async (transaction) => {
    await AsesorProyecto.destroy({ where: { usuario_id: usuarioId }, transaction });
    await AsesorProyecto.bulkCreate(
      [...new Set(projects)].map((proyecto) => ({ usuario_id: usuarioId, proyecto })),
      { transaction }
    );
  });
  return { ok: true };
}

module.exports = { proyectosAsignados, misProyectos, listar, asignar };
