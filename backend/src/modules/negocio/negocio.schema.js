const { z } = require('zod');

const listarQuerySchema = z.object({ refresh: z.enum(['true', 'false']).optional().transform((v) => v === 'true') });

module.exports = { listarQuerySchema };
