const { z } = require('zod');
const { PROYECTOS } = require('../../utils/comercial');
const zIdHubspot = require('../../utils/zIdHubspot');

const unidadesQuerySchema = z.object({
  project: z.enum(PROYECTOS),
  status: z.string().optional(),
  refresh: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
});
const unitIdParamsSchema = z.object({ unitId: z.string().regex(/^\d+$/) });
const towerIdParamsSchema = z.object({ towerId: z.string().regex(/^\d+$/) });
const accesoriosQuerySchema = z.object({ dealId: z.string().regex(/^\d+$/).optional() });
const asociarUnidadSchema = z.object({ dealId: zIdHubspot, unitId: zIdHubspot });
const asociarParqueaderoSchema = z.object({ dealId: zIdHubspot, parkingId: zIdHubspot });

module.exports = { unidadesQuerySchema, unitIdParamsSchema, towerIdParamsSchema, accesoriosQuerySchema, asociarUnidadSchema, asociarParqueaderoSchema };
