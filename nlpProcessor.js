/*
  Archivo: nlpProcessor.js
  Función: Analiza la pregunta y detecta entidades y verbos clave desde MongoDB.
  Incluye logs de depuración para trazar el análisis.
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

// Verbos clave directamente aquí
const verbosClave = {
  morir: ["morir", "murió", "falleció", "pereció", "expiró", "dejó de existir", "trascendió", "pereció", "se murió"],
  fundar: ["fundar", "fundó", "crear", "creó", "establecer", "estableció", "erigir", "construyó", "erigió"],
  nacer: ["nacer", "nació", "nacido", "nacimiento", "nacieron", "vino al mundo", "dio a luz"],
  casar: ["casarse", "matrimonio", "se casó", "unió", "contrajo nupcias", "desposó"],
  desaparecer: ["desaparecer", "desapareció", "se desvaneció", "se perdió", "se esfumó", "se desintegró"],
  envejecer: ["envejecer", "envejeció", "se volvió viejo", "se hizo mayor", "cansó con los años"],
  amar: ["amar", "se enamoró", "amor", "amó", "adoró", "quería", "amaba"],
  partir: ["partir", "salió", "se fue", "abandonó", "marchó", "huyó", "emigró", "desapareció", "viajó"],
  regresar: ["regresar", "volvió", "retornó", "regresó", "retornó", "reapareció", "se presentó de nuevo"],
  escribir: ["escribir", "escribió", "redactó", "anotó", "dejó escrito", "registró", "documentó", "transcribió"],
  revelar: ["revelar", "contó", "dijo", "confesó", "descubrió", "manifestó"],
  asesinar: ["matar", "asesinar", "acabar con", "eliminar", "ejecutar", "homicidio", "fue asesinado"],
  leer: ["leer", "leyó", "interpretó", "consultó", "repasó"],
  profetizar: ["profetizar", "profetizó", "predijo", "anunció", "visionó"],
  imponer: ["imponer", "impuso", "estableció", "dominó", "puso orden", "establecer orden", "trajo disciplina", "impuesto"]
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchFlexible(entidadNormal, textoNormal) {
  if (!entidadNormal || !textoNormal) return false;

  // Coincidencia exacta
  if (textoNormal.includes(entidadNormal)) return true;

  // Coincidencia por palabras individuales del nombre
  const partes = entidadNormal.split(/\s+/); // ej. ['ursula', 'iguaran']
  return partes.some(parte => textoNormal.includes(parte));
}


function limpiarTexto(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function normalizar(texto) {
  const textoNormalizado = nlp(texto)
    .normalize({ punctuation: true, plurals: true })
    .out('text');
  const limpio = limpiarTexto(textoNormalizado);
  console.log('🔧 [nlpProcessor] Texto normalizado:', limpio);
  return limpio;
}

async function buscarEventoSimilar(pregunta) {
  console.log('🔍 [FuzzySearch] Iniciando búsqueda de evento similar...');

  const texto = normalizar(pregunta);
  console.log('🔧 [FuzzySearch] Texto normalizado:', texto);

  let eventos;
  try {
    eventos = await Evento.find({}, 'nombre descripcion');
  } catch (error) {
    console.error('❌ [FuzzySearch] Error al obtener eventos:', error);
    return null;
  }

  if (!eventos.length) {
    console.warn('⚠️ [FuzzySearch] No hay eventos en la base de datos.');
    return null;
  }

  const calcularScore = (a, b) => {
    const palabrasA = new Set(a.split(' '));
    const palabrasB = new Set(b.split(' '));
    const interseccion = [...palabrasA].filter(p => palabrasB.has(p));
    return interseccion.length / Math.max(palabrasA.size, 1);
  };

  const candidatos = eventos.map(e => {
    const combinado = limpiarTexto(`${e.nombre} ${e.descripcion || ''}`);
    const score = calcularScore(texto, combinado);
    console.log(`📄 [FuzzySearch] Evento: "${e.nombre}" => Score: ${score.toFixed(3)}`);
    return { evento: e, score };
  }).sort((a, b) => b.score - a.score);

  const top = candidatos[0];
  if (top && top.score > 0.2) {
    console.log(`✅ [FuzzySearch] Mejor coincidencia: "${top.evento.nombre}" con score ${top.score.toFixed(3)}`);
    return top.evento;
  } else {
    console.log('❌ [FuzzySearch] No se encontró ningún evento suficientemente similar.');
    return null;
  }
}

function extraerAlias(nombreCompleto) {
  const aliasMatch = nombreCompleto.match(/\((.*?)\)/);
  const alias = aliasMatch ? aliasMatch[1] : null;
  const limpio = nombreCompleto.replace(/\s*\(.*?\)\s*/g, '').trim();
  return {
    nombre: limpiarTexto(limpio),
    alias: alias ? limpiarTexto(alias) : null,
    original: nombreCompleto
  };
}

async function analizarPregunta(pregunta) {
  console.log('🔍 [nlpProcessor] Pregunta cruda:', pregunta);
  const texto = normalizar(pregunta);
  const capMatch = texto.match(/cap[ií]tulo\s*(\d+)/);
  const capitulo = capMatch ? parseInt(capMatch[1], 10) : null;
  console.log('🔢 [nlpProcessor] Capítulo detectado:', capitulo);

  const personajesBD = await Personaje.find({}, 'nombre');
  const lugaresBD = await Lugar.find({}, 'nombre');
  const objetosBD = Objeto ? await Objeto.find({}, 'nombre') : [];

  const personajes = personajesBD.filter(p => {
    const { nombre, alias, original } = extraerAlias(p.nombre);
    const nombreMatch = matchFlexible(nombre, texto);
    const aliasMatch = alias && matchFlexible(alias, texto);
    const matched = nombreMatch || aliasMatch;
    if (nombreMatch || aliasMatch) {
      const porAlias = aliasMatch ? ' (alias)' : '';
      console.log(`🟢 [MATCH] Personaje detectado: "${p.nombre}"${porAlias}`);
    }
    return matched;
  }).map(p => p.nombre);

  const lugares = lugaresBD
    .map(l => ({ original: l.nombre, normal: limpiarTexto(l.nombre) }))
    .filter(l => matchFlexible(l.normal, texto))
    .map(l => l.original);

  const objetos = objetosBD
    .map(o => ({ original: o.nombre, normal: limpiarTexto(o.nombre) }))
    .filter(o => matchFlexible(o.normal, texto))
    .map(o => o.original);

  console.log('👤 [nlpProcessor] Personajes detectados:', personajes);
  console.log('📍 [nlpProcessor] Lugares detectados:', lugares);
  console.log('📦 [nlpProcessor] Objetos detectados:', objetos);

  // ----------------------
  // Reemplazar el bloque de detección de verbos por este bloque:
  const regexVerbos = [];       // aquí almacenaremos RegExp para la consulta en BD
  const verbosDetectados = [];  // opcional, para logging o contexto

  // normalizar pregunta para detección (sin tildes, minúsculas)
  const textoNorm = limpiarTexto(pregunta); // o la función que uses para normalizar en minúsculas y quitar diacríticos

  for (const [clave, formas] of Object.entries(verbosClave)) {
    for (const forma of formas) {
      // Normalizamos la forma para detectar en la pregunta
      const formaNorm = limpiarTexto(forma);
      const reDetect = new RegExp(`\\b${escapeRegex(formaNorm)}\\b`, 'i');
      if (reDetect.test(textoNorm)) {
        // Se detectó esta forma en la pregunta
        verbosDetectados.push({ clave, formaEncontrada: forma });
        // Ahora construimos regex para todas las variantes literales de esta clave
        for (const f of formas) {
          // Escapamos caracteres especiales, mantenemos tildes literales
          const escapedLiteral = escapeRegex(f);
          regexVerbos.push(new RegExp(`\\b${escapedLiteral}\\b`, 'i'));
        }
        break; // pasamos al siguiente verboClave
      }
    }
  }

  console.log('✏️ [nlpProcessor] Verbos detectados:', verbosDetectados);

  const fuzzy = await buscarEventoSimilar(pregunta);

  return {
    capitulo,
    regexVerbos,               // usado en preguntas.js
    personajes,                // <-- ESTO sí lo espera preguntas.js
    lugares,                   // <-- ESTO también
    objetos,                   // opcional, si lo necesitas luego
    fuzzy                      // por si preguntas.js lo usa
  };


}

module.exports = { analizarPregunta, normalizar };
