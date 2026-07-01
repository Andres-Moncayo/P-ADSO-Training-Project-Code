// IMPORTAR EL SERVICIO
import { programasService } from '../api/programas.service.js';
import { registroService } from '../api/registro.service.js';

/* ------------------------------------------------------
   CONFIGURACIÓN GENERAL
------------------------------------------------------ */
const API_BASE = 'http://127.0.0.1:8000';
// El router tiene prefix="/programas_formacion" y el endpoint dentro también tiene "/programas_formacion"
const PROGRAMAS_PATH = '/programas_formacion/programas_formacion';
const REGISTRO_PATH = '/registro_calificado';
const REDES_PATH = '/redes_conocimiento';


/* ------------------------------------------------------
   FORMATEAR FECHAS
------------------------------------------------------ */
function formatDate(value) {
    if (!value) return '';
    try {
        const d = new Date(value);
        if (isNaN(d)) return value;
        return d.toLocaleDateString();
    } catch (e) {
        return value;
    }
}


/* ------------------------------------------------------
   PETICIÓN API CON TOKEN
------------------------------------------------------ */
async function fetchJson(url, token) {
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
        }
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const error = new Error(err.detail || res.statusText);
        error.status = res.status;
        throw error;
    }

    return res.json();
}


/* ------------------------------------------------------
   CARGAR PROGRAMAS CON REINTENTOS
------------------------------------------------------ */
async function cargarProgramas(intentos = 0, maxIntentos = 3) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const tbody = document.getElementById('datos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="17" class="text-center small text-muted">Cargando datos...</td></tr>';

    try {
        const urlSimple = `${API_BASE}${PROGRAMAS_PATH}/?limit=500&skip=0`;
        let data;

        try {
            console.log("📡 Cargando programas desde:", urlSimple, `(intento ${intentos + 1}/${maxIntentos})`);
            data = await fetchJson(urlSimple, token);
            console.log("✅ Datos recibidos:", data);
        } catch (err) {
            console.warn(`⚠️ Intento ${intentos + 1} falló:`, err.message, "Status:", err.status);
            // Si falló por permiso o error temporal, reintentar después de 500ms
            if (intentos < maxIntentos - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
                return cargarProgramas(intentos + 1, maxIntentos);
            }
            // Si agotó reintentos, mostrar error en la tabla con opción de reintentar
            console.error("❌ No se pudo cargar la tabla tras", maxIntentos, "intentos. Error:", err.message);
            tbody.innerHTML = `<tr><td colspan="17" class="text-center small text-danger">
                Error: ${err.message} (HTTP ${err.status || 'N/A'}). <button class="btn btn-sm btn-outline-primary ms-2" id="retry-cargar-programas">Reintentar</button>
            </td></tr>`;
            const retryBtn = document.getElementById('retry-cargar-programas');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => cargarProgramas(0, maxIntentos));
            }
            document.dispatchEvent(new CustomEvent('view:error', { detail: { view: 'programas', error: err } }));
            throw err;
        }

        const programas = data.programas || data;

        if (!programas || programas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="17" class="text-center small text-muted">No se encontraron registros</td></tr>';
            return;
        }

        // Paginación local (20 por página)
        const pageSize = 20;
        window.programasPage = window.programasPage || 1;
        window.programasData = programas;

        function displayValue(val) {
            if (val === null || val === undefined) return 'Sin Registro';
            if (typeof val === 'string' && val.trim() === '') return 'Sin Registro';
            return String(val);
        }

        function renderProgramas(page = 1) {
            window.programasPage = page;
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const visibles = window.programasData.slice(start, end);

            tbody.innerHTML = '';

            visibles.forEach(p => {
            const tr = document.createElement('tr');

            const tdCodigo = document.createElement('td');
            tdCodigo.textContent = displayValue(p.cod_programa);

            const tdNombre = document.createElement('td');
            tdNombre.textContent = displayValue(p.nombre);

            const tdNivel = document.createElement('td');
            tdNivel.textContent = displayValue(p.nivel);

            const tdDuracion = document.createElement('td');
            tdDuracion.textContent = displayValue(p.tiempo_dur);

            const tdUnidad = document.createElement('td');
            tdUnidad.textContent = displayValue(p.unidad_dur);

            const tdEstado = document.createElement('td');
            tdEstado.classList.add('text-center');
            tdEstado.textContent = displayValue(p.estado);

            const tdPdf = document.createElement('td');
            tdPdf.classList.add('text-center');
            if (p.url_pdf) {
                const a = document.createElement('a');
                a.href = p.url_pdf;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = 'Ver PDF';
                tdPdf.appendChild(a);
            } else {
                tdPdf.textContent = 'Sin Registro';
            }

            // -------------------- BOTÓN VER MÁS (LECTURA) --------------------
            const tdAcciones = document.createElement('td');
            tdAcciones.classList.add('text-center');

            const btnVerMas = document.createElement('button');
            btnVerMas.className = 'btn btn-sm btn-primary';
            btnVerMas.textContent = 'Más';

            btnVerMas.addEventListener('click', async() => {
                btnVerMas.disabled = true;
                btnVerMas.textContent = 'Cargando...';

                try {
                    const token = localStorage.getItem('access_token');
                    console.log("🔍 Programa a consultar:", { cod: p.cod_programa, version: p.version });

                    // Usar los datos ya cargados como base
                    let programaBase = p;
                    let registroCalificado = {};
                    let redConocimiento = {};

                    // 1) OBTENER TODAS LAS VERSIONES CON REGISTROS DEL PROGRAMA CON ID DE RED
                    try {
                        const rutaConRegistros = `${API_BASE}${PROGRAMAS_PATH}/con-registros/${p.cod_programa}`;
                        console.log("Obteniendo todas las versiones con registros desde:", rutaConRegistros);
                        const respuesta = await fetchJson(rutaConRegistros, token);
                        console.log("Respuesta recibida:", respuesta);

                        // respuesta es un array, buscar la versión específica
                        if (Array.isArray(respuesta)) {
                            const programaConRegistro = respuesta.find(prog => String(prog.version) === String(p.version));
                            if (programaConRegistro) {
                                programaBase = programaConRegistro;
                                // Convertir campos planos de registro en objeto para los modales
                                const registroKeys = ['tipo_tramite', 'fecha_radicado', 'numero_resolucion', 'fecha_resolucion', 'fecha_vencimiento', 'vigencia', 'modalidad', 'clasificacion', 'estado_catalogo'];
                                registroCalificado = {};
                                registroKeys.forEach(k => { if (programaConRegistro[k] !== undefined && programaConRegistro[k] !== null) registroCalificado[k] = programaConRegistro[k]; });
                                console.log("Programa y registro encontrados en la respuesta", registroCalificado);
                            } else {
                                console.warn("No se encontró la versión exacta, usando datos básicos");
                                programaBase = p;
                            }
                        }
                    } catch (e) {
                        console.warn("No se pudo obtener con registros, intentando rutas alternativas:", e.message);

                        // Fallback: intentar obtener programa simple
                        try {
                            const rutaPrograma = `${API_BASE}${PROGRAMAS_PATH}/${p.cod_programa}/${p.version}`;
                            console.log("Intentando programa simple desde:", rutaPrograma);
                            programaBase = await fetchJson(rutaPrograma, token);
                            console.log("Programa simple obtenido");
                        } catch (e2) {
                            console.warn("Tampoco disponible, usando datos de tabla");
                            programaBase = p;
                        }
                    }

                    // 3) OBTENER RED DE CONOCIMIENTO
                    if (p.id_red) {
                        try {
                            const rutaRed = `${API_BASE}${REDES_PATH}/obtener-por-id/${p.id_red}`;
                            console.log("Obteniendo red de conocimiento desde:", rutaRed);
                            redConocimiento = await fetchJson(rutaRed, token);
                            console.log("Red de conocimiento obtenida:", redConocimiento);
                        } catch (e) {
                            console.warn("No se pudo cargar la red:", e.message);
                        }
                    } else {
                        console.warn("El programa no tiene ID de red");
                    }

                    // 4) MOSTRAR MODAL EN LECTURA
                    showRegistroModalView(programaBase, registroCalificado, redConocimiento);

                } catch (err) {
                    console.error("Error general al obtener detalle:", err);
                    alert("Error al cargar los datos: " + (err.message || err));
                } finally {
                    btnVerMas.disabled = false;
                    btnVerMas.textContent = "Más";
                }
            });

            // -------------------- BOTÓN EDITAR (EDITABLE) --------------------
            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn btn-sm btn-outline-secondary ms-1';
            btnEditar.textContent = 'Editar';

            btnEditar.addEventListener('click', async() => {
                btnEditar.disabled = true;
                btnEditar.textContent = 'Cargando...';

                try {
                    const token = localStorage.getItem('access_token');
                    console.log("🔍 Programa a editar:", { cod: p.cod_programa, version: p.version });

                    // Usar los datos ya cargados como base
                    let programaBase = p;
                    let registroCalificado = {};
                    let redConocimiento = {};

                    // 1) OBTENER TODAS LAS VERSIONES CON REGISTROS DEL PROGRAMA CON ID DE RED
                    try {
                        const rutaConRegistros = `${API_BASE}${PROGRAMAS_PATH}/con-registros/${p.cod_programa}`;
                        console.log("Obteniendo todas las versiones con registros desde:", rutaConRegistros);
                        const respuesta = await fetchJson(rutaConRegistros, token);
                        console.log("Respuesta recibida:", respuesta);

                        // respuesta es un array, buscar la versión específica
                        if (Array.isArray(respuesta)) {
                            const programaConRegistro = respuesta.find(prog => String(prog.version) === String(p.version));
                            if (programaConRegistro) {
                                programaBase = programaConRegistro;
                                // Convertir campos planos de registro en objeto para los modales
                                const registroKeys = ['tipo_tramite', 'fecha_radicado', 'numero_resolucion', 'fecha_resolucion', 'fecha_vencimiento', 'vigencia', 'modalidad', 'clasificacion', 'estado_catalogo'];
                                registroCalificado = {};
                                registroKeys.forEach(k => { if (programaConRegistro[k] !== undefined && programaConRegistro[k] !== null) registroCalificado[k] = programaConRegistro[k]; });
                                console.log("Programa y registro encontrados en la respuesta", registroCalificado);
                            } else {
                                console.warn("No se encontró la versión exacta, usando datos básicos");
                                programaBase = p;
                            }
                        }
                    } catch (e) {
                        console.warn("No se pudo obtener con registros, intentando rutas alternativas:", e.message);

                        // Fallback: intentar obtener programa simple
                        try {
                            const rutaPrograma = `${API_BASE}${PROGRAMAS_PATH}/${p.cod_programa}/${p.version}`;
                            console.log("Intentando programa simple desde:", rutaPrograma);
                            programaBase = await fetchJson(rutaPrograma, token);
                            console.log("Programa simple obtenido");
                        } catch (e2) {
                            console.warn("Tampoco disponible, usando datos de tabla");
                            programaBase = p;
                        }
                    }

                    // 3) OBTENER RED DE CONOCIMIENTO
                    if (p.id_red) {
                        try {
                            const rutaRed = `${API_BASE}${REDES_PATH}/obtener-por-id/${p.id_red}`;
                            console.log("Obteniendo red de conocimiento desde:", rutaRed);
                            redConocimiento = await fetchJson(rutaRed, token);
                            console.log("Red de conocimiento obtenida:", redConocimiento);
                        } catch (e) {
                            console.warn("No se pudo cargar la red:", e.message);
                        }
                    } else {
                        console.warn("El programa no tiene ID de red");
                    }

                    // 4) MOSTRAR MODAL EN EDICIÓN
                    showRegistroModal(programaBase, registroCalificado, redConocimiento);

                } catch (err) {
                    console.error("Error general al obtener detalle:", err);
                    alert("Error al cargar los datos: " + (err.message || err));
                } finally {
                    btnEditar.disabled = false;
                    btnEditar.textContent = "Editar";
                }
            });

            tdAcciones.append(btnVerMas, btnEditar);

            tr.append(tdCodigo, tdNombre, tdNivel, tdDuracion, tdUnidad, tdEstado, tdPdf, tdAcciones);
            tbody.appendChild(tr);
        });

            // Paginación UI
            const total = window.programasData.length;
            const totalPages = Math.ceil(total / pageSize) || 1;
            let pag = document.getElementById('paginacionProgramas');
            const table = tbody.closest('table');
            if (!pag && table && table.parentElement) {
                pag = document.createElement('div');
                pag.id = 'paginacionProgramas';
                pag.className = 'd-flex justify-content-between align-items-center mt-3';
                table.parentElement.appendChild(pag);
            }
            if (pag) {
                pag.innerHTML = '';
                const info = document.createElement('span');
                const startHuman = total === 0 ? 0 : start + 1;
                const endHuman = Math.min(end, total);
                info.textContent = `Mostrando ${startHuman}-${endHuman} de ${total}`;

                const controls = document.createElement('div');
                const prev = document.createElement('button');
                prev.className = 'btn btn-sm btn-outline-primary me-2';
                prev.textContent = 'Anterior';
                prev.disabled = page <= 1;
                prev.addEventListener('click', () => renderProgramas(page - 1));

                const next = document.createElement('button');
                next.className = 'btn btn-sm btn-outline-primary';
                next.textContent = 'Siguiente';
                next.disabled = page >= totalPages;
                next.addEventListener('click', () => renderProgramas(page + 1));

                const pageLabel = document.createElement('span');
                pageLabel.className = 'mx-2 small text-muted';
                pageLabel.textContent = `Página ${page} de ${totalPages}`;

                controls.append(prev, pageLabel, next);
                pag.append(info, controls);
            }
        }

        renderProgramas(window.programasPage);

        // GUARDAR LOS DATOS Y CONFIGURAR FILTROS
        datosTablaCompleta = programas;

        // Inicializar contador
        actualizarContadorTabla(programas.length, programas.length);

        // Cargar opciones en los selects
        cargarOpcionesFiltros(programas);

        // Aplicar filtros si hay alguno activo (para persistencia)
        setTimeout(() => {
            aplicarFiltrosTabla();
        }, 100);

    } catch (err) {
        console.error("Error al obtener programas:", err);
        tbody.innerHTML =
            `<tr><td colspan="17" class="text-center small text-danger">Error al cargar datos: ${err.message || err}</td></tr>`;
        // Intentar actualizar las cards usando datos disponibles (tabla o memoria)
        setTimeout(() => { try { if (typeof cargarEstadisticasProgramasDashboard === 'function') cargarEstadisticasProgramasDashboard(); } catch (e) { console.warn('No se pudo cargar estadísticas tras error en cargarProgramas:', e); } }, 50);
    }
}


/* ------------------------------------------------------
   INICIALIZAR CUANDO LA TABLA EXISTE
------------------------------------------------------ */
function initWhenReady() {
    const existing = document.getElementById('datos');
    if (existing) {
        cargarProgramas();
        return;
    }

    const observer = new MutationObserver((mutations, obs) => {
        if (document.getElementById('datos')) {
            obs.disconnect();
            cargarProgramas();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', initWhenReady);

// Detectar cuando se navega a #programas para recargar datos
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#programas') {
        setTimeout(() => {
            cargarProgramas();
            // Re-attach floating button handler in case the DOM was re-rendered
            try { attachBtnFlotanteHandler(); } catch (e) { console.warn('No se pudo re-adjuntar btnFlotante:', e); }
        }, 100);
    }
});

// React to view:loaded emitted by main.js so we initialise reliably when loadView inserts the markup
document.addEventListener('view:loaded', (e) => {
    try {
        const path = (e && e.detail && e.detail.viewPath) || '';
        if (path.endsWith('programas.html')) {
            setTimeout(initWhenReady, 50);
        }
    } catch (err) { console.warn('view:loaded handler(programas) failed:', err); }
});

// Adjuntar comportamiento del botón flotante de agregar (abre modal de creación)
function attachBtnFlotanteHandler() {
    const attach = (btn) => {
        if (!btn) return;
        // Avoid attaching multiple times
        if (btn.__hasCrearHandler) return;
        btn.__hasCrearHandler = true;
        btn.addEventListener('click', (e) => {
            if (e && e.preventDefault) e.preventDefault();
            showCrearProgramaModal();
        });
        console.log('✅ Botón flotante de programas inicializado');
    };

    const existing = document.getElementById('btnFlotante');
    if (existing) { attach(existing); return; }

    // Si el botón se inyecta dinámicamente después, observar el DOM y anexar cuando aparezca
    const obs = new MutationObserver((mutations, observer) => {
        const found = document.getElementById('btnFlotante');
        if (found) {
            attach(found);
            observer.disconnect();
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    console.log('👀 Observando DOM para botón flotante de programas...');
}

// Llamar al adjuntador ahora y también cuando se cargue la página
document.addEventListener('DOMContentLoaded', attachBtnFlotanteHandler);

// React to view:loaded emitted by main.js for reliable initialization when loadView inserts the markup
document.addEventListener('view:loaded', (e) => {
    try {
        const path = (e && e.detail && e.detail.viewPath) || '';
        if (path.endsWith('programas.html')) {
            console.log('📄 Vista de programas cargada, inicializando botón flotante...');
            setTimeout(attachBtnFlotanteHandler, 100);
        }
    } catch (err) { console.warn('view:loaded handler(programas/btnFlotante) failed:', err); }
});

// Modal de creación de programa
function showCrearProgramaModal() {
    const contenido = `
        <div class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content shadow-lg">
                    <div class="modal-header header-image text-white">
                        <h5 class="modal-title">Agregar Programa</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="card border-0">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-6"><label class="form-label small">Código</label><input id="new_cod_programa" class="form-control" type="number" placeholder="Código (entero)" required></div>
                                    <div class="col-md-6"><label class="form-label small">Versión</label><input id="new_version" class="form-control" type="text" placeholder="v1" required></div>

                                    <div class="col-12"><label class="form-label small">Nombre</label><input id="new_nombre" class="form-control" type="text" placeholder="Nombre del programa" required></div>

                                    <div class="col-md-4"><label class="form-label small">Nivel</label><input id="new_nivel" class="form-control" type="text"></div>
                                    <div class="col-md-4"><label class="form-label small">Duración</label><input id="new_tiempo_dur" class="form-control" type="number"></div>
                                    <div class="col-md-4"><label class="form-label small">Unidad duración</label><input id="new_unidad_dur" class="form-control" type="text"></div>

                                    <div class="col-md-6"><label class="form-label small">Red de conocimiento</label>
                                        <select id="new_id_red" class="form-select">
                                            <option value="">Seleccionar red (opcional)</option>
                                        </select>
                                    </div>

                                    <div class="col-md-6"><label class="form-label small">Estado</label><input id="new_estado" class="form-control" type="text"></div>

                                    <div class="col-12"><label class="form-label small">URL PDF (opcional)</label><input id="new_url_pdf" class="form-control" type="text" placeholder="https://..."></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="btnCrearPrograma">Crear programa</button>
                    </div>
                </div>
            </div>
        </div>
        `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = contenido;
    const modalEl = wrapper.firstElementChild;
    document.body.appendChild(modalEl);

    const bsModal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', () => {
        bsModal.dispose();
        modalEl.remove();
    });
    bsModal.show();

    // Cargar redes disponibles en el select (intentar, puede requerir permisos)
    async function cargarRedesEnModal(modalEl) {
        const sel = modalEl.querySelector('#new_id_red');
        if (!sel) return;
        try {
            const redes = await programasService.getTodasRedes();
            if (Array.isArray(redes)) {
                redes.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.id_red;
                    opt.textContent = r.nombre;
                    sel.appendChild(opt);
                });
            }
        } catch (e) {
            console.warn('No se pudieron cargar las redes (permiso o token):', e.message || e);
        }
    }

    // Validación de campos antes de enviar
    function clearValidation() {
        const ids = ['new_cod_programa', 'new_version', 'new_nombre', 'new_url_pdf'];
        ids.forEach(id => {
            const el = modalEl.querySelector('#' + id);
            if (!el) return;
            el.classList.remove('is-invalid');
            const fb = el.parentElement.querySelector('.invalid-feedback');
            if (fb) fb.remove();
        });
    }


    // Mostrar error en campo específico
    function showFieldError(id, msg) {
        const el = modalEl.querySelector('#' + id);
        if (!el) return;
        el.classList.add('is-invalid');
        let fb = el.parentElement.querySelector('.invalid-feedback');
        if (!fb) {
            fb = document.createElement('div');
            fb.className = 'invalid-feedback d-block';
            el.parentElement.appendChild(fb);
        }
        fb.textContent = msg;
    }

    // Validar campos y retornar objeto de errores
    function validateFields() {
        clearValidation();
        const errors = {};
        const codEl = modalEl.querySelector('#new_cod_programa');
        const verEl = modalEl.querySelector('#new_version');
        const nomEl = modalEl.querySelector('#new_nombre');
        const urlEl = modalEl.querySelector('#new_url_pdf');

        const cod = codEl ? String(codEl.value).trim() : '';
        if (!cod) errors['new_cod_programa'] = 'Código requerido';
        else if (isNaN(Number(cod)) || Number(cod) <= 0) errors['new_cod_programa'] = 'Código debe ser un número entero positivo';

        const version = verEl ? String(verEl.value).trim() : '';
        if (!version) errors['new_version'] = 'Versión requerida';

        const nombre = nomEl ? String(nomEl.value).trim() : '';
        if (!nombre) errors['new_nombre'] = 'Nombre requerido';
        else if (nombre.length < 3) errors['new_nombre'] = 'Nombre debe tener al menos 3 caracteres';

        const url = urlEl ? String(urlEl.value).trim() : '';
        if (url) {
            try { new URL(url); } catch (_) { errors['new_url_pdf'] = 'URL inválida'; }
        }

        return errors;
    }

    // Handler crear
    const btn = modalEl.querySelector('#btnCrearPrograma');
    if (btn) {
        // cargar redes cuando modal esté listo
        cargarRedesEnModal(modalEl);

        // limpiar validación al escribir
        ['new_cod_programa', 'new_version', 'new_nombre', 'new_url_pdf'].forEach(id => {
            const el = modalEl.querySelector('#' + id);
            if (!el) return;
            el.addEventListener('input', () => {
                el.classList.remove('is-invalid');
                const fb = el.parentElement.querySelector('.invalid-feedback');
                if (fb) fb.remove();
            });
        });

        btn.addEventListener('click', async() => {
            btn.disabled = true;
            btn.textContent = 'Creando...';

            // Validar campos antes de enviar
            const errors = validateFields();
            if (Object.keys(errors).length > 0) {
                Object.entries(errors).forEach(([fid, msg]) => showFieldError(fid, msg));
                const first = Object.keys(errors)[0];
                const firstEl = modalEl.querySelector('#' + first);
                if (firstEl && firstEl.focus) firstEl.focus();
                btn.disabled = false;
                btn.textContent = 'Crear programa';
                return;
            }

            // Construir payload solo con campos de Programas_formacion
            const payload = {
                cod_programa: Number((modalEl.querySelector('#new_cod_programa') || {}).value) || null,
                version: (modalEl.querySelector('#new_version') || {}).value || null,
                nombre: (modalEl.querySelector('#new_nombre') || {}).value || null,
                nivel: (modalEl.querySelector('#new_nivel') || {}).value || null,
                id_red: (modalEl.querySelector('#new_id_red') || {}).value ? Number(modalEl.querySelector('#new_id_red').value) : null,
                tiempo_dur: (modalEl.querySelector('#new_tiempo_dur') || {}).value ? Number(modalEl.querySelector('#new_tiempo_dur').value) : null,
                unidad_dur: (modalEl.querySelector('#new_unidad_dur') || {}).value || null,
                estado: (modalEl.querySelector('#new_estado') || {}).value || null,
                url_pdf: (modalEl.querySelector('#new_url_pdf') || {}).value || null
            };

            try {
                await programasService.createPrograma(payload);
                console.log("✅ Programa creado exitosamente. Recargando tabla...");

                // Esperar un bit para que el backend procese
                await new Promise(resolve => setTimeout(resolve, 500));

                // Cerrar modal ANTES de recargar
                bsModal.hide();

                // Recargar tabla con más delay para asegurar que carga
                if (typeof cargarProgramas === 'function') {
                    // Esperar a que se cierren modales animaciones y luego recargar
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await cargarProgramas();
                    console.log("✅ Tabla recargada después de crear programa");
                }

                alert('Programa creado correctamente.');
            } catch (err) {
                console.error('Error creando programa:', err);
                // si el backend devuelve detalle por campo, mostrarlo; sino mostrar mensaje general
                try {
                    const msg = err.message || String(err);
                    alert('Error al crear programa: ' + msg);
                } catch (ee) {
                    alert('Error al crear programa');
                }
            } finally {
                btn.disabled = false;
                btn.textContent = 'Crear programa';
            }
        });
    }
}




/* ------------------------------------------------------
   MODAL DE SOLO LECTURA - PROGRAMAS
------------------------------------------------------ */
function showRegistroModalView(programa, registro, red) {

    const contenido = `
        <div class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content shadow-lg">

                    <div class="modal-header header-image text-white">
                        <h5 class="modal-title">
                            Detalle Programa: ${programa.nombre}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="modal-body">

                        <!-- IDENTIFICACIÓN DEL PROGRAMA (Lectura) -->
                        <h5 class="fw-bold text-secondary mb-3">1. Identificación del Programa</h5>
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Código</label>
                                <input type="text" class="form-control" value="${programa.cod_programa}" disabled>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Versión</label>
                                <input type="text" class="form-control" value="${programa.version}" disabled>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Nombre</label>
                                <input type="text" class="form-control" value="${programa.nombre}" disabled>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Nivel</label>
                                <input type="text" class="form-control" value="${programa.nivel || ''}" disabled>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Duración</label>
                                <input type="number" class="form-control" value="${programa.tiempo_dur || 0}" disabled>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Unidad de Duración</label>
                                <input type="text" class="form-control" value="${programa.unidad_dur || ''}" disabled>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Estado</label>
                                <input type="text" class="form-control" value="${programa.estado || ''}" disabled>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Red de Conocimiento</label>
                                <input type="text" class="form-control" value="${red?.nombre || 'Sin registro'}" disabled>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-12">
                                <label class="form-label small fw-bold">URL PDF</label>
                                <input type="text" class="form-control" value="${programa.url_pdf || ''}" disabled>
                            </div>
                        </div>

                        <hr>

                        <!-- REGISTRO CALIFICADO (Solo lectura) -->
                        <h5 class="fw-bold text-secondary mb-3">2. Registro Calificado</h5>
                        
                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Modalidad</label>
                                <input type="text" class="form-control" value="${programa.modalidad || ''}" disabled>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Tipo de Trámite</label>
                                <input type="text" class="form-control" value="${programa.tipo_tramite || ''}" disabled>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Número de Resolución</label>
                                <input type="text" class="form-control" value="${programa.numero_resolucion || ''}" disabled>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Vigencia</label>
                                <input type="text" class="form-control" value="${programa.vigencia || ''}" disabled>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Clasificación</label>
                                <input type="text" class="form-control" value="${programa.clasificacion || ''}" disabled>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Estado Catálogo</label>
                                <input type="text" class="form-control" value="${programa.estado_catalogo || ''}" disabled>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Fecha Resolución</label>
                                <input type="date" class="form-control" value="${programa.fecha_resolucion ? programa.fecha_resolucion.split('T')[0] : ''}" disabled>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Fecha Vencimiento</label>
                                <input type="date" class="form-control" value="${programa.fecha_vencimiento ? programa.fecha_vencimiento.split('T')[0] : ''}" disabled>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-12">
                                <label class="form-label small fw-bold">Fecha Radicado</label>
                                <input type="date" class="form-control" value="${programa.fecha_radicado ? programa.fecha_radicado.split('T')[0] : ''}" disabled>
                            </div>
                        </div>

                        <hr>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>

                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = contenido;
    const modalEl = wrapper.firstElementChild;
    document.body.appendChild(modalEl);

    const bsModal = new bootstrap.Modal(modalEl);

    modalEl.addEventListener('hidden.bs.modal', () => {
        bsModal.dispose();
        modalEl.remove();
    });

    bsModal.show();

    // Handler para guardar cambios (envía PATCH al backend)
    try {
        const btnGuardar = modalEl.querySelector('#btnGuardarPrograma');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', async() => {
                btnGuardar.disabled = true;
                const originalText = btnGuardar.textContent;
                btnGuardar.textContent = 'Guardando...';

                // Construir payload desde inputs con data-field
                // Separar payload de programa y de registro calificado
                const programaFields = ['nivel', 'tiempo_dur', 'unidad_dur', 'estado', 'url_pdf'];
                const registroFields = ['modalidad', 'tipo_tramite', 'numero_resolucion', 'vigencia', 'clasificacion', 'estado_catalogo', 'fecha_resolucion', 'fecha_vencimiento', 'fecha_radicado'];

                const programaPayload = {};
                programaFields.forEach(f => {
                    const el = modalEl.querySelector(`[data-field="${f}"]`);
                    if (!el) return;
                    if (el.type === 'number') {
                        const v = el.value;
                        programaPayload[f] = v === '' ? null : Number(v);
                    } else {
                        programaPayload[f] = el.value === undefined ? null : el.value;
                    }
                });

                const registroPayload = {};
                registroFields.forEach(f => {
                    const el = modalEl.querySelector(`[data-field="${f}"]`);
                    if (!el) return;
                    if (el.type === 'number') {
                        const v = el.value;
                        registroPayload[f] = v === '' ? null : Number(v);
                    } else {
                        registroPayload[f] = el.value === undefined ? null : el.value;
                    }
                });

                try {
                    // 1) Actualizar programa (si hay campos)
                    const hasProgramaChanges = Object.keys(programaPayload).some(k => programaPayload[k] !== null && programaPayload[k] !== undefined);
                    if (hasProgramaChanges) {
                        await programasService.updatePrograma(programa.cod_programa, programa.version, programaPayload);
                    }

                    // 2) Actualizar / Crear registro calificado si se ingresaron valores
                    const hasRegistroValues = Object.keys(registroPayload).some(k => registroPayload[k] !== null && registroPayload[k] !== undefined && registroPayload[k] !== '');
                    if (hasRegistroValues) {
                        // Si ya existe registro (param 'registro' tiene keys), intentar update
                        if (registro && Object.keys(registro).length > 0) {
                            await registroService.updateRegistro(programa.cod_programa, programa.version, registroPayload);
                        } else {
                            // Crear: necesita campos obligatorios, preguntar confirmación
                            const confirmCreate = confirm('No existe un Registro Calificado para esta versión. ¿Desea crearlo con los valores ingresados?');
                            if (confirmCreate) {
                                const createPayload = Object.assign({ cod_programa: programa.cod_programa, version: programa.version }, registroPayload);
                                await registroService.createRegistro(createPayload);
                            }
                        }

                        // Verificar que el registro esté efectivamente disponible tras guardar
                        try {
                            // Esperar un momento por si el backend necesita propagar
                            await new Promise(resolve => setTimeout(resolve, 500));
                            const registroCheck = await registroService.getRegistro(programa.cod_programa, programa.version);
                            console.log('Registro verificado tras guardar:', registroCheck);
                        } catch (errRegistro) {
                            console.warn('Registro aparentemente no disponible tras guardar:', errRegistro);
                            alert('Se guardó el Registro Calificado, pero al reconsultar el servidor no aparece. Puede ser por demora o por permisos; intenta recargar la página o verifica el servidor.');
                        }
                    }

                    // Refrescar tabla
                    if (typeof cargarProgramas === 'function') {
                        try { cargarProgramas(); } catch (e) { console.warn('No se pudo recargar tabla:', e); }
                    }

                    bsModal.hide();
                    alert('Cambios guardados correctamente.');
                } catch (err) {
                    console.error('Error guardando programa/registro:', err);
                    alert('Error al guardar: ' + (err.message || err));
                } finally {
                    btnGuardar.disabled = false;
                    btnGuardar.textContent = originalText;
                }
            });
        }
    } catch (e) {
        console.warn('No se pudo anexar handler de guardar:', e);
    }
}

/* ------------------------------------------------------
   MODAL DE DETALLES (EDITABLE) - PROGRAMAS
------------------------------------------------------ */
function showRegistroModal(programa, registro, red) {

    const contenido = `
        <div class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content shadow-lg">

                    <div class="modal-header header-image text-white">
                        <h5 class="modal-title">
                            Editar Programa: ${programa.nombre}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="modal-body">

                        <!-- IDENTIFICACIÓN DEL PROGRAMA (Lectura) -->
                        <h5 class="fw-bold text-secondary mb-3">1. Identificación del Programa</h5>
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Código</label>
                                <input type="text" class="form-control" value="${programa.cod_programa}" disabled>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Versión</label>
                                <input type="text" class="form-control" value="${programa.version}" disabled>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Nombre</label>
                                <input type="text" class="form-control" value="${programa.nombre}" disabled>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Nivel</label>
                                <input data-field="nivel" type="text" class="form-control" value="${programa.nivel || ''}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Duración</label>
                                <input data-field="tiempo_dur" type="number" class="form-control" value="${programa.tiempo_dur || 0}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Unidad de Duración</label>
                                <input data-field="unidad_dur" type="text" class="form-control" value="${programa.unidad_dur || ''}">
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Estado</label>
                                <input data-field="estado" type="text" class="form-control" value="${programa.estado || ''}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Red de Conocimiento</label>
                                <input data-field="red_nombre" type="text" class="form-control" value="${red?.nombre || 'Sin registro'}" disabled>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-12">
                                <label class="form-label small fw-bold">URL PDF</label>
                                <input data-field="url_pdf" type="text" class="form-control" value="${programa.url_pdf || ''}" placeholder="Ingrese URL del PDF">
                            </div>
                        </div>

                        <hr>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="btnGuardarPrograma">Guardar cambios</button>
                    </div>

                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = contenido;
    const modalEl = wrapper.firstElementChild;
    document.body.appendChild(modalEl);

    const bsModal = new bootstrap.Modal(modalEl);

    modalEl.addEventListener('hidden.bs.modal', () => {
        bsModal.dispose();
        modalEl.remove();
    });

    bsModal.show();

    // Handler para guardar cambios desde el modal de EDICIÓN
    try {
        const btnGuardar = modalEl.querySelector('#btnGuardarPrograma');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', async() => {
                btnGuardar.disabled = true;
                const originalText = btnGuardar.textContent;
                btnGuardar.textContent = 'Guardando...';

                const fields = [
                    'nivel', 'tiempo_dur', 'unidad_dur', 'estado', 'url_pdf', 'modalidad', 'tipo_tramite',
                    'numero_resolucion', 'vigencia', 'clasificacion', 'estado_catalogo',
                    'fecha_resolucion', 'fecha_vencimiento', 'fecha_radicado'
                ];

                const payload = {};
                fields.forEach(f => {
                    const el = modalEl.querySelector(`[data-field="${f}"]`);
                    if (!el) return;
                    if (el.type === 'number') {
                        const v = el.value;
                        payload[f] = v === '' ? null : Number(v);
                    } else {
                        payload[f] = el.value === undefined ? null : el.value;
                    }
                });

                try {
                    await programasService.updatePrograma(programa.cod_programa, programa.version, payload);
                    if (typeof cargarProgramas === 'function') {
                        try { cargarProgramas(); } catch (e) { console.warn('No se pudo recargar tabla:', e); }
                    }
                    bsModal.hide();
                    alert('Programa actualizado correctamente.');
                } catch (err) {
                    console.error('Error guardando programa:', err);
                    alert('Error al guardar: ' + (err.message || err));
                } finally {
                    btnGuardar.disabled = false;
                    btnGuardar.textContent = originalText;
                }
            });
        }
    } catch (e) {
        console.warn('No se pudo anexar handler de guardar (edición):', e);
    }
}

/* ================================================
   FILTROS PARA LA TABLA (EN SIDEBAR)
   ================================================ */

// Variable global para guardar los datos
let datosTablaCompleta = [];

// Función principal para aplicar filtros
function aplicarFiltrosTabla() {
    // Obtener valores de los filtros (comprobando existencia de elementos)
    const getVal = (id, opts = {}) => {
        const el = document.getElementById(id);
        if (!el) return opts.default || '';
        let v = el.value;
        if (v === undefined || v === null) return opts.default || '';
        v = String(v);
        return opts.trim === false ? v : v.trim();
    };

    const filtroCodigo = (getVal('filtroCodigoTabla') || '').toLowerCase();
    const filtroNombre = (getVal('filtroNombreTabla') || '').toLowerCase();
    const filtroNivel = getVal('filtroNivelTabla') || '';
    const filtroEstado = (getVal('filtroEstadoTabla') || '').toLowerCase();
    const duracionMin = (function() { const v = getVal('filtroDuracionMinTabla'); return v === '' ? 0 : (parseInt(v) || 0); })();
    const duracionMax = (function() { const v = getVal('filtroDuracionMaxTabla'); return v === '' ? Infinity : (parseInt(v) || Infinity); })();

    // Contar filtros activos
    let filtrosActivos = 0;
    if (filtroCodigo) filtrosActivos++;
    if (filtroNombre) filtrosActivos++;
    if (filtroNivel) filtrosActivos++;
    if (filtroEstado) filtrosActivos++;
    if (duracionMin > 0 || duracionMax < Infinity) filtrosActivos++;

    // Actualizar badge
    const badge = document.getElementById('badgeFiltrosTabla');
    if (badge) {
        badge.textContent = `${filtrosActivos} filtro${filtrosActivos !== 1 ? 's' : ''}`;
        badge.className = filtrosActivos > 0 ?
            'badge bg-primary text-white mt-1' :
            'badge bg-light text-dark border mt-1';
    }

    // Obtener todas las filas de la tabla
    const tbody = document.getElementById('datos');
    if (!tbody) return;

    const filas = tbody.querySelectorAll('tr');
    let filasVisibles = 0;
    const totalFilas = filas.length;

    // Si no hay filas, salir
    if (totalFilas === 0) {
        actualizarContadorTabla(0, 0);
        return;
    }

    // Recorrer cada fila y aplicar filtros
    filas.forEach(fila => {
        // Verificar que es una fila de datos (no mensaje de carga/error)
        if (fila.cells && fila.cells.length >= 6) {
            const celdas = fila.cells;

            // Obtener valores de las celdas según tu estructura
            const textoCodigo = (celdas[0] ? celdas[0].textContent : '').toLowerCase().trim();
            const textoNombre = (celdas[1] ? celdas[1].textContent : '').toLowerCase().trim();
            const textoNivel = (celdas[2] ? celdas[2].textContent : '').trim();
            const textoDuracion = parseInt(celdas[3] ? celdas[3].textContent : '') || 0;
            const textoEstado = (celdas[5] ? celdas[5].textContent : '').toLowerCase().trim();

            let pasaFiltro = true;

            // Aplicar cada filtro
            if (filtroCodigo && !textoCodigo.includes(filtroCodigo)) {
                pasaFiltro = false;
            }
            if (filtroNombre && !textoNombre.includes(filtroNombre)) {
                pasaFiltro = false;
            }
            if (filtroNivel && !textoNivel.includes(filtroNivel)) {
                pasaFiltro = false;
            }
            if (filtroEstado && !textoEstado.includes(filtroEstado)) {
                pasaFiltro = false;
            }
            if (textoDuracion < duracionMin || textoDuracion > duracionMax) {
                pasaFiltro = false;
            }

            // Mostrar u ocultar la fila
            if (pasaFiltro) {
                fila.style.display = '';
                filasVisibles++;
            } else {
                fila.style.display = 'none';
            }
        } else {
            // Si es una fila de mensaje (cargando, error, vacío), siempre mostrarla
            fila.style.display = '';
            filasVisibles++;
        }
    });

    // Actualizar contador
    actualizarContadorTabla(filasVisibles, totalFilas);
}

// Función para limpiar todos los filtros
function limpiarFiltrosTabla() {
    document.getElementById('filtroCodigoTabla').value = '';
    document.getElementById('filtroNombreTabla').value = '';
    document.getElementById('filtroNivelTabla').value = '';
    document.getElementById('filtroEstadoTabla').value = '';
    document.getElementById('filtroDuracionMinTabla').value = '';
    document.getElementById('filtroDuracionMaxTabla').value = '';

    aplicarFiltrosTabla(); // Esto mostrará todas las filas
}

// Función para actualizar el contador
function actualizarContadorTabla(visibles, total) {
    const contador = document.getElementById('contadorTabla');
    if (contador) {
        contador.innerHTML = `Mostrando <span class="fw-bold">${visibles}</span> de <span class="fw-bold">${total}</span>`;

        // Cambiar color si no hay resultados
        if (visibles === 0 && total > 0) {
            contador.className = 'text-danger';
        } else if (visibles === total) {
            contador.className = 'text-success';
        } else {
            contador.className = 'text-muted';
        }
    }
}

// Función para cargar opciones en los selects (desde los datos)
function cargarOpcionesFiltros(datos) {
    if (!datos || !Array.isArray(datos) || datos.length === 0) return;

    // Extraer niveles únicos
    const nivelesSet = new Set();
    const estadosSet = new Set();

    datos.forEach(item => {
        if (item.nivel && item.nivel.trim() !== '') {
            nivelesSet.add(item.nivel.trim());
        }
        if (item.estado && item.estado.trim() !== '') {
            estadosSet.add(item.estado.trim().toLowerCase());
        }
    });

    // Cargar niveles en el select
    const selectNivel = document.getElementById('filtroNivelTabla');
    if (selectNivel) {
        // Guardar opciones existentes (la primera opción "Todos")
        const opcionesExistentes = Array.from(selectNivel.options).map(opt => opt.value);

        // Agregar nuevas opciones únicas
        Array.from(nivelesSet).sort().forEach(nivel => {
            if (!opcionesExistentes.includes(nivel)) {
                const option = document.createElement('option');
                option.value = nivel;
                option.textContent = nivel;
                selectNivel.appendChild(option);
            }
        });
    }

    // Cargar estados en el select
    const selectEstado = document.getElementById('filtroEstadoTabla');
    if (selectEstado) {
        // Guardar opciones existentes
        const opcionesExistentes = Array.from(selectEstado.options).map(opt => opt.value);

        // Agregar nuevas opciones únicas
        Array.from(estadosSet).sort().forEach(estado => {
            const estadoFormateado = estado.toLowerCase();
            if (!opcionesExistentes.includes(estadoFormateado)) {
                const option = document.createElement('option');
                option.value = estadoFormateado;
                option.textContent = estado.charAt(0).toUpperCase() + estado.slice(1);
                selectEstado.appendChild(option);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Asegurar que el accordion de filtros se inicialice correctamente
    const collapseCompetencias = document.getElementById('collapseCompetencias');
    if (collapseCompetencias) {
        // Opcional: Guardar/restaurar estado abierto/cerrado
        const estadoGuardado = localStorage.getItem('filtrosCompetenciasAbierto');
        if (estadoGuardado === 'true') {
            new bootstrap.Collapse(collapseCompetencias, { show: true });
        }

        // Guardar estado cuando se abre/cierra
        collapseCompetencias.addEventListener('show.bs.collapse', function() {
            localStorage.setItem('filtrosCompetenciasAbierto', 'true');
        });

        collapseCompetencias.addEventListener('hide.bs.collapse', function() {
            localStorage.setItem('filtrosCompetenciasAbierto', 'false');
        });
    }

    // Inicializar filtros si ya hay datos cargados
    setTimeout(() => {
        const tbody = document.getElementById('datos');
        if (tbody && tbody.querySelectorAll('tr').length > 0) {
            actualizarContadorTabla(
                tbody.querySelectorAll('tr').length,
                tbody.querySelectorAll('tr').length
            );
            aplicarFiltrosTabla();
        }
    }, 500);
});

// Hacer funciones accesibles desde atributos inline (ej. oninput="aplicarFiltrosTabla()")
try {
    if (typeof window !== 'undefined') {
        window.aplicarFiltrosTabla = aplicarFiltrosTabla;
        window.limpiarFiltrosTabla = limpiarFiltrosTabla;
        window.cargarOpcionesFiltros = cargarOpcionesFiltros;
        window.actualizarContadorTabla = actualizarContadorTabla;
    }
} catch (e) {
    console.warn('No se pudo exponer funciones de filtros al contexto global:', e);
}
/* ================================================
   CARGAR ESTADÍSTICAS PARA PROGRAMA DASHBOARD
   ================================================ */

async function cargarEstadisticasProgramasDashboard() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.log('No hay token de autenticación');
        mostrarErrorEstadisticasProgramas('No autenticado');
        return;
    }

    try {
        // Mostrar estado de carga
        mostrarCargandoEstadisticasProgramas();

        // Intentar obtener programas usando el servicio central (usa apiClient.request)
        console.log('Iniciando carga de estadísticas de programas (servicio)');
        const timeoutMs = 8000;

        // Promise timeout helper
        const withTimeout = (p, ms) => new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('Timeout cargando programas')), ms);
            p.then(r => { clearTimeout(t); resolve(r); }).catch(e => { clearTimeout(t); reject(e); });
        });

        // programasService.getProgramas devuelve array o objeto con {programas}
        const data = await withTimeout(programasService.getProgramas(500), timeoutMs);
        console.log('Datos recibidos para estadísticas de programas:', data);
        const programas = data.programas || data;

        if (!programas || !Array.isArray(programas) || programas.length === 0) {
            mostrarErrorEstadisticasProgramas('No hay datos disponibles');
            return;
        }

        // Calcular estadísticas de programas
        calcularEstadisticasProgramasDashboard(programas);

    } catch (error) {
        console.error('Error cargando estadísticas de programas:', error);

        // Manejo explícito de errores de autorización para mostrar mensaje claro en la tarjeta
        if (error && (error.status === 401 || error.status === 403)) {
            const msg = error.status === 401 ? 'No autenticado. Por favor inicie sesión.' : 'Sin permisos para ver datos.';
            mostrarErrorEstadisticasProgramas(msg);
            // Si no está autenticado, limpiar token para forzar login en próximas acciones
            if (error.status === 401) {
                try { localStorage.removeItem('access_token'); } catch (e) { /* no-op */ }
            }
            return;
        }

        // Si hay datos cargados en la tabla, usar esos datos como fallback
        if (Array.isArray(datosTablaCompleta) && datosTablaCompleta.length > 0) {
            console.warn('Falling back to local table data for dashboard statistics');
            calcularEstadisticasProgramasDashboard(datosTablaCompleta);
            // Mostrar un detalle indicando que proviene de datos locales
            actualizarDetallePrograma('detalleTotalProgramas', 'Mostrando datos locales (sin conexión al backend)');
        } else {
            mostrarErrorEstadisticasProgramas('Error cargando datos');
        }
    }
}

function calcularEstadisticasProgramasDashboard(programas) {
    const total = programas.length;

    // 1. Analizar estados
    const activos = programas.filter(p =>
        p.estado && (
            p.estado.toLowerCase().includes('activo') ||
            p.estado === '1' ||
            p.estado.toLowerCase() === 'activo'
        )
    ).length;

    const inactivos = programas.filter(p =>
        p.estado && (
            p.estado.toLowerCase().includes('inactivo') ||
            p.estado === '0' ||
            p.estado.toLowerCase() === 'inactivo'
        )
    ).length;

    const pendientes = programas.filter(p =>
        p.estado && p.estado.toLowerCase().includes('pendiente')
    ).length;

    const porcentajeActivos = total > 0 ? Math.round((activos / total) * 100) : 0;

    // 2. Análisis de documentación PDF
    const conPDF = programas.filter(p =>
        p.url_pdf &&
        p.url_pdf.trim() !== '' &&
        p.url_pdf !== 'string' &&
        !p.url_pdf.toLowerCase().includes('sin')
    ).length;

    const sinPDF = total - conPDF;
    const porcentajeConPDF = total > 0 ? Math.round((conPDF / total) * 100) : 0;

    // 3. Análisis por niveles
    const niveles = {};
    programas.forEach(p => {
        if (p.nivel && p.nivel.trim() !== '' && p.nivel !== 'string') {
            const nivel = p.nivel.trim();
            niveles[nivel] = (niveles[nivel] || 0) + 1;
        }
    });

    // Encontrar nivel principal
    let nivelPrincipal = 'Sin nivel';
    let cantidadPrincipal = 0;
    let totalConNivel = 0;

    Object.entries(niveles).forEach(([nivel, cantidad]) => {
        totalConNivel += cantidad;
        if (cantidad > cantidadPrincipal) {
            nivelPrincipal = nivel;
            cantidadPrincipal = cantidad;
        }
    });

    const sinNivel = total - totalConNivel;

    // 4. Análisis por duración
    const programasCortos = programas.filter(p =>
        p.tiempo_dur && parseInt(p.tiempo_dur) <= 6
    ).length;

    const programasLargos = programas.filter(p =>
        p.tiempo_dur && parseInt(p.tiempo_dur) > 6
    ).length;

    const sinDuracion = total - (programasCortos + programasLargos);

    // 5. Análisis por unidad de duración
    const unidades = {};
    programas.forEach(p => {
        if (p.unidad_dur && p.unidad_dur.trim() !== '' && p.unidad_dur !== 'string') {
            const unidad = p.unidad_dur.trim().toLowerCase();
            unidades[unidad] = (unidades[unidad] || 0) + 1;
        }
    });

    // Actualizar tarjetas
    actualizarTarjetaTotalProgramas(total, activos, inactivos);
    actualizarTarjetaProgramasActivos(activos, porcentajeActivos);
    actualizarTarjetaDocumentacionProgramas(conPDF, porcentajeConPDF, sinPDF);
    actualizarTarjetaNivelPrincipal(nivelPrincipal, cantidadPrincipal, niveles, sinNivel);

    // Guardar estadísticas para uso futuro
    window.estadisticasProgramasDashboard = {
        total,
        activos,
        inactivos,
        pendientes,
        conPDF,
        sinPDF,
        porcentajeActivos,
        porcentajeConPDF,
        niveles,
        nivelPrincipal,
        cantidadPrincipal,
        sinNivel,
        programasCortos,
        programasLargos,
        sinDuracion,
        unidades
    };

    // Opcional: Mostrar en consola para debugging
    console.log('Estadísticas Programas Dashboard:', window.estadisticasProgramasDashboard);
}

// Funciones para actualizar cada tarjeta
function actualizarTarjetaTotalProgramas(total, activos, inactivos) {
    actualizarTarjetaPrograma('totalProgramasDashboard', total);
    const textoDetalle = `${activos} activos • ${inactivos} inactivos`;
    actualizarDetallePrograma('detalleTotalProgramas', textoDetalle);
}

function actualizarTarjetaProgramasActivos(activos, porcentaje) {
    actualizarTarjetaPrograma('programasActivosDashboard', activos);
    const textoPorcentaje = `${porcentaje}% del total`;
    actualizarDetallePrograma('porcentajeActivosProgramas', textoPorcentaje);

    // Cambiar color según porcentaje
    const elemento = document.getElementById('porcentajeActivosProgramas');
    if (elemento) {
        if (porcentaje >= 70) elemento.className = 'text-success';
        else if (porcentaje >= 40) elemento.className = 'text-warning';
        else elemento.className = 'text-danger';
    }
}

function actualizarTarjetaDocumentacionProgramas(conPDF, porcentaje, sinPDF) {
    actualizarTarjetaPrograma('programasConPDF', conPDF);
    const textoDetalle = `${sinPDF} sin PDF (${100 - porcentaje}%)`;
    actualizarDetallePrograma('detalleDocumentacionProgramas', textoDetalle);

    // Cambiar color según porcentaje
    const elemento = document.getElementById('detalleDocumentacionProgramas');
    if (elemento) {
        if (porcentaje >= 80) elemento.className = 'text-success';
        else if (porcentaje >= 50) elemento.className = 'text-warning';
        else elemento.className = 'text-danger';
    }
}

function actualizarTarjetaNivelPrincipal(nivelPrincipal, cantidad, niveles, sinNivel) {
    // Acortar nombre si es muy largo
    let tituloMostrar = nivelPrincipal;
    if (nivelPrincipal.length > 15) {
        tituloMostrar = nivelPrincipal.substring(0, 12) + '...';
    }

    // Actualizar título
    const tituloElement = document.getElementById('tituloNivelPrincipal');
    if (tituloElement) {
        tituloElement.textContent = tituloMostrar;
        tituloElement.title = nivelPrincipal; // Tooltip completo
    }

    // Actualizar valor
    actualizarTarjetaPrograma('cantidadNivelPrincipal', cantidad);

    // Mostrar un texto resumido en la tarjeta (evitar volcar listado largo de niveles)
    // Por defecto mostramos 'Ver todos'. Si no hay niveles pero existen programas sin nivel,
    // mostramos cuántos están sin nivel definido.
    let textoDetalle = 'Ver todos';
    if (Object.keys(niveles).length === 0 && sinNivel > 0) {
        textoDetalle = `${sinNivel} sin nivel definido`;
    }

    actualizarDetallePrograma('detalleNivelesProgramas', textoDetalle);
}

// Funciones auxiliares
function actualizarTarjetaPrograma(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        const valorActual = parseInt(elemento.textContent) || 0;
        if (valor !== valorActual) {
            animateCountPrograma(elemento, valorActual, valor, 800);
        } else {
            elemento.textContent = valor;
        }
    }
}

function actualizarDetallePrograma(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = texto;
        elemento.title = texto.length > 50 ? texto : ''; // Tooltip solo si es largo
    }
}

function mostrarCargandoEstadisticasProgramas() {
    const ids = ['totalProgramasDashboard', 'programasActivosDashboard', 'programasConPDF', 'cantidadNivelPrincipal'];
    ids.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = '...';
    });

    const detalles = ['detalleTotalProgramas', 'porcentajeActivosProgramas', 'detalleDocumentacionProgramas', 'detalleNivelesProgramas'];
    detalles.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = 'Cargando...';
    });
}

function mostrarErrorEstadisticasProgramas(mensaje) {
    const ids = ['totalProgramasDashboard', 'programasActivosDashboard', 'programasConPDF', 'cantidadNivelPrincipal'];
    ids.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = '0';
    });

    const detalles = ['detalleTotalProgramas', 'porcentajeActivosProgramas', 'detalleDocumentacionProgramas', 'detalleNivelesProgramas'];
    detalles.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = mensaje;
    });
}

// Animación específica para programas
function animateCountPrograma(element, start, end, duration) {
    if (start === end) {
        element.textContent = end;
        return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = current;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Integración con cargarProgramas existente
function integrarEstadisticasConProgramas() {
    if (typeof cargarProgramas === 'function') {
        const originalCargarProgramas = cargarProgramas;
        cargarProgramas = async function() {
            await originalCargarProgramas.apply(this, arguments);

            // Esperar a que se cargue la tabla y luego cargar estadísticas
            setTimeout(() => {
                if (document.getElementById('totalProgramasDashboard')) {
                    cargarEstadisticasProgramasDashboard();
                }
            }, 300);
        };
    }
}

// Inicialización cuando cargue la página
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si estamos en la página de programas
    const esPaginaProgramas =
        window.location.hash === '#programas' ||
        document.getElementById('datos') !== null ||
        Array.from(document.querySelectorAll('h5')).some(h => h.textContent && h.textContent.includes('Programas'));

    if (esPaginaProgramas) {
        // Integrar con función existente
        integrarEstadisticasConProgramas();

        // Cargar estadísticas después de un tiempo
        setTimeout(() => {
            if (document.getElementById('totalProgramasDashboard')) {
                cargarEstadisticasProgramasDashboard();
            }
        }, 1000);
    }
});

// Botón para recargar estadísticas (opcional)
document.addEventListener('click', function(e) {
    if (e.target && (e.target.matches('[data-reload-programas]') ||
            e.target.closest('[data-reload-programas]'))) {
        e.preventDefault();
        cargarEstadisticasProgramasDashboard();

        // Feedback visual
        const btn = e.target.closest('button');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-arrow-clockwise animate-spin"></i>';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 1500);
        }
    }
});

// Exportar función para uso externo
window.cargarEstadisticasProgramasDashboard = cargarEstadisticasProgramasDashboard;