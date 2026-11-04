// Portal de Ventas: arbol de carpetas y enlaces de cada proyecto. Todos leen; solo un administrador guarda.
import client from './client.js';

// { docFolders: { oliv: [...], almar: [...] }, docUrls: { oliv: { idArchivo: url }, ... } }
export async function fetchDocumentos() {
  const [carpetas, urls] = await Promise.all([client.get('/configuracion/doc-folders'), client.get('/configuracion/doc-urls')]);
  return { docFolders: carpetas.data.docFolders, docUrls: urls.data.docUrls };
}

// El servidor reemplaza el objeto completo: siempre se envian todos los proyectos, nunca solo el activo.
export async function guardarCarpetas(docFolders) {
  await client.put('/configuracion/doc-folders', { docFolders });
}

export async function guardarUrls(docUrls) {
  await client.put('/configuracion/doc-urls', { docUrls });
}

// Sube un Word a la carpeta de HubSpot Files del proyecto y devuelve { url, filename }.
export async function subirWord(archivo, proyecto) {
  const formData = new FormData();
  formData.append('file', archivo);
  formData.append('project', proyecto);
  const { data } = await client.upload('/configuracion/doc-upload', formData);
  return data;
}
