const { z } = require('zod');
const { PROYECTOS } = require('../../utils/comercial');

const usuarioParamsSchema = z.object({ usuarioId: z.coerce.number().int().positive() });
const asignarSchema = z.object({ projects: z.array(z.enum(PROYECTOS)) });

module.exports = { usuarioParamsSchema, asignarSchema };
