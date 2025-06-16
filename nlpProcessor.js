/**
 * @fileoverview Procesador semántico de preguntas.
 * Usa NLP (con `compromise`) para analizar preguntas en lenguaje natural,
 * identificar entidades (personajes, lugares, objetos), verbos clave,
 * y construir filtros de búsqueda avanzados para eventos narrativos.
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
 * Cada clave contiene formas verbales comunes o literarias.
 * Se usa para detectar acciones relevantes en una pregunta.
 */
const verbosClave = {
  morir: ["morir", "murió", "falleció", "pereció", "expiró", "dejó de existir", "trascendió", "se murió"],
  fundar: ["fundar", "fundó", "crear", "creó", "establecer", "estableció", "erigir", "construyó"],
  nacer: ["nacer", "nació", "nacido", "nacimiento", "nacieron", "vino al mundo","nace"],
  casar: ["casarse", "matrimonio", "se casó", "unió", "contrajo nupcias"],
  desaparecer: ["desaparecer", "desapareció", "se desvaneció", "se perdió", "se esfumó"],
  envejecer: ["envejecer", "envejeció", "se volvió viejo", "se hizo mayor"],
  amar: ["amar", "se enamoró", "amor", "amó", "adoró"],
  partir: ["partir", "salió", "se fue", "abandonó", "marchó", "huyó"],
  regresar: ["regresar", "volvió", "retornó", "reapareció"],
  escribir: ["escribir", "escribió", "redactó", "documentó"],
  revelar: ["revelar", "contó", "confesó", "descubrió"],
  asesinar: ["matar", "asesinar", "fue asesinado", "ejecutar"],
  leer: ["leer", "leyó", "consultó"],
  profetizar: ["profetizar", "profetizó", "predijo"],
  imponer: ["imponer", "impuso", "dominó", "trajo disciplina"]
};

/**
 * Escapa una cadena para uso literal en una RegExp.
 * @param {string} text - Texto a escapar.
 * @returns {string} Texto escapado.
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Verifica si una cadena incluye una entidad o alguna de sus partes.
 * @param {string} entidadNormal - Nombre de entidad normalizado.
 * @param {string} textoNormal - Texto completo de la pregunta normalizado.
 * @returns {boolean} Verdadero si hay coincidencia flexible.
 */
function matchFlexible(entidadNormal, textoNormal) {
  if (!entidadNormal || !textoNormal) return false;
  if (textoNormal.includes(entidadNormal)) return true;
  const partes = entidadNormal.split(/\s+/);
  return partes.some(parte => textoNormal.includes(parte));
}

/**
 * Elimina tildes y pasa a minúsculas.
 * @param {string} str - Texto a limpiar.
 * @returns {string} Texto sin tildes y en minúsculas.
 */
function limpiarTexto(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Normaliza un texto usando NLP y limpieza adicional.
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
 * Busca el evento más similar a una pregunta textual.
 * Usa una comparación simple de intersección de palabras.
 * @param {string} pregunta - Texto normalizado de la pregunta.
 * @returns {Promise<Object|null>} Evento con mayor score, si supera el umbral.
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
    const palabrasA = new Set(a.split(' '));
    const palabrasB = new Set(b.split(' '));
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
 * @param {string} nombreCompleto - Nombre del personaje.
 * @returns {Object} Objeto con nombre, alias (si hay) y original.
 */
function extraerAlias(nombreCompleto) {
  const aliasMatch = nombreCompleto.match(/\((.*?)\)/);
  const alias = aliasMatch ? limpiarTexto(aliasMatch[1]) : null;
  const limpio = limpiarTexto(nombreCompleto.replace(/\s*\(.*?\)\s*/g, ''));
  return { nombre: limpio, alias, original: nombreCompleto };
}

/**
 * Analiza una pregunta textual para detectar capítulo, verbos clave,
 * personajes, lugares y objetos mencionados.
 * 
 * @param {string} pregunta - Texto de la pregunta en lenguaje natural.
 * @returns {Promise<Object>} Resultado del análisis semántico.
 */
async function analizarPregunta(pregunta) {
  console.log('[nlpProcessor] Pregunta cruda:', pregunta);
  const texto = normalizar(pregunta);

  // Detectar capítulo explícito
  const capMatch = texto.match(/cap[ií]tulo\\s*(\\d+)/);
  const capitulo = capMatch ? parseInt(capMatch[1], 10) : null;

  const personajesBD = await Personaje.find({}, 'nombre');
  const lugaresBD = await Lugar.find({}, 'nombre');
  const objetosBD = Objeto ? await Objeto.find({}, 'nombre') : [];

  // Detectar personajes
  const personajes = personajesBD.filter(p => {
    const { nombre, alias } = extraerAlias(p.nombre);
    return matchFlexible(nombre, texto) || (alias && matchFlexible(alias, texto));
  }).map(p => p.nombre);

  // Detectar lugares
  const lugares = lugaresBD
    .map(l => ({ original: l.nombre, normal: limpiarTexto(l.nombre) }))
    .filter(l => matchFlexible(l.normal, texto))
    .map(l => l.original);

  // Detectar objetos
  const objetos = objetosBD
    .map(o => ({ original: o.nombre, normal: limpiarTexto(o.nombre) }))
    .filter(o => matchFlexible(o.normal, texto))
    .map(o => o.original);

  // Detectar verbos clave
  const regexVerbos = [];
  const verbosDetectados = [];
  const textoNorm = limpiarTexto(pregunta);

  for (const [clave, formas] of Object.entries(verbosClave)) {
    for (const forma of formas) {
      const formaNorm = limpiarTexto(forma);
      const reDetect = new RegExp(`\\b${escapeRegex(formaNorm)}\\b`, 'i');
      if (reDetect.test(textoNorm)) {
        verbosDetectados.push({ clave, formaEncontrada: forma });
        for (const f of formas) {
          regexVerbos.push(new RegExp(`\\b${escapeRegex(f)}\\b`, 'i'));
        }
        break;
      }
    }
  }

  const fuzzy = await buscarEventoSimilar(pregunta);

  return {
    capitulo,
    regexVerbos,
    personajes,
    lugares,
    objetos,
    fuzzy
  };
}

module.exports = { analizarPregunta, normalizar };
