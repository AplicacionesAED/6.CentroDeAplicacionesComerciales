// Roles base, idempotente: ADMIN (bypass total) y VENDEDOR (el rol por defecto de la app vieja).
// Los datos iniciales van en migracion, no en seeders: produccion solo corre `db:migrate`.
'use strict';

const PERMISOS_VENDEDOR = ['ver_cotizador', 'ver_seguimiento', 'ver_tramites', 'ver_documentacion'];

module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query('SELECT COUNT(*)::int AS total FROM roles');
    if (existentes[0].total > 0) return;

    const ahora = new Date();
    await queryInterface.bulkInsert('roles', [
      { nombre: 'ADMIN', codigo: 'ADMIN', es_admin: true, permisos: JSON.stringify([]), creado_en: ahora, actualizado_en: ahora },
      { nombre: 'VENDEDOR', codigo: 'VENDEDOR', es_admin: false, permisos: JSON.stringify(PERMISOS_VENDEDOR), creado_en: ahora, actualizado_en: ahora },
    ]);
  },
};
