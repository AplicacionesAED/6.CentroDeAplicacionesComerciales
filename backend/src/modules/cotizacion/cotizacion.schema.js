const { z } = require('zod');
const zIdHubspot = require('../../utils/zIdHubspot');
const { PROYECTOS } = require('../../utils/comercial');

const texto = z.string().nullish();

// Campo `data` (JSON) del multipart de POST /cotizaciones.
const crearSchema = z.object({
  dealId: zIdHubspot,
  unitId: zIdHubspot,
  dealName: texto,
  unitCode: texto,
  unitTower: texto,
  unitFloor: z.coerce.number().nullish(),
  userEmail: texto,
  quoteType: texto,
  totalPrice: z.number().nullish(),
  separation: z.number().nullish(),
  monthlyPayment: z.number().nullish(),
  numInstallments: z.number().nullish(),
  balance: z.number().nullish(),
  parkingId: zIdHubspot.nullish(),
  parkingName: texto,
  depositoId: zIdHubspot.nullish(),
  depositoName: texto,
  cuartoUtilId: zIdHubspot.nullish(),
  cuartoUtilName: texto,
  skipDealStage: z.boolean().nullish(),
  project: z.enum(PROYECTOS).nullish(),
  snapshot: z.any().optional(),
});

const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const dealParamsSchema = z.object({ dealId: z.string().min(1) });
const listarQuerySchema = z.object({ status: z.string().optional(), type: z.string().optional(), search: z.string().optional() });

module.exports = { crearSchema, idParamsSchema, dealParamsSchema, listarQuerySchema };
