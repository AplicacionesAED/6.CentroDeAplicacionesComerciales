const { z } = require('zod');

const roles = z.array(z.string().min(1)).min(1, 'Elige al menos un rol');

const crearSchema = z.object({
  email: z.string().trim().email(),
  nombre: z.string().trim().min(1).max(200),
  roles,
  cargo: z.string().trim().max(150).nullish(),
  telefono: z.string().trim().max(30).nullish(),
});

const actualizarSchema = z
  .object({
    nombre: z.string().trim().min(1).max(200),
    roles,
    activo: z.boolean(),
    cargo: z.string().trim().max(150).nullable(),
    telefono: z.string().trim().max(30).nullable(),
  })
  .partial();

const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = { crearSchema, actualizarSchema, idParamsSchema };
