import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { ANX, ANX_PAGE, FirmasCaja, PieLogos } from './anexosShared.jsx';
const s = StyleSheet.create({
  page: { backgroundColor: ANX.BLANCO, fontFamily: 'Inter', fontWeight: 400, color: ANX.TEXTO, alignItems: 'center' },
  titulo: {
    fontFamily: 'Playfair',
    fontWeight: 400,
    fontSize: 31,
    letterSpacing: 3.2,
    color: ANX.OLIVO,
    textAlign: 'center',
    marginTop: 52,
  },
  subtitulo: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 13.5,
    letterSpacing: 3,
    color: ANX.OLIVO,
    textAlign: 'center',
    marginTop: 14,
  },
  planoCaja: { width: 750, height: 690, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  legal: { width: 690, marginTop: 22, fontSize: 11, lineHeight: 1.45, color: ANX.TEXTO },
  firmas: { width: 690, marginTop: 22 },
  pie: { marginTop: 34 },
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, backgroundColor: ANX.OLIVO_OSC },
});
/** "SEIVA - 207" → "207" */
export function numeroApto(unit) {
  const partes = (unit.codigo_unidad || '').split('-');
  return partes[partes.length - 1].trim();
}
export default function AnexoParqueaderoPDF({ unit, towerName, planoUrl, parqueadero, nombreComprador, nombreDirector }) {
  const torre = towerName ?? (unit.torre ? `Torre ${unit.torre}` : '');
  const linea = `Apto ${numeroApto(unit)}  ${torre} - Oliv Cartagena`.toUpperCase();
  return (
    <Document title={`Anexo parqueadero ${parqueadero ?? ''}`.trim()}>
      <Page size={[ANX_PAGE.width, ANX_PAGE.height]} style={s.page}>
        <Text style={s.titulo}>ANEXO PARQUEADERO</Text>
        <Text style={s.subtitulo}>{linea}</Text>

        <View style={s.planoCaja}>
          <Image src={planoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </View>

        <Text style={s.legal}>
          La nomenclatura del parqueadero es provisional y podrá modificarse por razones técnicas, normativas o del reglamento de propiedad horizontal, sin que
          ello altere su ubicación física, área o características.
        </Text>

        <FirmasCaja style={s.firmas} nombreComprador={nombreComprador} nombreDirector={nombreDirector} />
        <PieLogos style={s.pie} />
        <View style={s.barra} />
      </Page>
    </Document>
  );
}
