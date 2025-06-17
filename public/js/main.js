/**
 * @fileoverview Manejador principal del frontend: búsqueda semántica y edición de entidades
 * (personajes, lugares, objetos, generaciones, eventos).
 * Se ejecuta cuando el DOM se carga.
 */
document.addEventListener('DOMContentLoaded', () => {
    /**
     * @type {HTMLInputElement}
     * Elemento de entrada de texto para la consulta.
     */
    const input = document.getElementById('queryInput');
    /**
     * @type {HTMLButtonElement}
     * Botón para disparar la búsqueda.
     */
    const btn = document.getElementById('searchBtn');
    /**
     * @type {HTMLElement}
     * Contenedor donde se mostrarán los resultados de búsqueda.
     */
    const out = document.getElementById('searchResults');

    /**
     * Determina si una cadena debe tratarse como pregunta semántica.
     * Considera:
     *  1) Si termina con signo de interrogación (¿ o ?).
     *  2) Si comienza con palabra interrogativa (quién, qué, cuándo, etc.).
     *  3) Si menciona “capítulo <número>”.
     *
     * @param {string} q - Texto de la consulta.
     * @returns {boolean} True si se detecta como pregunta semántica.
     */
    function esPregunta(q) {
        const qTrim = q.trim();
        if (!qTrim) return false;
        const qNorm = qTrim.toLowerCase();

        // 1) Si termina en signo de interrogación (¿ o ?)
        if (/[?¿]\s*$/.test(qTrim)) {
            console.log('esPregunta: detectado por signo ?', qTrim);
            return true;
        }
        // 2) Si comienza con palabra interrogativa al inicio
        if (/^(qu[eé]|cu[aá]ndo|d[oó]nde|por qu[eé]|c[oó]mo|qui[eé]n|para qu[eé]|cu[aá]les?)\b/i.test(qNorm)) {
            console.log('esPregunta: detectado por palabra interrogativa al inicio:', qNorm);
            return true;
        }
        // 3) Si menciona “capítulo <número>” (puede estar en medio o al inicio)
        const capMatch = qNorm.match(/cap[ií]tulo\s*(\d+)/i);
        if (capMatch) {
            console.log('esPregunta: detectado por “capítulo N”:', capMatch[0]);
            return true;
        }
        // No se considera pregunta semántica
        console.log('esPregunta: no es pregunta semántica:', qTrim);
        return false;
    }

    /**
     * Carga opciones en los selects del modal de edición:
     * - Personajes
     * - Lugares
     * - Generaciones
     * Popula los elementos <select> con id 'editPersonaje', 'editLugar', 'editGeneracion'.
     *
     * @returns {Promise<void>} Promise que resuelve cuando se han cargado y asignado las opciones.
     */
    async function cargarOpcionesSelect() {
        try {
            const [pers, lug, gen] = await Promise.all([
                fetch('/api/personajes').then(res => res.json()),
                fetch('/api/lugares').then(res => res.json()),
                fetch('/api/generaciones').then(res => res.json())
            ]);
            const selectPersonaje = document.getElementById('editPersonaje');
            const selectLugar = document.getElementById('editLugar');
            const selectGeneracion = document.getElementById('editGeneracion');

            selectPersonaje.innerHTML = pers.map(p =>
                `<option value="${p._id}">${p.nombre}</option>`
            ).join('');
            selectLugar.innerHTML = lug.map(l =>
                `<option value="${l._id}">${l.nombre}</option>`
            ).join('');
            selectGeneracion.innerHTML = gen.map(g =>
                `<option value="${g._id}">${g.nombre}</option>`
            ).join('');
        } catch (err) {
            console.error('Error cargando opciones para edición:', err);
        }
    }

    /**
     * Realiza la búsqueda al pulsar botón o Enter.
     * Decide endpoint según si es pregunta semántica o búsqueda simple.
     * Muestra mensaje de "Cargando..." y maneja timeout visual si tarda >5s.
     * Luego procesa la respuesta JSON para renderizar resultados en 'out'.
     *
     * @returns {Promise<void>}
     */
    async function buscar() {
        const q = input.value.trim();
        if (!q) {
            out.innerHTML = '<p class="text-warning">Escribe algo para buscar…</p>';
            return;
        }

        out.innerHTML = '<p>Cargando resultados…</p>';
        const endpoint = esPregunta(q)
            ? `/api/preguntas?q=${encodeURIComponent(q)}`
            : `/api/buscar?q=${encodeURIComponent(q)}`;

        console.log('Buscar:', q, 'endpoint=', endpoint);

        // Timeout visual de 5s
        const timeoutId = setTimeout(() => {
            if (out.innerHTML.includes('Cargando resultados')) {
                out.innerHTML = '<p class="text-warning">La búsqueda está tardando mucho…</p>';
            }
        }, 5000);

        try {
            const res = await fetch(endpoint);
            clearTimeout(timeoutId);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            const data = await res.json();

            if (!esPregunta(q)) {
                // Búsqueda simple
                const keys = Object.keys(data);
                const total = keys.reduce((sum, k) => sum + data[k].length, 0);
                if (!total) {
                    out.innerHTML = `<p class="text-info">No se encontraron coincidencias para “${q}”.</p>`;
                    return;
                }

                let html = `<h4 class="text-primary">Resultados para “${q}”:</h4>`;

                keys.forEach(key => {
                    if (!data[key].length) return;
                    html += `<h5 class="mt-3 text-secondary">${key.charAt(0).toUpperCase() + key.slice(1)}:</h5>`;
                    data[key].forEach(item => {
                        let extra = '';
                        let editDataAttrs = '';

                        if (key === 'personajes') {
                            extra = `
                                <p><strong>Destino:</strong> ${item.destino || ''}</p>
                                <p><strong>Género:</strong> ${item.genero || ''}</p>
                                <p><strong>Generación:</strong> ${item.generacion || ''}</p>
                                ${item.objetos?.length
                                    ? `<p><strong>Objetos:</strong> ${item.objetos.map(o => o.nombre).join(', ')}</p>`
                                    : ''}
                            `;
                            editDataAttrs = `
                                data-tipo="personaje"
                                data-id="${item._id}"
                                data-nombre="${item.nombre || ''}"
                                data-destino="${item.destino || ''}"
                                data-genero="${item.genero || ''}"
                                data-generacion="${item.generacion || ''}"
                            `;
                        } else if (key === 'lugares') {
                            extra = `
                                <p><strong>Descripción:</strong> ${item.descripcion || ''}</p>
                                ${item.eventos_relacionados?.length
                                    ? `<p><strong>Eventos relacionados:</strong> ${item.eventos_relacionados.map(ev => ev.nombre).join(', ')}</p>`
                                    : ''}
                                ${item.generaciones_relacionadas?.length
                                    ? `<p><strong>Generaciones relacionadas:</strong> ${item.generaciones_relacionadas.map(g => g.nombre).join(', ')}</p>`
                                    : ''}
                            `;
                            editDataAttrs = `
                                data-tipo="lugar"
                                data-id="${item._id}"
                                data-nombre="${item.nombre || ''}"
                                data-descripcion="${item.descripcion || ''}"
                            `;
                        } else if (key === 'generaciones') {
                            extra = `
                                <p><strong>Descripción:</strong> ${item.descripcion || ''}</p>
                                ${item.personajes_principales?.length
                                    ? `<p><strong>Personajes principales:</strong> ${item.personajes_principales.map(p => p.nombre).join(', ')}</p>`
                                    : ''}
                            `;
                            editDataAttrs = `
                                data-tipo="generacion"
                                data-id="${item._id}"
                                data-nombre="${item.nombre || ''}"
                                data-descripcion="${item.descripcion || ''}"
                            `;
                        } else if (key === 'eventos') {
                            const personajesBadges = (item.personajes_involucrados || [])
                                .map(p => `<span class="badge badge-secondary mr-1">${p.nombre}</span>`).join('');
                            extra = `
                                <p><strong>Descripción:</strong> ${item.descripcion || ''}</p>
                                ${personajesBadges ? `<p><strong>Personajes:</strong> ${personajesBadges}</p>` : ''}
                                ${item.lugar_relacionado?.nombre ? `<p><strong>Lugar:</strong> ${item.lugar_relacionado.nombre}</p>` : ''}
                                ${item.generacion_relacionada?.nombre ? `<p><strong>Generación:</strong> ${item.generacion_relacionada.nombre}</p>` : ''}
                            `;
                            // pasamos referencias en data-attrs para preselección
                            editDataAttrs = `
                                data-tipo="evento"
                                data-id="${item._id}"
                                data-nombre="${item.nombre || ''}"
                                data-descripcion="${item.descripcion || ''}"
                                data-personajes='${JSON.stringify(item.personajes_involucrados?.map(p => p._id) || [])}'
                                data-lugar='${item.lugar_relacionado?._id || ''}'
                                data-generacion='${item.generacion_relacionada?._id || ''}'
                            `;
                        } else if (key === 'objetos') {
                            extra = `
                                <p><strong>Descripción:</strong> ${item.descripcion || ''}</p>
                                ${item.evento_relacionado?.nombre ? `<p><strong>Evento:</strong> ${item.evento_relacionado.nombre}</p>` : ''}
                                ${item.lugar_relacionado?.nombre ? `<p><strong>Lugar:</strong> ${item.lugar_relacionado.nombre}</p>` : ''}
                                ${item.personaje_relacionado?.nombre ? `<p><strong>Personaje:</strong> ${item.personaje_relacionado.nombre}</p>` : ''}
                                ${item.generacion_relacionada?.nombre ? `<p><strong>Generación:</strong> ${item.generacion_relacionada.nombre}</p>` : ''}
                            `;
                            editDataAttrs = `
                                data-tipo="objeto"
                                data-id="${item._id}"
                                data-nombre="${item.nombre || ''}"
                                data-descripcion="${item.descripcion || ''}"
                                data-evento='${item.evento_relacionado?._id || ''}'
                                data-lugar='${item.lugar_relacionado?._id || ''}'
                                data-personaje='${item.personaje_relacionado?._id || ''}'
                                data-generacion='${item.generacion_relacionada?._id || ''}'
                            `;
                        } else {
                            // fallback
                            extra = `<p><strong>Descripción:</strong> ${item.descripcion || ''}</p>`;
                            editDataAttrs = `
                                data-tipo="${key}"
                                data-id="${item._id}"
                                data-nombre="${item.nombre || ''}"
                                data-descripcion="${item.descripcion || ''}"
                            `;
                        }

                        html += `
                            <div class="card mb-2">
                                <div class="card-body">
                                    <h5 class="card-title">${item.nombre || ''}</h5>
                                    ${extra}
                                    <button class="btn btn-sm btn-outline-primary editar-simple-btn" ${editDataAttrs}>Editar</button>
                                </div>
                            </div>
                        `;
                    });
                });

                // Inserción de HTML y luego asignar listeners
                out.innerHTML = html;
                document.querySelectorAll('.editar-simple-btn').forEach(btn => {
                    btn.addEventListener('click', () => abrirModalEdicionSimple(btn.dataset));
                });
            } else {
                // Pregunta o capítulo: resultados de eventos
                const { capitulo, resultados } = data;
                if (!resultados.length) {
                    out.innerHTML = capitulo === 'todos'
                        ? `<p class="text-info">No se encontraron eventos para “${q}”.</p>`
                        : `<p class="text-info">No se encontraron eventos en el capítulo ${capitulo}.</p>`;
                    return;
                }
                const header = capitulo === 'todos'
                    ? `<h4 class="text-primary">Resultados para “${q}”:</h4>`
                    : `<h4 class="text-primary">Eventos en capítulo ${capitulo}:</h4>`;

                const itemsHtml = resultados.map(ev => {
                    const personajes = (ev.personajes_involucrados || [])
                        .map(p => `<span class="badge badge-secondary mr-1">${p.nombre}</span>`).join('');
                    const lugar = ev.lugar_relacionado?.nombre
                        ? `<p><strong>Lugar:</strong> <span class="badge badge-secondary">${ev.lugar_relacionado.nombre}</span></p>`
                        : '';
                    const generacion = ev.generacion_relacionada?.nombre
                        ? `<p><strong>Generación:</strong> <span class="badge badge-secondary">${ev.generacion_relacionada.nombre}</span></p>`
                        : '';
                    return `
                        <div class="card mb-2">
                            <div class="card-body">
                                <h5 class="card-title">${ev.nombre}</h5>
                                <p class="card-text">${ev.descripcion}</p>
                                ${personajes ? `<p><strong>Personajes:</strong> ${personajes}</p>` : ''}
                                ${lugar}
                                ${generacion}
                                <button class="btn btn-sm btn-outline-primary editar-btn" data-id="${ev._id}">Editar</button>
                            </div>
                        </div>
                    `;
                }).join('');
                out.innerHTML = header + itemsHtml;
                document.querySelectorAll('.editar-btn').forEach(btnEd => {
                    btnEd.addEventListener('click', async () => {
                        const id = btnEd.getAttribute('data-id');
                        const cardBody = btnEd.closest('.card-body');
                        document.getElementById('editEventId').value = id;
                        document.getElementById('editNombre').value =
                            cardBody.querySelector('.card-title').textContent.trim();
                        document.getElementById('editDescripcion').value =
                            cardBody.querySelector('.card-text').textContent.trim();
                        await cargarOpcionesSelect();
                        $('#editModal').modal('show');
                    });
                });
            }
        } catch (e) {
            clearTimeout(timeoutId);
            console.error('Error en buscar():', e);
            out.innerHTML = `<p class="text-danger">Error: ${e.message}</p>`;
        }
    }

    /**
     * Listener del formulario de edición de eventos (modal fijo en tu HTML).
     * Se asocia si existe el elemento con id 'editForm'.
     */
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editEventId').value;
            const body = {
                nombre: document.getElementById('editNombre').value,
                descripcion: document.getElementById('editDescripcion').value,
                personajes_involucrados: [document.getElementById('editPersonaje').value],
                lugar_relacionado: document.getElementById('editLugar').value,
                generacion_relacionada: document.getElementById('editGeneracion').value
            };
            try {
                const res = await fetch(`/api/eventos/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Error al actualizar el evento');
                }
                $('#editModal').modal('hide');
                alert('Evento actualizado con éxito.');
                buscar();
            } catch (err) {
                console.error(err);
                alert(err.message);
            }
        });
    }

    /**
     * Abre modal de edición simple para cada tipo de entidad.
     * @param {DOMStringMap} dataset - Atributos data-* del elemento disparador.
     */
    function abrirModalEdicionSimple(dataset) {
        const { tipo, id, nombre, descripcion } = dataset;
        document.getElementById('simpleEditTipo').value = tipo;
        document.getElementById('simpleEditId').value = id;

        let html = `
            <div class="form-group">
                <label>Nombre</label>
                <input type="text" class="form-control" id="editNombreSimple" value="${nombre || ''}">
            </div>
        `;

        if (tipo === 'personaje') {
            const destino = dataset.destino || '';
            const genero = dataset.genero || '';
            const generacion = dataset.generacion || '';
            html += `
                <div class="form-group">
                    <label>Destino</label>
                    <input type="text" class="form-control" id="editDestinoSimple" value="${destino}">
                </div>
                <div class="form-group">
                    <label>Género</label>
                    <select class="form-control" id="editGeneroSimple">
                        <option value="masculino" ${genero === 'masculino' ? 'selected' : ''}>Masculino</option>
                        <option value="femenino" ${genero === 'femenino' ? 'selected' : ''}>Femenino</option>
                        <option value="otro" ${genero === 'otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Generación</label>
                    <input type="number" class="form-control" id="editGeneracionNumSimple" value="${generacion}">
                </div>
            `;
            document.getElementById('simpleEditBody').innerHTML = html;
            $('#simpleEditModal').modal('show');
        } else if (tipo === 'lugar' || tipo === 'generacion') {
            html += `
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea class="form-control" id="editDescripcionSimple">${descripcion || ''}</textarea>
                </div>
            `;
            document.getElementById('simpleEditBody').innerHTML = html;
            $('#simpleEditModal').modal('show');
        } else if (tipo === 'evento') {
            let personajesAct = [];
            try { personajesAct = JSON.parse(dataset.personajes || '[]'); } catch { }
            const lugarAct = dataset.lugar || '';
            const genAct = dataset.generacion || '';
            html += `
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea class="form-control" id="editDescripcionSimple">${descripcion || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Personajes involucrados</label>
                    <select multiple class="form-control" id="editPersonajesSimple"></select>
                </div>
                <div class="form-group">
                    <label>Lugar relacionado</label>
                    <select class="form-control" id="editLugarSimple"></select>
                </div>
                <div class="form-group">
                    <label>Generación relacionada</label>
                    <select class="form-control" id="editGeneracionSimple"></select>
                </div>
            `;
            document.getElementById('simpleEditBody').innerHTML = html;
            cargarOpcionesSelectSimple('evento', {
                personajes: personajesAct,
                lugar: lugarAct,
                generacion: genAct
            });
            $('#simpleEditModal').modal('show');
        } else if (tipo === 'objeto') {
            const eventoAct = dataset.evento || '';
            const lugarAct = dataset.lugar || '';
            const personajeAct = dataset.personaje || '';
            const genAct = dataset.generacion || '';
            html += `
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea class="form-control" id="editDescripcionSimple">${descripcion || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Evento relacionado</label>
                    <select class="form-control" id="editEventoSimple"></select>
                </div>
                <div class="form-group">
                    <label>Lugar relacionado</label>
                    <select class="form-control" id="editLugarSimple"></select>
                </div>
                <div class="form-group">
                    <label>Personaje relacionado</label>
                    <select class="form-control" id="editPersonajeSimple"></select>
                </div>
                <div class="form-group">
                    <label>Generación relacionada</label>
                    <select class="form-control" id="editGeneracionSimple"></select>
                </div>
            `;
            document.getElementById('simpleEditBody').innerHTML = html;
            cargarOpcionesSelectSimple('objeto', {
                evento: eventoAct,
                lugar: lugarAct,
                personaje: personajeAct,
                generacion: genAct
            });
            $('#simpleEditModal').modal('show');
        } else {
            // fallback: únicamente nombre y descripción
            html += `
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea class="form-control" id="editDescripcionSimple">${descripcion || ''}</textarea>
                </div>
            `;
            document.getElementById('simpleEditBody').innerHTML = html;
            $('#simpleEditModal').modal('show');
        }
    }

    /**
     * Carga opciones en selects del modal de edición simple para 'evento' u 'objeto'.
     * - Si tipo='evento', llena selects de personajes, lugares y generaciones,
     *   preseleccionando según datosActuales.personajes, lugar, generacion.
     * - Si tipo='objeto', llena selects de eventos, lugares, personajes y generaciones,
     *   preseleccionando según datosActuales.evento, lugar, personaje, generacion.
     *
     * @param {'evento'|'objeto'} tipo - Tipo de entidad a editar.
     * @param {Object} datosActuales - Valores actuales para preselección.
     *   - Para 'evento': { personajes: string[], lugar: string, generacion: string }
     *   - Para 'objeto': { evento: string, lugar: string, personaje: string, generacion: string }
     * @returns {Promise<void>}
     */
    async function cargarOpcionesSelectSimple(tipo, datosActuales) {
        try {
            const [persList, lugList, genList, eventosList] = await Promise.all([
                fetch('/api/personajes').then(r => r.json()),
                fetch('/api/lugares').then(r => r.json()),
                fetch('/api/generaciones').then(r => r.json()),
                fetch('/api/eventos').then(r => r.json()),
            ]);

            if (tipo === 'evento') {
                const selectP = document.getElementById('editPersonajesSimple');
                selectP.innerHTML = persList.map(p =>
                    `<option value="${p._id}" ${datosActuales.personajes.includes(p._id) ? 'selected' : ''}>${p.nombre}</option>`
                ).join('');
                const selectL = document.getElementById('editLugarSimple');
                selectL.innerHTML = lugList.map(l =>
                    `<option value="${l._id}" ${datosActuales.lugar === l._id ? 'selected' : ''}>${l.nombre}</option>`
                ).join('');
                const selectG = document.getElementById('editGeneracionSimple');
                selectG.innerHTML = genList.map(g =>
                    `<option value="${g._id}" ${datosActuales.generacion === g._id ? 'selected' : ''}>${g.nombre}</option>`
                ).join('');
            } else if (tipo === 'objeto') {
                const selectEv = document.getElementById('editEventoSimple');
                selectEv.innerHTML = eventosList.map(ev =>
                    `<option value="${ev._id}" ${datosActuales.evento === ev._id ? 'selected' : ''}>${ev.nombre}</option>`
                ).join('');
                const selectL = document.getElementById('editLugarSimple');
                selectL.innerHTML = lugList.map(l =>
                    `<option value="${l._id}" ${datosActuales.lugar === l._id ? 'selected' : ''}>${l.nombre}</option>`
                ).join('');
                const selectP = document.getElementById('editPersonajeSimple');
                selectP.innerHTML = persList.map(p =>
                    `<option value="${p._id}" ${datosActuales.personaje === p._id ? 'selected' : ''}>${p.nombre}</option>`
                ).join('');
                const selectG = document.getElementById('editGeneracionSimple');
                selectG.innerHTML = genList.map(g =>
                    `<option value="${g._id}" ${datosActuales.generacion === g._id ? 'selected' : ''}>${g.nombre}</option>`
                ).join('');
            }
        } catch (err) {
            console.error('Error en cargarOpcionesSelectSimple:', err);
        }
    }

    /**
     * Listener del formulario de edición simple (modal).
     * Actualiza la entidad correspondiente según 'tipo' (personaje, lugar, generación, evento, objeto).
     * Construye body JSON según campos del modal, corrige pluralización de endpoint,
     * y envía PUT a `/api/{endpoint}/{id}`.
     *
     * @returns {void}
     */
    const simpleEditForm = document.getElementById('simpleEditForm');
    if (simpleEditForm) {
        simpleEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tipo = document.getElementById('simpleEditTipo').value;
            const id = document.getElementById('simpleEditId').value;
            let body = { nombre: document.getElementById('editNombreSimple').value };

            if (tipo === 'personaje') {
                body.destino = document.getElementById('editDestinoSimple').value;
                body.genero = document.getElementById('editGeneroSimple').value;
                body.generacion = parseInt(document.getElementById('editGeneracionNumSimple').value);
            } else if (tipo === 'lugar' || tipo === 'generacion') {
                body.descripcion = document.getElementById('editDescripcionSimple').value;
            } else if (tipo === 'evento') {
                body.descripcion = document.getElementById('editDescripcionSimple').value;
                const selPersOpts = Array.from(document.getElementById('editPersonajesSimple').selectedOptions);
                body.personajes_involucrados = selPersOpts.map(o => o.value);
                body.lugar_relacionado = document.getElementById('editLugarSimple').value;
                body.generacion_relacionada = document.getElementById('editGeneracionSimple').value;
            } else if (tipo === 'objeto') {
                body.descripcion = document.getElementById('editDescripcionSimple').value;
                body.evento_relacionado = document.getElementById('editEventoSimple').value;
                body.lugar_relacionado = document.getElementById('editLugarSimple').value;
                body.personaje_relacionado = document.getElementById('editPersonajeSimple').value;
                body.generacion_relacionada = document.getElementById('editGeneracionSimple').value;
            }
            try {
                // Corrige pluralización manualmente para evitar errores como "generacions"
                const endpointMap = {
                    personaje: 'personajes',
                    lugar: 'lugares',
                    generacion: 'generaciones',
                    evento: 'eventos',
                    objeto: 'objetos'
                };

                const endpoint = endpointMap[tipo];
                if (!endpoint) throw new Error('Tipo de entidad desconocido');

                const res = await fetch(`/api/${endpoint}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Error al actualizar');
                }

                $('#simpleEditModal').modal('hide');
                alert(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} actualizado correctamente.`);
                buscar(); // refresca resultados
            } catch (err) {
                console.error(err);
                alert('Error al guardar cambios: ' + (err.message || ''));
            }
        });
    }

    /**
     * Asigna listeners para disparar la búsqueda:
     * - Click en botón 'searchBtn'
     * - Tecla Enter en input de búsqueda
     */
    btn.addEventListener('click', buscar);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
});
