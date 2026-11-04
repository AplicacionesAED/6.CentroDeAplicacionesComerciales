const ApiError = require('../../utils/ApiError');
const sequelize = require('../../config/db');
const Usuario = require('../usuario/usuario.model');
const AsesorProyecto = require('./asesorProyecto.model');

// Proyectos asignados a un usuario. [] = sin restriccion.
async function proyectosAsignados(usuarioId) {
  const filas = await AsesorProyecto.findAll({ where: { usuario_id: usuarioId } });
  return filas.map((f) => f.proyecto);
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

module.exports = { proyectosAsignados, asignar };
