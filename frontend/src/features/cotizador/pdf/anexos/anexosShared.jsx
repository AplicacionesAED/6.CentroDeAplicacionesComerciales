import { Font, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import interRegular from '../../../../assets/fonts/Inter-Regular.ttf';
import interBold from '../../../../assets/fonts/Inter-Bold.ttf';
import playfair400 from '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff';
import playfair700 from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff';
import bodoni400 from '@fontsource/bodoni-moda/files/bodoni-moda-latin-400-normal.woff';
import bodoni700 from '@fontsource/bodoni-moda/files/bodoni-moda-latin-700-normal.woff';
import logosPie from '../../../../assets/anexos/logos-pie.png';
// ─── Tipografías ──────────────────────────────────────────────────────────
// 'Inter' ya la registran los PDFs de cotización con los mismos archivos; se vuelve a registrar
// aquí para que los anexos no dependan de que otro módulo se haya cargado primero.
Font.register({
  family: 'Inter',
  fonts: [
    { src: interRegular, fontWeight: 400 },
    { src: interBold, fontWeight: 700 },
  ],
});
Font.register({
  family: 'Playfair',
  fonts: [
    { src: playfair400, fontWeight: 400 },
    { src: playfair700, fontWeight: 700 },
  ],
});
// Serif de alto contraste con cifras alineadas, para las áreas del plano acotado (Playfair usa cifras colgantes).
Font.register({
  family: 'Bodoni',
  fonts: [
    { src: bodoni400, fontWeight: 400 },
    { src: bodoni700, fontWeight: 700 },
  ],
});
export const ANX = {
  OLIVO: '#4A5D23', // texto de títulos, bordes
  OLIVO_OSC: '#2C3815', // franja verde del plano acotado
  ACENTO: '#8C9500', // "TIPO D"
  TEXTO: '#1F2937',
  GRIS: '#6B7280',
  BLANCO: '#FFFFFF',
  CREMA: '#E9E6D5',
};
export const ANX_PAGE = {
  width: 870,
  height: 1200,
};
const s = StyleSheet.create({
  firmasCaja: {
    flexDirection: 'row',
    borderRadius: 8,
    height: 100,
  },
  // Las dos mitades son simétricas (flex:1 + alignItems:'center' cada una) a propósito —
  // antes la derecha se centraba con un paddingLeft fijo pensado para la palabra corta
  // "Comprador", que quedaba descentrado con un nombre real de largo variable.
  firmasIzq: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  firmasDer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  etiqueta: { fontFamily: 'Inter', fontWeight: 700, fontSize: 8.5, color: ANX.TEXTO, textAlign: 'center' },
  linea: { borderBottomWidth: 0.8, borderBottomColor: ANX.GRIS, height: 1, marginTop: 36, width: 165 },
  fecha: { fontFamily: 'Inter', fontWeight: 400, fontSize: 7.5, color: ANX.GRIS, marginTop: 6 },
  // Variante compacta (cotización A4)
  firmasCajaC: { height: 48, borderRadius: 6 },
  firmasIzqC: { paddingTop: 7 },
  firmasDerC: { paddingTop: 7 },
  etiquetaC: { fontSize: 6.5 },
  lineaC: { marginTop: 17, width: 115 },
  fechaC: { fontSize: 5.5, marginTop: 3 },
});
/**
 * Espacio de firma de los anexos: "Director de proyecto" a la izquierda y el nombre real del
 * comprador a la derecha (no la palabra "Comprador"), cada uno con su línea de firma y la
 * fecha. Se imprime y se firma a mano.
 */
export function FirmasCaja({ style, compacto = false, nombreComprador, nombreDirector }) {
  // `compacto` es para la cotización A4, mucho más angosta que las páginas de 870 pt de los anexos.
  return (
    <View style={[s.firmasCaja, compacto ? s.firmasCajaC : {}, ...(style ? [style] : [])].flat()} wrap={false}>
      <View style={[s.firmasIzq, compacto ? s.firmasIzqC : {}]}>
        <Text style={[s.etiqueta, compacto ? s.etiquetaC : {}]}>{nombreDirector || 'Director de proyecto'}</Text>
        <View style={[s.linea, compacto ? s.lineaC : {}]} />
        <Text style={[s.fecha, compacto ? s.fechaC : {}]}>Fecha:</Text>
      </View>
      <View style={[s.firmasDer, compacto ? s.firmasDerC : {}]}>
        <Text style={[s.etiqueta, compacto ? s.etiquetaC : {}]}>{nombreComprador || 'Comprador'}</Text>
        <View style={[s.linea, compacto ? s.lineaC : {}]} />
        <Text style={[s.fecha, compacto ? s.fechaC : {}]}>Fecha:</Text>
      </View>
    </View>
  );
}
/** Franja de logos del pie: OLIV Cartagena | aed | J&S Constructores. */
export function PieLogos({ style }) {
  return (
    <View style={[{ alignItems: 'center' }, ...(style ? [style] : [])].flat()}>
      <Image src={logosPie} style={{ width: 441, height: 54, objectFit: 'contain' }} />
    </View>
  );
}
