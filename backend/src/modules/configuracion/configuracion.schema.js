const { z } = require('zod');
const { PROYECTOS } = require('../../utils/comercial');

const objetoPlano = z.record(z.any());

const proyectoParamsSchema = z.object({ proyecto: z.enum(PROYECTOS) });
const proyectoConfigSchema = z.object({ config: objetoPlano });
const docUrlsSchema = z.object({ docUrls: objetoPlano });
const docFoldersSchema = z.object({ docFolders: objetoPlano });

module.exports = { proyectoParamsSchema, proyectoConfigSchema, docUrlsSchema, docFoldersSchema };
