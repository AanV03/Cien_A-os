document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('queryInput');
    const btn = document.getElementById('searchBtn');
    const out = document.getElementById('searchResults');

    // Detecta pregunta, capítulo o búsqueda simple
    function esPregunta(q) {
        const qNorm = q.toLowerCase();
        return (
            /[¿?]/.test(q) ||
            /\b(qu[eé]|cu[aá]ndo|d[oó]nde|por qu[eé]|c[oó]mo|qui[eé]n|para qu[eé]|cu[aá]les?)\b/i.test(qNorm) ||
            /cap[ií]tulo\s*\d+/i.test(qNorm)
        );
    }

    // Carga opciones en los selects del modal
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
            // Opcional: mostrar alerta o mensaje en modal si falla
        }
    }

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

        try {
            const res = await fetch(endpoint);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            const data = await res.json();

            if (!esPregunta(q)) {
                // Búsqueda simple: recorre cada colección
                const keys = Object.keys(data);
                const total = keys.reduce((sum, k) => sum + data[k].length, 0);
                if (!total) {
                    out.innerHTML = `<p class="text-info">No se encontraron coincidencias para “${q}”.</p>`;
                    return;
                }
                let html = `<h4 class="text-primary">Resultados para “${q}”:</h4>`;
                keys.forEach(key => {
                    if (data[key].length) {
                        html += `<h5 class="mt-3 text-secondary">${key.charAt(0).toUpperCase() + key.slice(1)}:</h5>`;
                        data[key].forEach(item => {
                            const title = item.nombre || item.titulo || '—';
                            const desc = item.descripcion || '';
                            html += `
                                <div class="card mb-2">
                                    <div class="card-body">
                                        <h5 class="card-title">${title}</h5>
                                        <p class="card-text">${desc}</p>
                                    </div>
                                </div>`;
                        });
                    }
                });
                out.innerHTML = html;
            } else {
                // Pregunta o capítulo
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

                // Construye las tarjetas con botón Editar
                const items = resultados.map(ev => {
                    const personajes = (ev.personajes_involucrados || [])
                        .map(p => `<span class="badge badge-secondary mr-1">${p.nombre}</span>`)
                        .join('');
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
                        </div>`;
                }).join('');

                out.innerHTML = header + items;

                // Ahora que ya se insertó el HTML, asigna listeners a cada botón Editar
                document.querySelectorAll('.editar-btn').forEach(btnEd => {
                    btnEd.addEventListener('click', async e => {
                        const id = btnEd.getAttribute('data-id');
                        // Encuentra la card-body correspondiente
                        const cardBody = btnEd.closest('.card-body');
                        // Rellena el formulario del modal con datos actuales
                        document.getElementById('editEventId').value = id;
                        document.getElementById('editNombre').value =
                            cardBody.querySelector('.card-title').textContent.trim();
                        document.getElementById('editDescripcion').value =
                            cardBody.querySelector('.card-text').textContent.trim();

                        // Cargar opciones de selects y, si deseas, preseleccionar el valor actual:
                        await cargarOpcionesSelect();
                        // Para preseleccionar: 
                        // Si 'ev.personajes_involucrados' es un array de objetos con _id,
                        // podrías hacer selectPersonaje.value = ev.personajes_involucrados[0]._id
                        // Pero aquí, como no tenemos 'ev' en este scope, una opción es:
                        // - Al renderizar, incluye data-attributes con el id actual.
                        // O tras fetch adicional GET /api/eventos/:id para obtener el objeto completo.
                        // Aquí asumiremos que solo elegimos de cero (el usuario re-selecciona).

                        // Mostrar modal
                        $('#editModal').modal('show');
                    });
                });
            }
        } catch (e) {
            console.error(e);
            out.innerHTML = `<p class="text-danger">Error: ${e.message}</p>`;
        }
    }

    // Listener del formulario de edición del modal
    document.getElementById('editForm').addEventListener('submit', async (e) => {
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
            if (!res.ok) throw new Error('Error al actualizar el evento');
            $('#editModal').modal('hide');
            // Opcional: mostrar mensaje breve en pantalla en vez de alert
            alert('Evento actualizado con éxito.');
            buscar(); // reejecuta búsqueda para refrescar resultados sin recargar toda la página
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    });

    // Finalmente, listener para búsqueda
    btn.addEventListener('click', buscar);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
});