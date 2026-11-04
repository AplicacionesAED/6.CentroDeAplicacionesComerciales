// Id de un objeto de HubSpot: solo digitos. Se acepta texto o numero y se entrega como texto. Es obligatorio
// validarlo antes de armar una ruta de HubSpot con el, y mas aun cuando la llamada usa el token de servicio:
// un id como "../../crm/v3/objects/contacts/1" escaparia a otro recurso.
const { z } = require('zod');

const zIdHubspot = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().regex(/^\d+$/, 'Id de HubSpot inválido'));

module.exports = zIdHubspot;
