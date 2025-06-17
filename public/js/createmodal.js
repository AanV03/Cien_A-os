// createModal y addDropdown para CREATE dinámico de distintas entidades.
// Usa clases 'custom-modal-backdrop' y 'custom-modal-content'.

async function createModal(entityName, postUrl) {
    // Backdrop dinámico
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-modal-backdrop';

    // Contenedor de contenido
    const container = document.createElement('div');
    container.className = 'custom-modal-content';

    // Formulario interno
    const form = document.createElement('form');
    form.style = `
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;

    // Título
    const title = document.createElement('h2');
    title.textContent = `Crear nuevo ${entityName}`;
    form.appendChild(title);

    // Campos básicos
    // Nombre
    const labelNombre = document.createElement('label');
    labelNombre.textContent = 'Nombre';
    const inputNombre = document.createElement('input');
    inputNombre.name = 'nombre';
    inputNombre.type = 'text';
    inputNombre.className = 'form-control';
    form.appendChild(labelNombre);
    form.appendChild(inputNombre);

    // Dependiendo de entityName, agrega campos adicionales
    if (entityName === 'Personaje') {
        // Descripción
        const labelDesc = document.createElement('label');
        labelDesc.textContent = 'Descripción';
        const inputDesc = document.createElement('input');
        inputDesc.name = 'descripcion';
        inputDesc.type = 'text';
        inputDesc.className = 'form-control';
        form.appendChild(labelDesc);
        form.appendChild(inputDesc);

        // Género
        const labelGenero = document.createElement('label');
        labelGenero.textContent = 'Género';
        const selectGenero = document.createElement('select');
        selectGenero.name = 'genero';
        selectGenero.className = 'form-control';
        ['masculino', 'femenino', 'otro'].forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.textContent = optVal.charAt(0).toUpperCase() + optVal.slice(1);
            selectGenero.appendChild(opt);
        });
        form.appendChild(labelGenero);
        form.appendChild(selectGenero);

        // Destino
        const labelDestino = document.createElement('label');
        labelDestino.textContent = 'Destino';
        const inputDestino = document.createElement('input');
        inputDestino.name = 'destino';
        inputDestino.type = 'text';
        inputDestino.className = 'form-control';
        form.appendChild(labelDestino);
        form.appendChild(inputDestino);

        // Generación (número o id según tu modelo; aquí asumimos número)
        const labelGenNum = document.createElement('label');
        labelGenNum.textContent = 'Generación';
        const inputGenNum = document.createElement('input');
        inputGenNum.name = 'generacion';
        inputGenNum.type = 'number';
        inputGenNum.className = 'form-control';
        form.appendChild(labelGenNum);
        form.appendChild(inputGenNum);

    } else if (entityName === 'Lugar') {
        // Descripción
        const labelDesc = document.createElement('label');
        labelDesc.textContent = 'Descripción';
        const textareaDesc = document.createElement('textarea');
        textareaDesc.name = 'descripcion';
        textareaDesc.className = 'form-control';
        textareaDesc.rows = 2;
        form.appendChild(labelDesc);
        form.appendChild(textareaDesc);

    } else if (entityName === 'Evento') {
        // Descripción
        const labelDesc = document.createElement('label');
        labelDesc.textContent = 'Descripción';
        const textareaDesc = document.createElement('textarea');
        textareaDesc.name = 'descripcion';
        textareaDesc.className = 'form-control';
        textareaDesc.rows = 2;
        form.appendChild(labelDesc);
        form.appendChild(textareaDesc);

        // Select múltiples/personajes
        await addDropdown(form, 'personajes_involucrados', '/api/personajes', true);

        // Select lugar
        await addDropdown(form, 'lugar_relacionado', '/api/lugares');

        // Select generación
        await addDropdown(form, 'generacion_relacionada', '/api/generaciones');

    } else if (entityName === 'Objeto') {
        // Descripción
        const labelDesc = document.createElement('label');
        labelDesc.textContent = 'Descripción';
        const textareaDesc = document.createElement('textarea');
        textareaDesc.name = 'descripcion';
        textareaDesc.className = 'form-control';
        textareaDesc.rows = 2;
        form.appendChild(labelDesc);
        form.appendChild(textareaDesc);

        // Evento relacionado
        await addDropdown(form, 'evento_relacionado', '/api/eventos');

        // Lugar relacionado
        await addDropdown(form, 'lugar_relacionado', '/api/lugares');

        // Personaje relacionado
        await addDropdown(form, 'personaje_relacionado', '/api/personajes');

        // Generación relacionada
        await addDropdown(form, 'generacion_relacionada', '/api/generaciones');

    } else if (entityName === 'Generacion') {
        // Descripción
        const labelDesc = document.createElement('label');
        labelDesc.textContent = 'Descripción';
        const textareaDesc = document.createElement('textarea');
        textareaDesc.name = 'descripcion';
        textareaDesc.className = 'form-control';
        textareaDesc.rows = 2;
        form.appendChild(labelDesc);
        form.appendChild(textareaDesc);
    } else {
        // Si hubieran otros, agrega aquí
    }

    // Botón de submit
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Guardar';
    submitBtn.className = 'btn btn-primary mt-2';
    form.appendChild(submitBtn);

    // Botón de cerrar (opcional dentro del modal)
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Cancelar';
    closeBtn.className = 'btn btn-secondary mt-2 ml-2';
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(backdrop);
    });
    form.appendChild(closeBtn);

    // Añadir listener submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const jsonData = {};

        for (const el of form.elements) {
            if (!el.name) continue;
            if (el.tagName === 'SELECT' && el.multiple) {
                // select múltiple
                jsonData[el.name] = Array.from(el.selectedOptions).map(opt => opt.value);
            } else if (el.type === 'number') {
                const val = el.value;
                if (val !== '') {
                    jsonData[el.name] = parseInt(val);
                }
            } else {
                // texto, textarea, select simple
                if (el.value !== '') {
                    jsonData[el.name] = el.value;
                }
            }
        }

        try {
            const res = await fetch(postUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonData)
            });

            if (res.ok) {
                // Podrías recargar datos visibles aquí, e.g., llamar a buscar() si existe
                alert(`${entityName} creado exitosamente`);
                document.body.removeChild(backdrop);

                // Si tienes una función global para actualizar lista, la llamas aquí, p.ej.:
                if (typeof buscar === 'function') {
                    buscar();
                }
            } else {
                let errMsg = 'Error desconocido';
                try {
                    const errData = await res.json();
                    errMsg = errData.error || JSON.stringify(errData);
                } catch (_) { }
                alert(`Error al crear ${entityName}: ${errMsg}`);
            }
        } catch (err) {
            console.error(`[ERROR] POST ${postUrl}`, err);
            alert('Error de red al crear entidad');
        }
    });

    // Cuando se haga click fuera del container, cierra
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            document.body.removeChild(backdrop);
        }
    });

    container.appendChild(form);
    backdrop.appendChild(container);
    document.body.appendChild(backdrop);
}

// addDropdown: agrega un label + select a 'form'. Si multiple=true, permite multi-selección.
// apiEndpoint debe devolver array de objetos con al menos _id y nombre (o descripcion/titulo).
async function addDropdown(form, fieldName, apiEndpoint, multiple = false) {
    const label = document.createElement('label');
    // Capitaliza campos (_ -> espacio)
    label.textContent = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    label.className = 'mt-2';
    const select = document.createElement('select');
    select.name = fieldName;
    select.className = 'form-control';
    if (multiple) select.multiple = true;

    // Intenta cargar opciones
    try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) throw new Error('Error al obtener datos');
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No disponible';
            select.appendChild(option);
        } else {
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item._id;
                // Texto: prioriza nombre, luego descripción, luego otro campo
                option.textContent = item.nombre || item.descripcion || item.titulo || 'Sin nombre';
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error(`[ERROR] Cargando ${fieldName} desde ${apiEndpoint}`, err);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Error al cargar';
        select.appendChild(option);
    }

    form.appendChild(label);
    form.appendChild(select);
}
