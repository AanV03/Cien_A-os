/**
 * @fileoverview Procesador semántico de preguntas.
 * Usa NLP (con `compromise`) para analizar preguntas en lenguaje natural,
 * identificar entidades (personajes, lugares, objetos), verbos clave,
 * patrones de existencia, y construir filtros de búsqueda avanzados para eventos narrativos.
 */

const nlp = require('compromise');
const Personaje = require('./models/model_personajes');
const Lugar = require('./models/model_lugares');
const Evento = require('./models/model_eventos');
let Objeto;
try {
  Objeto = require('./models/model_objetos');
} catch (e) {
  Objeto = null;
}

/**
 * Diccionario de verbos clave agrupados por intención narrativa.
 * @type {Object.<string, string[]>}
 */
const verbosClave = {
  morir: ["morir", "murió", "falleció", "pereció", "expiró", "dejó de existir", "trascendió", "se murió"],
  fundar: ["fundar", "fundó", "crear", "creó", "establecer", "estableció", "erigir", "construyó", "formó"],
  nacer: ["nacer", "nació", "nacido", "nacimiento", "nacieron", "vino al mundo", "nace", "alumbramiento"],
  casar: ["casarse", "matrimonio", "se casó", "unió", "contrajo nupcias", "boda", "desposó"],
  desaparecer: ["desaparecer", "desapareció", "se desvaneció", "se perdió", "se esfumó"],
  envejecer: ["envejecer", "envejeció", "se volvió viejo", "se hizo mayor", "envejece"],
  amar: ["amar", "se enamoró", "amor", "amó", "adoró", "querer", "se quiso"],
  partir: ["partir", "salió", "se fue", "abandonó", "marchó", "huyó", "emigró"],
  regresar: ["regresar", "volvió", "retornó", "reapareció", "regresó", "volvieron"],
  escribir: ["escribir", "escribió", "redactó", "documentó", "anotó", "registró"],
  revelar: ["revelar", "contó", "confesó", "descubrió", "admitió", "explicó"],
  asesinar: ["matar", "asesinar", "fue asesinado", "ejecutar", "ajustició", "eliminó"],
  leer: ["leer", "leyó", "consultó", "revisó", "estudió"],
  profetizar: ["profetizar", "profetizó", "predijo", "adivinó", "vaticinó"],
  imponer: ["imponer", "impuso", "dominó", "trajo disciplina", "ordenó", "estableció normas"],
  enriquecer: ["riqueza", "hacerse rico", "volverse rico", "obtener riqueza", "rico", "ser rico", "volvió rico", "hizo rico", "enriquecer", "enriquecerse", "enriqueció", "enriquecido"],
  perder: ["perder", "perdió", "perdido", "pérdida", "se le fue", "desapareció", "se perdió"],
  crecer: ["crecer", "creció", "crece", "crecido", "crecimiento", "crecieron", "expansión", "desarrollo"],
  huir: ["huir", "huyó", "escapó", "fugó", "se escapó", "se fugó"],
  construir: ["construir", "construyó", "edificó", "levantó", "edificaron"],
  destruir: ["destruir", "destruyó", "arrasó", "derribó", "se vino abajo"],
  cambiar: ["cambiar", "cambió", "transformó", "modificó", "mutó", "variar", "evolucionó"],
  sufrir: ["sufrir", "sufrió", "padeció", "dolor", "penó", "afligió"],
  ganar: ["ganar", "ganó", "obtuvo", "venció", "triunfó", "logró"],
  perder: ["perder", "perdió", "derrota", "fracasó", "fue vencido", "cayó"],
  aparecer: ["aparecer", "apareció", "surgió", "se presentó", "emergió"],
  visitar: ["visitar", "visitó", "vino a ver", "llegó a ver", "se apareció"],
  recordar: ["recordar", "recordó", "memoria", "rememoró", "evocó"],
  olvidar: ["olvidar", "olvidó", "se le olvidó", "lo perdió de mente", "omitió"],
  confesar: ["confesar", "confesó", "admitió", "reveló", "declaró"],
  ver: ["ver", "vio", "observó", "miró", "contempló", "presenció"],
  oír: ["oír", "oyó", "escuchó", "percibió", "atendió"],
  poseer: ["poseer", "tuvo", "tenía", "era dueño de", "obtuvo", "poseyó"],
  entregar: ["entregar", "entregó", "cedió", "dio", "regaló"],
  recibir: ["recibir", "recibió", "obtuvo", "aceptó", "fue dado"],
  haber: ["haber", "hubo", "hay", "existió", "existía", "existieron", "ocurrió", "aconteció"],
  tener: ["tener", "tenía", "tuvo", "han tenido", "hubo", "poseía", "contaba con", "mantuvo", "disponía de"],
  comerciar: ["comerciar", "comerció", "vendió", "intercambió", "negoció", "transó", "truequeó", "traficó", "hizo negocios"],
  casar: ["casarse", "se casó", "contrajo matrimonio", "contrajo nupcias", "matrimonio", "boda", "se unió", "se desposó", "desposó", "celebró su boda"],
  existir: ["existir", "existía", "existió", "hubo", "hay", "se encontraba", "se hallaba", "estaba presente", "permanecía", "subsistía"],
  cambiar: ["cambiar", "cambio", "cambió", "modificar", "transformar", "modificó", "transformó", "fue modificado", "variar", "variación", "se transformó"]
};

/**
 * Escapa una cadena para uso literal en una RegExp.
 * @param {string} text - Texto a escapar.
 * @returns {string} Texto escapado para RegExp.
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Verifica si una cadena incluye una entidad o alguna de sus partes.
 * @param {string} entidadNormal - Entidad normalizada (sin tildes, minúscula).
 * @param {string} textoNormal - Texto donde buscar (normalizado).
 * @returns {boolean} True si se encuentra coincidencia total o parcial.
 */
function matchFlexible(entidadNormal, textoNormal) {
  if (!entidadNormal || !textoNormal) return false;
  if (textoNormal.includes(entidadNormal)) return true;
  const partes = entidadNormal.split(/\s+/);
  return partes.some(parte => textoNormal.includes(parte));
}

/**
 * Elimina tildes y convierte a minúsculas.
 * @param {string} str - Texto original.
 * @returns {string} Texto limpio y en minúsculas.
 */
function limpiarTexto(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza un texto usando compromise y limpieza adicional.
 * @param {string} texto - Texto original.
 * @returns {string} Texto normalizado y limpio.
 */
function normalizar(texto) {
  const textoNormalizado = nlp(texto)
    .normalize({ punctuation: true, plurals: true })
    .out('text');
  const limpio = limpiarTexto(textoNormalizado);
  console.log('[nlpProcessor] Texto normalizado:', limpio);
  return limpio;
}

/**
 * Detecta patrones de “existencia” en la pregunta:
 * - “hubo alguna X?”, “hubo X?”, “existe X?”, “existió X?”, “hay X?”, etc.
 * Devuelve el término principal limpio (sin tildes) o null si no aplica.
 * @param {string} textoOriginal - Pregunta original en lenguaje natural.
 * @returns {string|null} Término detectado (limpio) o null.
 */
function detectarExistencia(textoOriginal) {
  const txt = textoOriginal.toLowerCase().trim();
  // quitar signos de interrogación al inicio o final
  const sinSignos = txt.replace(/^[¿?]+|[¿?]+$/g, '').trim();
  // patrones: grupo 1 o 2 captura el término a buscar
  const patrones = [
    /^hubo alguna\s+(.+)$/,
    /^hubo\s+(.+)$/,
    /^existe(n)? alguna\s+(.+)$/,
    /^existe(n)?\s+(.+)$/,
    /^existió\s+(.+)$/,
    /^hay alguna\s+(.+)$/,
    /^hay\s+(.+)$/
  ];
  for (const pat of patrones) {
    const m = sinSignos.match(pat);
    if (m) {
      // m[1] o m[2]
      const termino = m[1] || m[2];
      if (termino) {
        let t = termino.trim();
        t = t.replace(/[?\.!]+$/, '').trim();
        return limpiarTexto(t);
      }
    }
  }
  return null;
}

/**
 * Busca el evento más similar a una pregunta textual.
 * @param {string} pregunta - Texto de la pregunta.
 * @returns {Promise<Object|null>} Evento encontrado o null.
 */
async function buscarEventoSimilar(pregunta) {
  console.log('[FuzzySearch] Iniciando búsqueda de evento similar...');
  const texto = normalizar(pregunta);
  let eventos = [];
  try {
    eventos = await Evento.find({}, 'nombre descripcion');
  } catch (error) {
    console.error('[FuzzySearch] Error al obtener eventos:', error);
    return null;
  }
  if (!eventos.length) return null;

  const calcularScore = (a, b) => {
    const palabrasA = new Set(a.split(/\s+/));
    const palabrasB = new Set(b.split(/\s+/));
    const interseccion = [...palabrasA].filter(p => palabrasB.has(p));
    return interseccion.length / Math.max(palabrasA.size, 1);
  };

  const candidatos = eventos.map(e => {
    const combinado = limpiarTexto(`${e.nombre} ${e.descripcion || ''}`);
    const score = calcularScore(texto, combinado);
    return { evento: e, score };
  }).sort((a, b) => b.score - a.score);

  const top = candidatos[0];
  return (top && top.score > 0.2) ? top.evento : null;
}

/**
 * Extrae nombre y alias de un personaje si tiene formato "(alias)".
 * @param {string} nombreCompleto - Nombre completo con posible alias.
 * @returns {{nombre: string, alias: string|null, original: string}}
 */
function extraerAlias(nombreCompleto) {
  const aliasMatch = nombreCompleto.match(/\((.*?)\)/);
  const alias = aliasMatch ? limpiarTexto(aliasMatch[1]) : null;
  const limpio = limpiarTexto(nombreCompleto.replace(/\s*\(.*?\)\s*/g, '')).trim();
  return { nombre: limpio, alias, original: nombreCompleto };
}

/**
 * Analiza una pregunta textual para detectar:
 * - capítulo explícito,
 * - patrón de existencia,
 * - verbos clave,
 * - personajes, lugares, objetos,
 * - fuzzy search (solo si no es pregunta de existencia).
 *
 * Devuelve un objeto con:
 *   capitulo: número|null,
 *   terminoExistencia: string|null,
 *   regexVerbos: RegExp[],
 *   personajes: array de strings (nombres originales, .trim()),
 *   lugares: array de strings,
 *   objetos: array de strings,
 *   fuzzy: evento o null
 *
 * @param {string} pregunta - Pregunta original.
 * @returns {Promise<{
 *   capitulo: number|null,
 *   terminoExistencia: string|null,
 *   regexVerbos: RegExp[],
 *   personajes: string[],
 *   lugares: string[],
 *   objetos: string[],
 *   fuzzy: Object|null
 * }>} Resultado del análisis semántico.
 */
async function analizarPregunta(pregunta) {
  console.log('[nlpProcessor] Pregunta cruda:', pregunta);
  const textoNorm = normalizar(pregunta);

  // 1) capítulo explícito
  const capMatch = textoNorm.match(/cap[ií]tulo\s*(\d+)/i);
  const capitulo = capMatch ? parseInt(capMatch[1], 10) : null;

  // 2) detectar existencia
  const terminoExistencia = detectarExistencia(pregunta);

  // 3) cargar entidades BD
  const personajesBD = await Personaje.find({}, 'nombre');
  const lugaresBD = await Lugar.find({}, 'nombre');
  const objetosBD = Objeto ? await Objeto.find({}, 'nombre evento_relacionado') : [];

  // 4) detectar personajes: devolver nombres originales
  const personajes = personajesBD
    .filter(p => {
      const { nombre, alias } = extraerAlias(p.nombre);
      return matchFlexible(nombre, textoNorm) || (alias && matchFlexible(alias, textoNorm));
    })
    .map(p => p.nombre.trim());

  // 5) detectar lugares
  const lugares = lugaresBD
    .map(l => ({ original: l.nombre, normal: limpiarTexto(l.nombre) }))
    .filter(item => matchFlexible(item.normal, textoNorm))
    .map(item => item.original);

  // 6) detectar objetos
  const objetos = objetosBD
    .map(o => ({ original: o.nombre, normal: limpiarTexto(o.nombre) }))
    .filter(item => matchFlexible(item.normal, textoNorm))
    .map(item => item.original);

  // 7) detectar verbos clave
  const regexVerbos = [];
  const textoRawNorm = limpiarTexto(pregunta);
  for (const [clave, formas] of Object.entries(verbosClave)) {
    for (const forma of formas) {
      const formaNorm = limpiarTexto(forma);
      const reDetect = new RegExp(`\\b${escapeRegex(formaNorm)}\\b`, 'i');
      if (reDetect.test(textoRawNorm)) {
        for (const f of formas) {
          const pat = escapeRegex(limpiarTexto(f));
          regexVerbos.push(new RegExp(`\\b${pat}\\b`, 'i'));
        }
        break;
      }
    }
  }

  // 8) fuzzy search: solo si no es pregunta de existencia
  let fuzzy = null;
  if (!terminoExistencia) {
    fuzzy = await buscarEventoSimilar(pregunta);
  }

  return {
    capitulo,
    terminoExistencia,
    regexVerbos,
    personajes,
    lugares,
    objetos,
    fuzzy
  };
}

module.exports = { analizarPregunta, normalizar };
