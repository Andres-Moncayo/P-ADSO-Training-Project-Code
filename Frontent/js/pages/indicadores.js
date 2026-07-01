import { indicadoresService } from '../api/indicadores.service.js';



// CARGAR Y MOSTRAR INDICADORES
async function cargarIndicadores() {
    const token = localStorage.getItem('access_token'); // Obtener el token del localStorage (misma clave que login)
    if (!token) {
        window.location.href = 'login.html'; // Redirigir al login si no hay token
        return;
    }

    const tbody = document.getElementById('tablaIndicadores'); // Obtener el cuerpo de la tabla donde se mostrarán los indicadores
    if (!tbody) {
        return;
    }

    tbody.innerHTML = '<tr><td colspan="17" class="text-center small text-muted">Cargando datos...</td></tr>';

    try {
        // Usar el servicio que hace el request (usa apiClient internamente)
        const data = await indicadoresService.getIndicadores();
        console.log('DEBUG: indicadores raw data ->', data);

        const indicadores = data.indicadores || data.results || data;
        console.log('DEBUG: indicadores normalized ->', indicadores && indicadores.length ? `array length ${indicadores.length}` : indicadores);

        if (!indicadores || indicadores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="17" class="text-center small text-muted">No hay indicadores disponibles.</td></tr>';
            return;
        }

        tbody.innerHTML = ''; // Limpiar el contenido del tbody antes de agregar nuevos datos

        // Wrappers para compatibilidad con los IDs/handlers existentes en indicadores.html
        function _applyPoblacionFilters() {
            // Obtener elementos una sola vez
            const filtroCodigoElem = document.getElementById('filtroCodigoPoblacion');
            const filtroNombreElem = document.getElementById('filtroNombrePoblacion');
            const filtroTotalMinElem = document.getElementById('filtroTotalMin');
            const filtroTotalMaxElem = document.getElementById('filtroTotalMax');
            const filtroDesplazamientoElem = document.getElementById('filtroDesplazamiento');
            const filtroEtnicaElem = document.getElementById('filtroEtnica');
            const filtroDiscapacidadElem = document.getElementById('filtroDiscapacidad');

            // Asignar valores con verificación
            const filtroCodigo = (filtroCodigoElem && filtroCodigoElem.value || '').toLowerCase().trim();
            const filtroNombre = (filtroNombreElem && filtroNombreElem.value || '').toLowerCase().trim();
            const filtroTotalMin = (filtroTotalMinElem && filtroTotalMinElem.value) ? parseInt(filtroTotalMinElem.value) || 0 : 0;
            const filtroTotalMax = (filtroTotalMaxElem && filtroTotalMaxElem.value) ? parseInt(filtroTotalMaxElem.value) || Infinity : Infinity;
            const filtroDesplazamiento = (filtroDesplazamientoElem && filtroDesplazamientoElem.value) || '';
            const filtroEtnica = (filtroEtnicaElem && filtroEtnicaElem.value) || '';
            const filtroDiscapacidad = (filtroDiscapacidadElem && filtroDiscapacidadElem.value) || '';

            // Badge/contador IDs used in HTML
            const badge = document.getElementById('badgeFiltrosPoblacion');
            const contador = document.getElementById('contadorPoblacion');

            // Count active filters
            let filtrosActivos = 0;
            if (filtroCodigo) filtrosActivos++;
            if (filtroNombre) filtrosActivos++;
            if (filtroTotalMin > 0 || filtroTotalMax < Infinity) filtrosActivos++;
            if (filtroDesplazamiento) filtrosActivos++;
            if (filtroEtnica) filtrosActivos++;
            if (filtroDiscapacidad) filtrosActivos++;

            if (badge) {
                badge.textContent = `${filtrosActivos} filtro${filtrosActivos !== 1 ? 's' : ''}`;
                badge.className = filtrosActivos > 0 ? 'badge bg-primary text-white mt-1' : 'badge bg-light text-dark border mt-1';
            }

            const tbody = document.getElementById('tablaIndicadores');
            if (!tbody) return;
            const filas = Array.from(tbody.querySelectorAll('tr'));
            let visibles = 0;

            filas.forEach(fila => {
                if (fila.cells && fila.cells.length >= 7) {
                    const celdas = fila.cells;
                    // Para valores de texto
                    const textoCodigo = (celdas[0] && celdas[0].textContent ? celdas[0].textContent : '').toLowerCase().trim();
                    const textoNombre = (celdas[1] && celdas[1].textContent ? celdas[1].textContent : '').toLowerCase().trim();

                    // Para valores numéricos
                    const textoTotal = celdas[2] && celdas[2].textContent ? parseInt(celdas[2].textContent) || 0 : 0;
                    const textoDespl = celdas[3] && celdas[3].textContent ? parseInt(celdas[3].textContent) || 0 : 0;
                    const textoEtn = celdas[4] && celdas[4].textContent ? parseInt(celdas[4].textContent) || 0 : 0;
                    const textoDis = celdas[5] && celdas[5].textContent ? parseInt(celdas[5].textContent) || 0 : 0;
                    let pasa = true;
                    if (filtroCodigo && !textoCodigo.includes(filtroCodigo)) pasa = false;
                    if (filtroNombre && !textoNombre.includes(filtroNombre)) pasa = false;
                    if (textoTotal < filtroTotalMin || textoTotal > filtroTotalMax) pasa = false;

                    // desplazamiento
                    if (filtroDesplazamiento) {
                        if (filtroDesplazamiento === 'con' && textoDespl === 0) pasa = false;
                        if (filtroDesplazamiento === 'sin' && textoDespl > 0) pasa = false;
                        if (filtroDesplazamiento === 'mayor' && textoDespl <= 0) pasa = false;
                        if (filtroDesplazamiento === 'cero' && textoDespl !== 0) pasa = false;
                    }

                    // etnica
                    if (filtroEtnica) {
                        if (filtroEtnica === 'con' && textoEtn === 0) pasa = false;
                        if (filtroEtnica === 'sin' && textoEtn > 0) pasa = false;
                        if (filtroEtnica === 'mayor' && textoEtn <= 0) pasa = false;
                        if (filtroEtnica === 'cero' && textoEtn !== 0) pasa = false;
                    }

                    // discapacidad
                    if (filtroDiscapacidad) {
                        if (filtroDiscapacidad === 'con' && textoDis === 0) pasa = false;
                        if (filtroDiscapacidad === 'sin' && textoDis > 0) pasa = false;
                        if (filtroDiscapacidad === 'mayor' && textoDis <= 0) pasa = false;
                        if (filtroDiscapacidad === 'cero' && textoDis !== 0) pasa = false;
                    }

                    if (pasa) {
                        fila.style.display = '';
                        visibles++;
                    } else { fila.style.display = 'none'; }
                } else {
                    fila.style.display = '';
                    visibles++; // show messages rows
                }
            });

            if (contador) {
                contador.innerHTML = `Mostrando <span class="fw-bold">${visibles}</span> de <span class="fw-bold">${filas.length}</span>`;
                if (visibles === 0 && filas.length > 0) contador.className = 'text-danger';
                else if (visibles === filas.length) contador.className = 'text-success';
                else contador.className = 'text-muted';
            }
        }

        function aplicarFiltrosPoblacion() { try { _applyPoblacionFilters(); } catch (e) { console.error('Error en aplicarFiltrosPoblacion:', e); } }

        function limpiarFiltrosPoblacion() {
            try {
                ['filtroCodigoPoblacion', 'filtroNombrePoblacion', 'filtroTotalMin', 'filtroTotalMax', 'filtroDesplazamiento', 'filtroEtnica', 'filtroDiscapacidad'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                aplicarFiltrosPoblacion();
            } catch (e) { console.error('Error en limpiarFiltrosPoblacion:', e); }
        }

        function cargarTablaPoblacion() { try { if (typeof cargarIndicadores === 'function') cargarIndicadores(); } catch (e) { console.error('Error en cargarTablaPoblacion:', e); } }

        // Exponer wrappers globalmente para que los atributos inline en HTML funcionen
        try {
            if (typeof window !== 'undefined') {
                window.aplicarFiltrosPoblacion = aplicarFiltrosPoblacion;
                window.limpiarFiltrosPoblacion = limpiarFiltrosPoblacion;
                window.cargarTablaPoblacion = cargarTablaPoblacion;
            }
        } catch (e) { console.warn('No se pudieron exponer wrappers de filtros poblacion:', e); }






        // FUNCION PARA MOSTRAR VALORES O "SIN REGISTRO" EN CASO DE VALORES NULOS O VACIOS
        function displayValue(val) {
            if (val === null || val === undefined) return 'Sin Registro';
            if (typeof val === 'string' && val.trim() === '') return 'Sin Registro';
            return String(val);
        }

        // Paginación local
        const pageSize = 20;
        window.indicadoresPage = window.indicadoresPage || 1;
        window.indicadoresData = indicadores;

        function renderIndicadores(page = 1) {
            window.indicadoresPage = page;
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const visibles = window.indicadoresData.slice(start, end);

            tbody.innerHTML = '';

        visibles.forEach(indicador => {
            const tr = document.createElement('tr');

            const tdCodigoPrograma = document.createElement('td');
            tdCodigoPrograma.textContent = displayValue(indicador.cod_programa);

            // const tdNombrePrograma = document.createElement('td');
            // tdNombrePrograma.textContent = displayValue(indicador.nombre_programa);

            const tdTotal = document.createElement('td');
            // Determinar de dónde viene el número de ficha según el backend
            const totalFicha =
                (indicador.numero_ficha !== undefined && indicador.numero_ficha !== null)
                    ? indicador.numero_ficha
                    : (indicador.numeroFicha !== undefined && indicador.numeroFicha !== null)
                        ? indicador.numeroFicha
                        : (indicador.ficha !== undefined && indicador.ficha !== null)
                            ? indicador.ficha
                            : indicador.total;
            console.log('DEBUG columna Total (ficha):', {
                numero_ficha: indicador.numero_ficha,
                numeroFicha: indicador.numeroFicha,
                ficha: indicador.ficha,
                total: indicador.total,
                usado: totalFicha
            });
            tdTotal.textContent = displayValue(totalFicha);

            const sumaDesplazados =
                (indicador.despl_viol_apr_tot || 0) +
                (indicador.indig_despl_viol_apr_tot || 0) +
                (indicador.afro_despl_viol_apr_tot || 0) +
                (indicador.despojo_apr_tot || 0) +
                (indicador.amenaza_apr_tot || 0);
            const tdDesplazados = document.createElement('td');
            tdDesplazados.textContent = displayValue(sumaDesplazados);

            const sumaEtnica =
                (indicador.negro_apr_tot || 0) +
                (indicador.afro_apr_tot || 0) +
                (indicador.indig_apr_tot || 0) +
                (indicador.raizal_apr_tot || 0);
            const tdEtnica = document.createElement('td');
            tdEtnica.textContent = displayValue(sumaEtnica);

            const sumaDiscap =
                (indicador.discap_fis_apr_tot || 0) +
                (indicador.discap_aud_apr_tot || 0) +
                (indicador.discap_vis_apr_tot || 0) +
                (indicador.discap_mult_apr_tot || 0);
            const tdDiscap = document.createElement('td');
            tdDiscap.textContent = displayValue(sumaDiscap);

            const totalCombinado = computeIndicadoresSum(indicador);
            const tdTotalCombinado = document.createElement('td');
            tdTotalCombinado.textContent = displayValue(totalCombinado);

            tr.append(
                tdCodigoPrograma,
                // tdNombrePrograma,
                tdTotalCombinado,
                tdDesplazados,
                tdEtnica,
                tdDiscap,
            );








            /* ------------------------------------------------------
               BOTÓN VER MÁS (INDICADORES)
            ------------------------------------------------------ */
            const tdAcciones = document.createElement('td');
            tdAcciones.classList.add('text-center');

            const btnVerMas = document.createElement('button');
            btnVerMas.className = 'btn btn-sm btn-primary';
            btnVerMas.textContent = 'Más';

            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn btn-sm btn-outline-secondary ms-1';
            btnEditar.textContent = 'Editar';

            // Inicializar propiedades para compartir datos entre botones
            const programaBase = {
                nombre: indicador.nombre_programa,
                cod_programa: indicador.cod_programa,
                version: indicador.version,
                numero_ficha: indicador.numero_ficha
            };
            btnVerMas.programaBase = programaBase;
            btnVerMas.indicadoresBase = indicador;
            btnEditar.programaBase = programaBase;
            btnEditar.indicadoresBase = indicador;

            /* ------------------------------------------------------
               EVENTO DEL BOTÓN MÁS (VER - SOLO LECTURA)
            ------------------------------------------------------ */
            btnVerMas.addEventListener('click', async() => {

                btnVerMas.disabled = true;
                btnVerMas.textContent = 'Cargando...';

                try {
                    const token = localStorage.getItem('access_token');

                    /* ------------------------------------------------------
                       1. OBTENER INDICADORES COMPLETOS (vía servicio)
                    ------------------------------------------------------ */
                    try {
                        // Usar servicio para obtener indicadores por ficha
                        const respuesta = await indicadoresService.getIndicadoresByFicha(indicador.numero_ficha);

                        if (Array.isArray(respuesta)) {
                            const encontrado = respuesta.find(item => String(item.version) === String(indicador.version));
                            if (encontrado) {
                                // Guardar los datos completos en AMBOS botones
                                btnVerMas.indicadoresBase = encontrado;
                                btnEditar.indicadoresBase = encontrado;
                                console.log("✔ Indicadores encontrados para esta versión (array)");
                            } else {
                                console.warn("⚠ No se encontró la versión exacta en el array, usando datos básicos");
                            }
                        } else if (respuesta && (respuesta.version !== undefined || respuesta.numero_ficha !== undefined)) {
                            // El endpoint primario puede devolver un objeto único (ficha específica). Usarlo directamente.
                            btnVerMas.indicadoresBase = respuesta;
                            btnEditar.indicadoresBase = respuesta;
                            console.log("✔ Indicadores encontrados para esta ficha (objeto único)");
                        }
                    } catch (e) {
                        console.warn("⚠ Error cargando indicadores, usando valores iniciales:", e.message);
                    }

                    /* ------------------------------------------------------
                       2. MOSTRAR MODAL EN LECTURA
                    ------------------------------------------------------ */
                    // Si el objeto base no tiene campos detallados, marcar como parcial
                    const isPartial = !(btnVerMas.indicadoresBase && (btnVerMas.indicadoresBase.gran_total !== undefined || btnVerMas.indicadoresBase.indig_despl_viol_apr_tot !== undefined));
                    showIndicadoresModalView(btnVerMas.programaBase, btnVerMas.indicadoresBase, { partial: isPartial });

                } catch (err) {
                    console.error("Error general:", err);
                    alert("Error cargando información: " + (err.message || err));
                } finally {
                    btnVerMas.disabled = false;
                    btnVerMas.textContent = "Más";
                }
            });

            /* ------------------------------------------------------
               EVENTO DEL BOTÓN EDITAR (EDITABLE)
            ------------------------------------------------------ */
            btnEditar.addEventListener('click', async() => {

                btnEditar.disabled = true;
                btnEditar.textContent = 'Cargando...';
                try {
                    const token = localStorage.getItem('access_token');

                    /* Si no se han cargado indicadores completos, cargarlos ahora */
                    try {
                        const respuesta = await indicadoresService.getIndicadoresByFicha(indicador.numero_ficha);

                        if (Array.isArray(respuesta)) {
                            const encontrado = respuesta.find(item => String(item.version) === String(indicador.version));
                            if (encontrado) {
                                btnEditar.indicadoresBase = encontrado;
                                console.log("✔ Indicadores cargados para editar (array)");
                            } else {
                                console.warn("⚠ No se encontró la versión exacta en el array");
                            }
                        } else if (respuesta && (respuesta.version !== undefined || respuesta.numero_ficha !== undefined)) {
                            btnEditar.indicadoresBase = respuesta;
                            console.log("✔ Indicadores cargados para editar (objeto único)");
                        }
                    } catch (e) {
                        console.warn("⚠ Error cargando indicadores para editar:", e.message);
                    }

                    // Abre el modal editable con los datos
                    const isPartialEdit = !(btnEditar.indicadoresBase && (btnEditar.indicadoresBase.gran_total !== undefined || btnEditar.indicadoresBase.indig_despl_viol_apr_tot !== undefined));
                    showIndicadoresModal(btnEditar.programaBase, btnEditar.indicadoresBase, { partial: isPartialEdit });

                } catch (err) {
                    console.error("Error general:", err);
                    alert("Error cargando información: " + (err.message || err));
                } finally {
                    btnEditar.disabled = false;
                    btnEditar.textContent = "Editar";
                }
            });

            tdAcciones.append(btnVerMas, btnEditar);
            tr.append(
                tdCodigoPrograma,
                // tdNombrePrograma,
                tdTotalCombinado,
                tdDesplazados,
                tdEtnica,
                tdDiscap,
                tdAcciones
            );
            tbody.appendChild(tr);


        });

            // Paginación UI
            const total = window.indicadoresData.length;
            const totalPages = Math.ceil(total / pageSize) || 1;
            let pag = document.getElementById('paginacionIndicadores');
            const table = tbody.closest('table');
            if (!pag && table && table.parentElement) {
                pag = document.createElement('div');
                pag.id = 'paginacionIndicadores';
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
                prev.addEventListener('click', () => renderIndicadores(page - 1));

                const next = document.createElement('button');
                next.className = 'btn btn-sm btn-outline-primary';
                next.textContent = 'Siguiente';
                next.disabled = page >= totalPages;
                next.addEventListener('click', () => renderIndicadores(page + 1));

                const pageLabel = document.createElement('span');
                pageLabel.className = 'mx-2 small text-muted';
                pageLabel.textContent = `Página ${page} de ${totalPages}`;

                controls.append(prev, pageLabel, next);
                pag.append(info, controls);
            }
        }

        renderIndicadores(window.indicadoresPage);

        // Exponer datos cargados y forzar actualización de tarjetas del dashboard
        try {
            window.indicadoresTabla = indicadores;
            if (typeof refrescarCardsIndicadores === 'function') refrescarCardsIndicadores();
        } catch (e) {
            console.warn('No se pudo actualizar tarjetas desde indicadores:', e);
        }

    } catch (err) {
        console.error('Error al obtener indicadores:', err);
        if (err.status === 401 || err.status === 403) {
            localStorage.removeItem('access_token');
            window.location.href = 'login.html';
            return;
        }
        tbody.innerHTML = `<tr><td colspan="17" class="text-center small text-danger">Error al cargar datos: ${err.message || err} <button class="btn btn-sm btn-outline-primary ms-2" id="retry-cargar-indicadores">Reintentar</button></td></tr>`;
        // Intentar actualizar las cards usando datos disponibles (tabla o memoria)
        setTimeout(() => { try { if (typeof cargarEstadisticasIndicadoresDashboard === 'function') cargarEstadisticasIndicadoresDashboard(); } catch (e) { console.warn('No se pudo cargar estadísticas tras error en cargarIndicadores:', e); } }, 50);
        document.getElementById('retry-cargar-indicadores') && document.getElementById('retry-cargar-indicadores').addEventListener('click', () => cargarIndicadores());
    }
}




// INICIALIZAR CUANDO EL ELEMENTO ESTE DISPONIBLE

function initWhenReady() {
    const existing = document.getElementById('tablaIndicadores');
    if (existing) {
        cargarIndicadores();
        return;
    }

    const observer = new MutationObserver((mutations, obs) => {
        if (document.getElementById('tablaIndicadores')) {
            obs.disconnect();
            cargarIndicadores();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}







// Ejecutar cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', initWhenReady);

// Escuchar cambios en el hash para cargar cuando se navega a indicadores
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#indicadores' || (!window.location.hash && location.pathname.endsWith('index.html'))) {
        // Dar un pequeño delay para que el DOM se actualice
        setTimeout(initWhenReady, 100);
    }
});

// React to view:loaded emitted by main.js so we initialise reliably when loadView inserts the markup
document.addEventListener('view:loaded', (e) => {
    try {
        const path = (e && e.detail && e.detail.viewPath) || '';
        if (path.endsWith('indicadores.html')) {
            setTimeout(initWhenReady, 50);
        }
    } catch (err) { console.warn('view:loaded handler(indicadores) failed:', err); }
});


// Helper: construir HTML con todos los campos de la tabla Indicadores_programa
function buildIndicadoresFullHtml(indicadores) {
    // Agrupar campos en secciones para una lectura más clara
    const SECTIONS = [{
            title: 'A. Población Víctima / Desplazada',
            keys: ['indig_despl_viol_apr_tot', 'indig_despl_viol_cab_fam_apr_tot', 'afro_despl_viol_apr_tot', 'afro_despl_viol_cab_fam_apr_tot', 'despl_viol_apr_tot', 'despl_viol_cab_fam_apr_tot', 'despl_disc_apr_tot', 'despojo_apr_tot', 'despl_fen_nat_apr_tot', 'despl_fen_nat_cab_fam_apr_tot']
        },
        {
            title: 'B. Víctimas de Violencia / Conflicto',
            keys: ['act_grup_arm_apr_tot', 'amenaza_apr_tot', 'del_sex_apr_tot', 'desap_forz_apr_tot', 'homi_masac_apr_tot', 'minas_exp_apr_tot', 'secuestro_apr_tot', 'tortura_apr_tot', 'uso_men_grup_arm_apr_tot', 'herido_apr_tot', 'reclut_forz_apr_tot', 'ado_desv_gr_arm_tot']
        },
        {
            title: 'C. Población Étnica / Afrodescendiente',
            keys: ['negro_apr_tot', 'afro_apr_tot', 'palenq_apr_tot', 'raizal_apr_tot', 'indig_apr_tot']
        },
        {
            title: 'D. Discapacidad',
            keys: ['discap_apr_tot', 'discap_aud_apr_tot', 'discap_vis_apr_tot', 'discap_fis_apr_tot', 'discap_int_apr_tot', 'discap_psico_apr_tot', 'discap_mult_apr_tot', 'sordoceg_apr_tot']
        },
        {
            title: 'E. Población Vulnerable / Especial',
            keys: ['adol_conf_ley_apr_tot', 'adol_trab_apr_tot', 'inpec_apr_tot', 'jov_vuln_apr_tot', 'muj_cabfam_apr_tot', 'proc_reint_apr_tot', 'rem_pal_tot', 'sob_min_ant_tot', 'sold_camp_tot', 'terc_edad_tot', 'rom_tot', 'camp_tot', 'ning_tot']
        },
        {
            title: 'F. Otros Grupos / Emprendimiento',
            keys: ['artes_tot', 'empr_tot', 'mic_emp_tot', 'rem_cie_tot']
        }
    ];

    const LABEL_OVERRIDES = {
        'numero_ficha': 'Ficha',
        'cod_programa': 'Código Programa',
        'version': 'Versión',
        'indig_despl_viol_apr_tot': 'Indígenas desplazados (total)',
        'indig_despl_viol_cab_fam_apr_tot': 'Indígenas desplazados (cabeza de familia)',
        'afro_despl_viol_apr_tot': 'Afro desplazados (total)',
        'afro_despl_viol_cab_fam_apr_tot': 'Afro desplazados (cabeza de familia)',
        'despl_viol_apr_tot': 'Desplazados por violencia (total)',
        'despl_viol_cab_fam_apr_tot': 'Desplazados por violencia (cabeza de familia)',
        'despl_disc_apr_tot': 'Desplazados por discapacidad (total)',
        'despojo_apr_tot': 'Despojo (total)',
        'act_grup_arm_apr_tot': 'Actividades grupos armados',
        'amenaza_apr_tot': 'Amenazas',
        'del_sex_apr_tot': 'Delitos sexuales',
        'desap_forz_apr_tot': 'Desaparición forzada',
        'homi_masac_apr_tot': 'Homicidios/Masacres',
        'minas_exp_apr_tot': 'Minas/Explosivos',
        'secuestro_apr_tot': 'Secuestros',
        'tortura_apr_tot': 'Tortura',
        'uso_men_grup_arm_apr_tot': 'Uso de menores',
        'herido_apr_tot': 'Heridos',
        'reclut_forz_apr_tot': 'Reclutamiento forzado',
        'ado_desv_gr_arm_tot': 'Adol. desvinculados',
        'negro_apr_tot': 'Negros (total)',
        'afro_apr_tot': 'Afro (total)',
        'palenq_apr_tot': 'Palenqueros (total)',
        'raizal_apr_tot': 'Raizales (total)',
        'indig_apr_tot': 'Indígenas (total)',
        'discap_apr_tot': 'Discapacidad (total)',
        'discap_aud_apr_tot': 'Auditiva',
        'discap_vis_apr_tot': 'Visual',
        'discap_fis_apr_tot': 'Física',
        'discap_int_apr_tot': 'Intelectual',
        'discap_psico_apr_tot': 'Psicosocial',
        'discap_mult_apr_tot': 'Múltiple',
        'sordoceg_apr_tot': 'Sordoceguera',
        'adol_conf_ley_apr_tot': 'Adol. conflicto con la ley',
        'adol_trab_apr_tot': 'Adol. trabajadores',
        'inpec_apr_tot': 'INPEC',
        'jov_vuln_apr_tot': 'Jóvenes vulnerables',
        'muj_cabfam_apr_tot': 'Mujeres jefas de familia',
        'proc_reint_apr_tot': 'Reintegración',
        'rem_pal_tot': 'Remisiones Palabra',
        'sob_min_ant_tot': 'Sobre mínimos',
        'sold_camp_tot': 'Soldados campesinos',
        'terc_edad_tot': 'Tercera edad',
        'rom_tot': 'Población ROM',
        'camp_tot': 'Campesinos',
        'ning_tot': 'Sin característica especial',
        'artes_tot': 'Artes',
        'empr_tot': 'Emprendimiento',
        'mic_emp_tot': 'Microempresarios',
        'rem_cie_tot': 'Remesas cierre'
    };

    function friendlyLabel(key) {
        if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
        const parts = String(key).split('_').map(p => p.replace(/\b\w/g, s => s.toUpperCase()));
        return parts.join(' ');
    }

    // Construir HTML por secciones
    let html = '';

    const numericKeys = new Set([
        'indig_despl_viol_apr_tot', 'indig_despl_viol_cab_fam_apr_tot', 'afro_despl_viol_apr_tot', 'afro_despl_viol_cab_fam_apr_tot',
        'despl_viol_apr_tot', 'despl_viol_cab_fam_apr_tot', 'despl_disc_apr_tot', 'despojo_apr_tot', 'act_grup_arm_apr_tot',
        'amenaza_apr_tot', 'del_sex_apr_tot', 'desap_forz_apr_tot', 'homi_masac_apr_tot', 'minas_exp_apr_tot', 'secuestro_apr_tot',
        'tortura_apr_tot', 'uso_men_grup_arm_apr_tot', 'herido_apr_tot', 'reclut_forz_apr_tot', 'negro_apr_tot', 'afro_apr_tot',
        'palenq_apr_tot', 'raizal_apr_tot', 'discap_apr_tot', 'discap_aud_apr_tot', 'discap_vis_apr_tot', 'discap_fis_apr_tot',
        'discap_int_apr_tot', 'discap_psico_apr_tot', 'discap_mult_apr_tot', 'sordoceg_apr_tot', 'despl_fen_nat_apr_tot',
        'despl_fen_nat_cab_fam_apr_tot', 'adol_conf_ley_apr_tot', 'adol_trab_apr_tot', 'indig_apr_tot', 'inpec_apr_tot',
        'jov_vuln_apr_tot', 'muj_cabfam_apr_tot', 'proc_reint_apr_tot', 'ado_desv_gr_arm_tot', 'rem_pal_tot', 'sob_min_ant_tot',
        'sold_camp_tot', 'terc_edad_tot', 'rom_tot', 'camp_tot', 'ning_tot', 'artes_tot', 'empr_tot', 'mic_emp_tot', 'rem_cie_tot'
    ]);


    SECTIONS.forEach(section => {
                let rows = '';
                let sectionSum = 0;
                const keys = section.keys || [];
                for (let i = 0; i < keys.length; i += 2) {
                    const k1 = keys[i];
                    const k2 = keys[i + 1];
                    const v1 = (indicadores && Object.prototype.hasOwnProperty.call(indicadores, k1)) ? indicadores[k1] : null;
                    const v2 = k2 ? ((indicadores && Object.prototype.hasOwnProperty.call(indicadores, k2)) ? indicadores[k2] : null) : null;

                    const isNum1 = numericKeys.has(k1);
                    const isNum2 = k2 ? numericKeys.has(k2) : false;

                    const rawDisplay1 = (v1 === null || v1 === undefined || (typeof v1 === 'string' && String(v1).trim() === '')) ? 'Sin registro' : String(v1);
                    const rawDisplay2 = (v2 === null || v2 === undefined || (typeof v2 === 'string' && String(v2).trim() === '')) ? 'Sin registro' : String(v2);

                    const n1 = isNum1 ? (Number(v1) || 0) : 0;
                    const n2 = isNum2 ? (Number(v2) || 0) : 0;

                    const display1 = isNum1 && rawDisplay1 !== 'Sin registro' ? n1.toLocaleString() : rawDisplay1;
                    const display2 = isNum2 && rawDisplay2 !== 'Sin registro' ? n2.toLocaleString() : rawDisplay2;

                    sectionSum += n1 + n2;

                    rows += `
                <tr class="align-middle">
                    <td style="width:50%">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="small text-muted me-2">${friendlyLabel(k1)}</div>
                            <div class="fw-semibold ${isNum1 ? 'text-end' : ''}" ${isNum1 ? `data-numeric="true" data-key="${k1}"` : ''}>${display1 === 'Sin registro' ? `<span class="text-muted">${display1}</span>` : display1}</div>
                        </div>
                    </td>
                    <td style="width:50%">
                        ${k2 ? (`<div class="d-flex justify-content-between align-items-center">
                            <div class="small text-muted me-2">${friendlyLabel(k2)}</div>
                            <div class="fw-semibold ${isNum2 ? 'text-end' : ''}" ${isNum2 ? `data-numeric="true" data-key="${k2}"` : ''}>${display2 === 'Sin registro' ? `<span class="text-muted">${display2}</span>` : display2}</div>
                        </div>`) : ''}
                    </td>
                </tr>`;
        }

        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <h6 class="fw-bold mb-3 text-secondary">${section.title}</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-borderless mb-0">
                            <tbody>
                                ${rows}
                                <tr class="border-top">
                                    <td class="small text-muted">Subtotal</td>
                                    <td class="fw-bold text-end">${sectionSum.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    });

    // Nota: El Gran Total se calcula a partir de los valores mostrados cuando se muestra el modal.
    return html;
}


// Helper: calcular suma total de todos los campos numéricos relevantes (ignora identificadores y gran_total)
function computeIndicadoresSum(indicadores) {
    if (!indicadores) return 0;
    const numericKeys = [
        'indig_despl_viol_apr_tot','indig_despl_viol_cab_fam_apr_tot','afro_despl_viol_apr_tot','afro_despl_viol_cab_fam_apr_tot',
        'despl_viol_apr_tot','despl_viol_cab_fam_apr_tot','despl_disc_apr_tot','despojo_apr_tot','act_grup_arm_apr_tot',
        'amenaza_apr_tot','del_sex_apr_tot','desap_forz_apr_tot','homi_masac_apr_tot','minas_exp_apr_tot','secuestro_apr_tot',
        'tortura_apr_tot','uso_men_grup_arm_apr_tot','herido_apr_tot','reclut_forz_apr_tot','negro_apr_tot','afro_apr_tot',
        'palenq_apr_tot','raizal_apr_tot','discap_apr_tot','discap_aud_apr_tot','discap_vis_apr_tot','discap_fis_apr_tot',
        'discap_int_apr_tot','discap_psico_apr_tot','discap_mult_apr_tot','sordoceg_apr_tot','despl_fen_nat_apr_tot',
        'despl_fen_nat_cab_fam_apr_tot','adol_conf_ley_apr_tot','adol_trab_apr_tot','indig_apr_tot','inpec_apr_tot',
        'jov_vuln_apr_tot','muj_cabfam_apr_tot','proc_reint_apr_tot','ado_desv_gr_arm_tot','rem_pal_tot','sob_min_ant_tot',
        'sold_camp_tot','terc_edad_tot','rom_tot','camp_tot','ning_tot','artes_tot','empr_tot','mic_emp_tot','rem_cie_tot'
    ];

    return numericKeys.reduce((acc, k) => {
        const v = indicadores[k];
        const n = (v === null || v === undefined || v === '') ? 0 : Number(v) || 0;
        return acc + n;
    }, 0);
}











/* ------------------------------------------------------
   MODAL DE SOLO LECTURA - INDICADORES
------------------------------------------------------ */

function showIndicadoresModalView(programa, indicadores, opts = {}) {

    const contenido = `
    <div class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style="max-width:1100px;">
    <div class="modal-content shadow-lg">

        <!-- HEADER -->
        <div class="modal-header header-image text-white">
            <h5 class="modal-title">
                Detalle Indicadores – Ficha ${indicadores.numero_ficha}
                <span class="fw-light">(Programa: ${programa.nombre || programa.cod_programa || ''})</span>
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <!-- BODY -->
        <div class="modal-body">

            <!-- IDENTIFICACIÓN (Solo lectura) -->
            <h5 class="fw-bold text-secondary">1. Identificación Única</h5>
            <div class="row g-3 mb-4 mt-1">
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Ficha</label>
                    <input type="text" class="form-control" value="${indicadores.numero_ficha}" disabled>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Programa</label>
                    <input type="text" class="form-control" value="${indicadores.cod_programa}" disabled>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Versión</label>
                    <input type="text" class="form-control" value="${indicadores.version}" disabled>
                </div>
            </div>

                    <hr>

                    ${opts.partial ? `<div class="alert alert-warning">No existe una ficha completa en el servidor para este número; se muestran los datos básicos. Si necesita editar y guardar, podrá crear la ficha al confirmar.</div>` : ''}

                    <!-- Indicador: Gran Total -->
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold text-secondary mb-0">A. Indicadores completos</h5>
                        <div class="fs-5 fw-bold text-primary">Gran Total: <span id="view_gran_total">${(indicadores.gran_total || indicadores.total || computeIndicadoresSum(indicadores)).toLocaleString()}</span></div>
                    </div>
                    <div class="mb-4">
                        ${buildIndicadoresFullHtml(indicadores)}
                    </div>

            

        </div>

        <!-- FOOTER -->
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        </div>

    </div>
    </div>
    </div>
    `;

    const wrap = document.createElement("div");
    wrap.innerHTML = contenido;

    const modalEl = wrap.firstElementChild;
    document.body.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl);

    modalEl.addEventListener("hidden.bs.modal", () => {
        modal.dispose();
        modalEl.remove();
    });

    modal.show();

    // Recalcular Gran Total a partir de los valores visibles en el modal (marcados con data-numeric)
    try {
        setTimeout(() => {
            let sum = 0;
            const numericEls = modalEl.querySelectorAll('[data-numeric="true"]');
            numericEls.forEach(el => {
                const txt = (el.textContent || '').replace(/[^0-9.\-]/g, '');
                const n = Number(txt) || 0;
                sum += n;
                // Asegurar alineación derecha para números
                el.classList.add('text-end');
            });
            const totalEl = modalEl.querySelector('#view_gran_total');
            if (totalEl) totalEl.textContent = (typeof sum === 'number') ? sum.toLocaleString() : sum;
        }, 50);
    } catch (e) {
        console.warn('No se pudo recalcular Gran Total (vista):', e);
    }
}

/* ------------------------------------------------------
   MODAL PROFESIONAL DE INDICADORES (EDITABLE)
------------------------------------------------------ */

function showIndicadoresModal(programa, indicadores, opts = {}) {

    const contenido = `
    <div class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style="max-width:1100px;">
    <div class="modal-content shadow-lg">

        <!-- HEADER -->
        <div class="modal-header header-image text-white">
            <h5 class="modal-title">
                Editar Indicadores – Ficha ${indicadores.numero_ficha}
                <span class="fw-light">(Programa: ${programa.nombre || programa.cod_programa || ''})</span>
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <!-- BODY -->
        <div class="modal-body">

            <!-- IDENTIFICACIÓN (Solo lectura) -->
            <h5 class="fw-bold text-secondary">1. Identificación Única</h5>
            <div class="row g-3 mb-4 mt-1">
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Ficha</label>
                    <input type="text" class="form-control" value="${indicadores.numero_ficha}" disabled>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Programa</label>
                    <input type="text" class="form-control" value="${indicadores.cod_programa}" disabled>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Versión</label>
                    <input type="text" class="form-control" value="${indicadores.version}" disabled>
                </div>
            </div>

                    <hr>

                    ${opts.partial ? `<div class="alert alert-warning">No existe una ficha completa en el servidor para este número; al guardar se intentará crear la ficha con los valores ingresados.</div>` : ''}

                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold text-secondary mb-0">A. Indicadores completos (editable)</h5>
                        <div class="fs-5 fw-bold text-primary">Gran Total: <span id="edit_gran_total">${(indicadores.gran_total || indicadores.total || computeIndicadoresSum(indicadores)).toLocaleString()}</span></div>
                    </div>
                    <div class="mb-4" id="indicadores_editable_container">
                        ${buildIndicadoresEditableHtml(indicadores)}
                    </div>

            

        </div>

        <!-- FOOTER -->
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnGuardarIndicadores">Guardar cambios</button>
        </div>

    </div>
    </div>
    </div>
    `;

    const wrap = document.createElement("div");
    wrap.innerHTML = contenido;

    const modalEl = wrap.firstElementChild;
    document.body.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl);

    modalEl.addEventListener("hidden.bs.modal", () => {
        modal.dispose();
        modalEl.remove();
    });

    modal.show();
    // Adjuntar handler para guardar cambios
    try {
        const btnGuardar = modalEl.querySelector('#btnGuardarIndicadores');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', async () => {
                btnGuardar.disabled = true;
                const origText = btnGuardar.textContent;
                btnGuardar.textContent = 'Guardando...';

                // Construir payload tomando todos los inputs con data-field
                const inputs = modalEl.querySelectorAll('[data-field]');
                const payload = {};
                inputs.forEach(inp => {
                    const key = inp.getAttribute('data-field');
                    if (!key) return;
                    let val = inp.value;
                    // Normalizar: si el campo está vacío, enviar null
                    if (val === '') val = null;
                    // Convertir a número si el input es number
                    if (inp.type === 'number' && val !== null) {
                        const n = Number(val);
                        val = Number.isNaN(n) ? null : n;
                    }
                    payload[key] = val;
                });

                try {
                    await indicadoresService.updateIndicadores(indicadores.numero_ficha, payload);
                    // Refrescar tabla
                    if (typeof cargarIndicadores === 'function') cargarIndicadores();
                    modal.hide();
                    alert('Indicadores actualizados correctamente.');
                } catch (e) {
                    console.error('Error actualizando indicadores:', e);
                    // Si el servidor responde Not Found, ofrecer crear la ficha
                    if (e && e.message && e.message.toLowerCase().includes('not found')) {
                        const crear = confirm('La ficha no existe en el servidor. ¿Desea crearla con los valores actuales?');
                        if (crear) {
                            try {
                                // Crear payload de registro incluyendo identificadores necesarios
                                const createPayload = Object.assign({
                                    numero_ficha: indicadores.numero_ficha,
                                    cod_programa: indicadores.cod_programa,
                                    version: indicadores.version
                                }, payload);

                                await indicadoresService.createIndicadores(createPayload);
                                if (typeof cargarIndicadores === 'function') cargarIndicadores();
                                modal.hide();
                                alert('Ficha creada correctamente.');
                            } catch (errCreate) {
                                console.error('Error creando ficha:', errCreate);
                                // Mostrar diagnóstico si está disponible
                                let detalle = (errCreate && errCreate.message) ? errCreate.message : String(errCreate);
                                if (errCreate && errCreate._diagnosis) {
                                    const d = errCreate._diagnosis;
                                    detalle += `\nDiagnóstico: registrar endpoint: ${d.hasRegistrar ? 'sí' : 'no'}, root POST: ${d.hasRoot ? 'sí' : 'no'}`;
                                }
                                alert('Error al crear la ficha: ' + detalle);
                            }
                        } else {
                            alert('No se realizaron cambios: la ficha no existe.');
                        }
                    } else {
                        alert('Error al actualizar indicadores: ' + (e.message || e));
                    }
                } finally {
                    btnGuardar.disabled = false;
                    btnGuardar.textContent = origText;
                }
            });
        }
    } catch (e) {
        console.warn('No se pudo anexar handler de guardar (indicadores):', e);
    }

    // Recalcular gran total dinámicamente cuando el usuario edita inputs
    try {
        const editContainer = modalEl.querySelector('#indicadores_editable_container');
        const totalEl = modalEl.querySelector('#edit_gran_total');
        if (editContainer && totalEl) {
            const inputs = editContainer.querySelectorAll('input[data-field]');
            const recompute = () => {
                let sum = 0;
                inputs.forEach(inp => {
                    if (!inp) return;
                    const key = inp.getAttribute('data-field');
                    if (!key) return;
                    const val = inp.value === '' ? 0 : Number(inp.value) || 0;
                    sum += val;
                });
                totalEl.textContent = sum.toLocaleString();
            };
            inputs.forEach(i => i.addEventListener('input', recompute));
            // inicial
            setTimeout(recompute, 50);
        }
    } catch (e) { console.warn('No se pudo anexar recalculo dinámico del total:', e); }
}


// Construir HTML editable para indicadores (inputs con data-field)
function buildIndicadoresEditableHtml(indicadores) {
    // Usar mismas secciones que la vista completa para consistencia
    const SECTIONS = [
        {
            title: 'A. Población Víctima / Desplazada',
            keys: ['indig_despl_viol_apr_tot','indig_despl_viol_cab_fam_apr_tot','afro_despl_viol_apr_tot','afro_despl_viol_cab_fam_apr_tot','despl_viol_apr_tot','despl_viol_cab_fam_apr_tot','despl_disc_apr_tot','despojo_apr_tot','despl_fen_nat_apr_tot','despl_fen_nat_cab_fam_apr_tot']
        },
        {
            title: 'B. Víctimas de Violencia / Conflicto',
            keys: ['act_grup_arm_apr_tot','amenaza_apr_tot','del_sex_apr_tot','desap_forz_apr_tot','homi_masac_apr_tot','minas_exp_apr_tot','secuestro_apr_tot','tortura_apr_tot','uso_men_grup_arm_apr_tot','herido_apr_tot','reclut_forz_apr_tot','ado_desv_gr_arm_tot']
        },
        {
            title: 'C. Población Étnica / Afrodescendiente',
            keys: ['negro_apr_tot','afro_apr_tot','palenq_apr_tot','raizal_apr_tot','indig_apr_tot']
        },
        {
            title: 'D. Discapacidad',
            keys: ['discap_apr_tot','discap_aud_apr_tot','discap_vis_apr_tot','discap_fis_apr_tot','discap_int_apr_tot','discap_psico_apr_tot','discap_mult_apr_tot','sordoceg_apr_tot']
        },
        {
            title: 'E. Población Vulnerable / Especial',
            keys: ['adol_conf_ley_apr_tot','adol_trab_apr_tot','inpec_apr_tot','jov_vuln_apr_tot','muj_cabfam_apr_tot','proc_reint_apr_tot','rem_pal_tot','sob_min_ant_tot','sold_camp_tot','terc_edad_tot','rom_tot','camp_tot','ning_tot']
        },
        {
            title: 'F. Otros Grupos / Emprendimiento',
            keys: ['artes_tot','empr_tot','mic_emp_tot','rem_cie_tot']
        }
    ];

    const LABEL_OVERRIDES = { 'numero_ficha': 'Ficha', 'cod_programa': 'Código Programa', 'version': 'Versión' };
    function friendlyLabel(key) { if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key]; const parts = String(key).split('_').map(p => p.replace(/\b\w/g, s => s.toUpperCase())); return parts.join(' '); }

    const numericKeys = new Set([
        'indig_despl_viol_apr_tot','indig_despl_viol_cab_fam_apr_tot','afro_despl_viol_apr_tot','afro_despl_viol_cab_fam_apr_tot',
        'despl_viol_apr_tot','despl_viol_cab_fam_apr_tot','despl_disc_apr_tot','despojo_apr_tot','act_grup_arm_apr_tot',
        'amenaza_apr_tot','del_sex_apr_tot','desap_forz_apr_tot','homi_masac_apr_tot','minas_exp_apr_tot','secuestro_apr_tot',
        'tortura_apr_tot','uso_men_grup_arm_apr_tot','herido_apr_tot','reclut_forz_apr_tot','negro_apr_tot','afro_apr_tot',
        'palenq_apr_tot','raizal_apr_tot','discap_apr_tot','discap_aud_apr_tot','discap_vis_apr_tot','discap_fis_apr_tot',
        'discap_int_apr_tot','discap_psico_apr_tot','discap_mult_apr_tot','sordoceg_apr_tot','despl_fen_nat_apr_tot',
        'despl_fen_nat_cab_fam_apr_tot','adol_conf_ley_apr_tot','adol_trab_apr_tot','indig_apr_tot','inpec_apr_tot',
        'jov_vuln_apr_tot','muj_cabfam_apr_tot','proc_reint_apr_tot','ado_desv_gr_arm_tot','rem_pal_tot','sob_min_ant_tot',
        'sold_camp_tot','terc_edad_tot','rom_tot','camp_tot','ning_tot','artes_tot','empr_tot','mic_emp_tot','rem_cie_tot'
    ]);

    // Construir HTML por secciones, dos columnas por fila
    let html = '';
    SECTIONS.forEach(section => {
        let rows = '';
        const keys = section.keys || [];
        for (let i = 0; i < keys.length; i += 2) {
            const k1 = keys[i];
            const k2 = keys[i+1];
            const v1 = (indicadores && Object.prototype.hasOwnProperty.call(indicadores, k1)) ? indicadores[k1] : '';
            const v2 = k2 ? ((indicadores && Object.prototype.hasOwnProperty.call(indicadores, k2)) ? indicadores[k2] : '') : '';
            const type1 = numericKeys.has(k1) ? 'number' : 'text';
            const type2 = k2 ? (numericKeys.has(k2) ? 'number' : 'text') : 'text';
            const val1 = (v1 === null || v1 === undefined) ? '' : String(v1);
            const val2 = (v2 === null || v2 === undefined) ? '' : String(v2);

            rows += `
                <tr>
                    <td style="width:50%">
                        <div class="small text-muted">${friendlyLabel(k1)}</div>
                        <input data-field="${k1}" type="${type1}" class="form-control form-control-sm" value="${val1}">
                    </td>
                    <td style="width:50%">
                        ${k2 ? (`<div class="small text-muted">${friendlyLabel(k2)}</div>
                        <input data-field="${k2}" type="${type2}" class="form-control form-control-sm" value="${val2}">`) : ''}
                    </td>
                </tr>`;
        }

        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <h6 class="fw-bold mb-3 text-secondary">${section.title}</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-borderless mb-0">
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    });

    return html;
}

/* ================================================
   CARGAR ESTADÍSTICAS PARA INDICADORES DASHBOARD
   ================================================ */

async function cargarEstadisticasIndicadoresDashboard() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.log('No hay token de autenticación');
        mostrarErrorEstadisticasIndicadoresDashboard('No autenticado');
        return;
    }

    try {
        // Mostrar estado de carga
        mostrarCargandoEstadisticasIndicadoresDashboard();

        // Obtener indicadores desde la API
        let indicadores = [];
        
        if (typeof indicadoresService !== 'undefined' && indicadoresService.getIndicadores) {
            // Usar el servicio si está disponible
            const data = await indicadoresService.getIndicadores();
            indicadores = data.indicadores || data.results || data;
        } else {
            // Usar fetch directo como fallback
            const urlIndicadores = `${API_BASE}/indicadores?limit=1000`;
            const response = await fetch(urlIndicadores, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'accept': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Error obteniendo indicadores');
            const data = await response.json();
            indicadores = data.indicadores || data.results || data;
        }
        
        if (!indicadores || !Array.isArray(indicadores) || indicadores.length === 0) {
            mostrarErrorEstadisticasIndicadoresDashboard('No hay datos disponibles');
            return;
        }

        // Calcular estadísticas de indicadores
        calcularEstadisticasIndicadoresDashboard(indicadores);

    } catch (error) {
        console.error('Error cargando estadísticas de indicadores:', error);
        // Si hay datos cargados en la tabla, usar esos datos como fallback
        if (Array.isArray(window.indicadoresTabla) && window.indicadoresTabla.length > 0) {
            console.warn('Falling back to local table data for indicadores dashboard');
            calcularEstadisticasIndicadoresDashboard(window.indicadoresTabla);
            // Añadir una nota de fuente sin borrar el detalle calculado
            const detalleEl = document.getElementById('detalleTotalIndicadores');
            if (detalleEl && !detalleEl.textContent.includes('Mostrando datos locales')) {
                detalleEl.textContent = detalleEl.textContent + ' • Mostrando datos locales (sin conexión)';
            }
            return;
        }

        // 2) Intentar reconstruir datos a partir de las filas ya renderizadas en la tabla (DOM)
        const tbody = document.getElementById('tablaIndicadores');
        if (tbody) {
            const filas = Array.from(tbody.querySelectorAll('tr')).filter(r => r.cells && r.cells.length >= 6 && !r.querySelector('.text-danger') && !r.querySelector('.text-center'));
            if (filas.length > 0) {
                const indicadoresFromDom = filas.map(r => {
                    const c = r.cells;
                    const totalCombinado = parseInt((c[2] && c[2].textContent) || 0) || 0;
                    const desplazados = parseInt((c[3] && c[3].textContent) || 0) || 0;
                    const etnicos = parseInt((c[4] && c[4].textContent) || 0) || 0;
                    const discap = parseInt((c[5] && c[5].textContent) || 0) || 0;
                    return {
                        cod_programa: (c[0] && c[0].textContent.trim()) || '',
                        gran_total: totalCombinado,
                        // Mapear los totales conocidos a campos que usan las funciones de cálculo
                        despl_viol_apr_tot: desplazados,
                        indig_despl_viol_apr_tot: 0,
                        afro_despl_viol_apr_tot: 0,
                        despojo_apr_tot: 0,
                        negro_apr_tot: etnicos,
                        afro_apr_tot: 0,
                        palenq_apr_tot: 0,
                        raizal_apr_tot: 0,
                        indig_apr_tot: 0,
                        discap_fis_apr_tot: discap,
                        discap_aud_apr_tot: 0,
                        discap_vis_apr_tot: 0,
                        discap_mult_apr_tot: 0
                    };
                });

                console.warn('Falling back to DOM table rows for indicadores dashboard');
                calcularEstadisticasIndicadoresDashboard(indicadoresFromDom);
                const detalleEl2 = document.getElementById('detalleTotalIndicadores');
                if (detalleEl2 && !detalleEl2.textContent.includes('Mostrando datos desde tabla')) {
                    detalleEl2.textContent = detalleEl2.textContent + ' • Mostrando datos desde tabla (sin conexión)';
                }
                return;
            }
        }

        mostrarErrorEstadisticasIndicadoresDashboard('Error cargando datos');
    }
}

function calcularEstadisticasIndicadoresDashboard(indicadores) {
    const totalIndicadores = indicadores.length;
    
    // 1. Calcular beneficiarios totales (gran_total)
    let totalBeneficiarios = 0;
    let programasConDatos = new Set();
    
    // 2. Calcular víctimas del conflicto
    let totalVictimasConflicto = 0;
    
    // 3. Calcular población étnica
    let totalPoblacionEtnica = 0;
    
    // 4. Calcular discapacidad
    let totalDiscapacidad = 0;
    
    // 5. Calcular otros grupos vulnerables
    let totalOtrosVulnerables = 0;
    
    indicadores.forEach(ind => {
        // Extraer cod_programa para programas únicos
        if (ind.cod_programa) {
            programasConDatos.add(ind.cod_programa.toString());
        }
        
        // 1. Beneficiarios totales
        const granTotal = ind.gran_total ? parseInt(ind.gran_total) : 0;
        totalBeneficiarios += granTotal;
        
        // 2. Víctimas del conflicto (suma de campos específicos)
        const victimas = calcularVictimasConflicto(ind);
        totalVictimasConflicto += victimas;
        
        // 3. Población étnica
        const etnicos = calcularPoblacionEtnica(ind);
        totalPoblacionEtnica += etnicos;
        
        // 4. Discapacidad
        const discapacidad = calcularDiscapacidad(ind);
        totalDiscapacidad += discapacidad;
        
        // 5. Otros vulnerables
        const otros = calcularOtrosVulnerables(ind);
        totalOtrosVulnerables += otros;
    });
    
    const totalProgramas = programasConDatos.size;
    const promedioBeneficiarios = totalProgramas > 0 
        ? Math.round(totalBeneficiarios / totalProgramas) 
        : 0;
    
    // Calcular porcentajes del total de beneficiarios
    const porcentajeVictimas = totalBeneficiarios > 0 
        ? Math.round((totalVictimasConflicto / totalBeneficiarios) * 100) 
        : 0;
    
    const porcentajeEtnica = totalBeneficiarios > 0 
        ? Math.round((totalPoblacionEtnica / totalBeneficiarios) * 100) 
        : 0;
    
    const porcentajeDiscapacidad = totalBeneficiarios > 0 
        ? Math.round((totalDiscapacidad / totalBeneficiarios) * 100) 
        : 0;

    // Actualizar tarjetas
    actualizarTarjetaTotalIndicadores(totalIndicadores, totalProgramas);
    actualizarTarjetaBeneficiariosTotales(totalBeneficiarios, promedioBeneficiarios);
    actualizarTarjetaVictimasConflictoDashboard(totalVictimasConflicto, porcentajeVictimas);
    actualizarTarjetaPoblacionEtnicaDashboard(totalPoblacionEtnica, porcentajeEtnica, totalDiscapacidad, porcentajeDiscapacidad);

    // Guardar estadísticas para uso futuro
    window.estadisticasIndicadoresDashboard = {
        totalIndicadores,
        totalProgramas,
        totalBeneficiarios,
        promedioBeneficiarios,
        totalVictimasConflicto,
        porcentajeVictimas,
        totalPoblacionEtnica,
        porcentajeEtnica,
        totalDiscapacidad,
        porcentajeDiscapacidad,
        totalOtrosVulnerables
    };

    // Opcional: Mostrar en consola para debugging
    console.log('Estadísticas Indicadores Dashboard:', window.estadisticasIndicadoresDashboard);
}

// Funciones auxiliares para cálculos específicos
function calcularVictimasConflicto(ind) {
    return (
        (ind.indig_despl_viol_apr_tot || 0) +
        (ind.afro_despl_viol_apr_tot || 0) +
        (ind.despl_viol_apr_tot || 0) +
        (ind.despl_disc_apr_tot || 0) +
        (ind.despojo_apr_tot || 0) +
        (ind.act_grup_arm_apr_tot || 0) +
        (ind.amenaza_apr_tot || 0) +
        (ind.del_sex_apr_tot || 0) +
        (ind.desap_forz_apr_tot || 0) +
        (ind.homi_masac_apr_tot || 0) +
        (ind.minas_exp_apr_tot || 0) +
        (ind.secuestro_apr_tot || 0) +
        (ind.tortura_apr_tot || 0) +
        (ind.uso_men_grup_arm_apr_tot || 0) +
        (ind.herido_apr_tot || 0) +
        (ind.reclut_forz_apr_tot || 0)
    );
}

function calcularPoblacionEtnica(ind) {
    return (
        (ind.negro_apr_tot || 0) +
        (ind.afro_apr_tot || 0) +
        (ind.palenq_apr_tot || 0) +
        (ind.raizal_apr_tot || 0) +
        (ind.indig_apr_tot || 0)
    );
}

function calcularDiscapacidad(ind) {
    return (
        (ind.discap_apr_tot || 0) +
        (ind.discap_aud_apr_tot || 0) +
        (ind.discap_vis_apr_tot || 0) +
        (ind.discap_fis_apr_tot || 0) +
        (ind.discap_int_apr_tot || 0) +
        (ind.discap_psico_apr_tot || 0) +
        (ind.discap_mult_apr_tot || 0) +
        (ind.sordoceg_apr_tot || 0)
    );
}

function calcularOtrosVulnerables(ind) {
    return (
        (ind.despl_fen_nat_apr_tot || 0) +
        (ind.adol_conf_ley_apr_tot || 0) +
        (ind.adol_trab_apr_tot || 0) +
        (ind.inpec_apr_tot || 0) +
        (ind.jov_vuln_apr_tot || 0) +
        (ind.muj_cabfam_apr_tot || 0) +
        (ind.proc_reint_apr_tot || 0) +
        (ind.ado_desv_gr_arm_tot || 0) +
        (ind.rem_pal_tot || 0) +
        (ind.sob_min_ant_tot || 0) +
        (ind.sold_camp_tot || 0) +
        (ind.terc_edad_tot || 0) +
        (ind.rom_tot || 0) +
        (ind.camp_tot || 0)
    );
}

// Funciones para actualizar cada tarjeta
function actualizarTarjetaTotalIndicadores(total, programas) {
    actualizarTarjetaIndicadorDashboard('totalIndicadoresDashboard', total);
    const textoDetalle = `${programas} programas evaluados`;
    actualizarDetalleIndicadorDashboard('detalleTotalIndicadores', textoDetalle);
}

function actualizarTarjetaBeneficiariosTotales(total, promedio) {
    // Formatear número grande
    const totalFormateado = total.toLocaleString('es-CO');
    actualizarTarjetaIndicadorDashboard('totalBeneficiariosDashboard', totalFormateado);
    
    const textoDetalle = `Promedio: ${promedio.toLocaleString('es-CO')} por programa`;
    actualizarDetalleIndicadorDashboard('detalleBeneficiariosIndicadores', textoDetalle);
    
    // Cambiar color según cantidad
    const elemento = document.getElementById('detalleBeneficiariosIndicadores');
    if (elemento && total > 0) {
        if (total > 1000) elemento.className = 'text-success';
        else if (total > 100) elemento.className = 'text-warning';
    }
}

function actualizarTarjetaVictimasConflictoDashboard(total, porcentaje) {
    const totalFormateado = total.toLocaleString('es-CO');
    actualizarTarjetaIndicadorDashboard('victimasConflictoDashboard', totalFormateado);
    
    const textoDetalle = `${porcentaje}% del total de beneficiarios`;
    actualizarDetalleIndicadorDashboard('detalleVictimasIndicadores', textoDetalle);
    
    // Cambiar color según porcentaje
    const elemento = document.getElementById('detalleVictimasIndicadores');
    if (elemento) {
        if (porcentaje > 30) elemento.className = 'text-danger';
        else if (porcentaje > 10) elemento.className = 'text-warning';
        else elemento.className = 'text-muted';
    }
}

function actualizarTarjetaPoblacionEtnicaDashboard(total, porcentajeEtnica, totalDiscapacidad, porcentajeDiscapacidad) {
    const totalFormateado = total.toLocaleString('es-CO');
    actualizarTarjetaIndicadorDashboard('poblacionEtnicaDashboard', totalFormateado);
    
    const textoDetalle = `${porcentajeEtnica}% étnicos • ${porcentajeDiscapacidad}% discapacidad`;
    actualizarDetalleIndicadorDashboard('detalleEtnicaIndicadores', textoDetalle);
    
    // Mostrar tooltip con detalles
    const elemento = document.getElementById('detalleEtnicaIndicadores');
    if (elemento) {
        const tooltipText = `Población étnica: ${totalFormateado} (${porcentajeEtnica}%)\n` +
                           `Con discapacidad: ${totalDiscapacidad.toLocaleString('es-CO')} (${porcentajeDiscapacidad}%)`;
        elemento.title = tooltipText;
    }
}

// Funciones auxiliares para indicadores dashboard
function actualizarTarjetaIndicadorDashboard(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        // Para números formateados con separadores
        if (typeof valor === 'string' && valor.includes(',')) {
            elemento.textContent = valor;
        } else {
            const valorActual = parseInt(elemento.textContent.replace(/[.,]/g, '')) || 0;
            const valorNuevo = typeof valor === 'number' ? valor : parseInt(valor) || 0;
            
            if (valorNuevo !== valorActual) {
                animateCountIndicadorDashboard(elemento, valorActual, valorNuevo, 800);
            } else {
                elemento.textContent = valorNuevo.toLocaleString('es-CO');
            }
        }
    }
}

function actualizarDetalleIndicadorDashboard(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = texto;
    }
}

function mostrarCargandoEstadisticasIndicadoresDashboard() {
    const ids = ['totalIndicadoresDashboard', 'totalBeneficiariosDashboard', 
                 'victimasConflictoDashboard', 'poblacionEtnicaDashboard'];
    ids.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = '...';
    });
    
    const detalles = ['detalleTotalIndicadores', 'detalleBeneficiariosIndicadores',
                     'detalleVictimasIndicadores', 'detalleEtnicaIndicadores'];
    detalles.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = 'Calculando estadísticas...';
    });
}

function mostrarErrorEstadisticasIndicadoresDashboard(mensaje) {
    const ids = ['totalIndicadoresDashboard', 'totalBeneficiariosDashboard', 
                 'victimasConflictoDashboard', 'poblacionEtnicaDashboard'];
    ids.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = '0';
    });
    
    const detalles = ['detalleTotalIndicadores', 'detalleBeneficiariosIndicadores',
                     'detalleVictimasIndicadores', 'detalleEtnicaIndicadores'];
    detalles.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = mensaje;
    });
}

// Animación para indicadores
function animateCountIndicadorDashboard(element, start, end, duration) {
    if (start === end) {
        element.textContent = end.toLocaleString('es-CO');
        return;
    }
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = current.toLocaleString('es-CO');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Integración con cargarIndicadores existente
function integrarEstadisticasConIndicadores() {
    if (typeof cargarIndicadores === 'function') {
        const originalCargarIndicadores = cargarIndicadores;
        cargarIndicadores = async function() {
            await originalCargarIndicadores.apply(this, arguments);
            
            // Esperar a que se cargue la tabla y luego cargar estadísticas
            setTimeout(() => {
                if (document.getElementById('totalIndicadoresDashboard')) {
                    cargarEstadisticasIndicadoresDashboard();
                }
            }, 300);
        };
    }
}

// Inicialización cuando cargue la página
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si estamos en la página de indicadores
    const esPaginaIndicadores = 
        window.location.hash === '#indicadores' || 
        document.getElementById('tablaIndicadores') !== null ||
        Array.from(document.querySelectorAll('h5')).some(h => h.textContent && h.textContent.includes('Indicadores'));
    
    if (esPaginaIndicadores) {
        // Integrar con función existente
        integrarEstadisticasConIndicadores();
        
        // Cargar estadísticas después de un tiempo
        setTimeout(() => {
            if (document.getElementById('totalIndicadoresDashboard')) {
                cargarEstadisticasIndicadoresDashboard();
            }
        }, 1000);
    }
});

// Botón para recargar estadísticas (opcional)
document.addEventListener('click', function(e) {
    if (e.target && (e.target.matches('[data-reload-indicadores]') || 
        e.target.closest('[data-reload-indicadores]'))) {
        e.preventDefault();
        cargarEstadisticasIndicadoresDashboard();
        
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

// Función ligera para recalcular y pintar las cards usando datos ya cargados (si existen)
function refrescarCardsIndicadores() {
    try {
        const indicadores = Array.isArray(window.indicadoresTabla) ? window.indicadoresTabla : [];
        if (!indicadores || indicadores.length === 0) return; // no hay datos locales

        // Si la función completa de cálculo existe, reutilizarla (mismo comportamiento)
        if (typeof calcularEstadisticasIndicadoresDashboard === 'function') {
            calcularEstadisticasIndicadoresDashboard(indicadores);
            // Mostrar indicación ligera de que se usó datos locales
            actualizarDetalleIndicadorDashboard('detalleTotalIndicadores', 'Mostrando datos locales');
            return;
        }

        // Fallback: calcularlo aquí (parcial, para garantizar que las tarjetas muestren algo)
        const totalIndicadores = indicadores.length;
        let totalBeneficiarios = 0;
        let programasConDatos = new Set();
        let totalVictimasConflicto = 0;
        let totalPoblacionEtnica = 0;
        let totalDiscapacidad = 0;

        indicadores.forEach(ind => {
            if (ind.cod_programa) programasConDatos.add(String(ind.cod_programa));
            totalBeneficiarios += Number(ind.gran_total) || 0;
            // víctimas (campos posibles)
            totalVictimasConflicto += (
                Number(ind.indig_despl_viol_apr_tot) || 0) +
                (Number(ind.afro_despl_viol_apr_tot) || 0) +
                (Number(ind.despl_viol_apr_tot) || 0) +
                (Number(ind.despl_disc_apr_tot) || 0) +
                (Number(ind.despojo_apr_tot) || 0) +
                (Number(ind.act_grup_arm_apr_tot) || 0) +
                (Number(ind.amenaza_apr_tot) || 0) +
                (Number(ind.del_sex_apr_tot) || 0) +
                (Number(ind.desap_forz_apr_tot) || 0);

            // etnicos
            totalPoblacionEtnica += (
                Number(ind.negro_apr_tot) || 0) +
                (Number(ind.afro_apr_tot) || 0) +
                (Number(ind.palenq_apr_tot) || 0) +
                (Number(ind.raizal_apr_tot) || 0) +
                (Number(ind.indig_apr_tot) || 0);

            // discapacidad
            totalDiscapacidad += (
                Number(ind.discap_apr_tot) || 0) +
                (Number(ind.discap_aud_apr_tot) || 0) +
                (Number(ind.discap_vis_apr_tot) || 0) +
                (Number(ind.discap_fis_apr_tot) || 0) +
                (Number(ind.discap_mult_apr_tot) || 0)
            ;
        });

        const totalProgramas = programasConDatos.size;
        const promedioBeneficiarios = totalProgramas > 0 ? Math.round(totalBeneficiarios / totalProgramas) : 0;
        const porcentajeVictimas = totalBeneficiarios > 0 ? Math.round((totalVictimasConflicto / totalBeneficiarios) * 100) : 0;
        const porcentajeEtnica = totalBeneficiarios > 0 ? Math.round((totalPoblacionEtnica / totalBeneficiarios) * 100) : 0;
        const porcentajeDiscapacidad = totalBeneficiarios > 0 ? Math.round((totalDiscapacidad / totalBeneficiarios) * 100) : 0;

        // Actualizar tarjetas
        if (typeof actualizarTarjetaTotalIndicadores === 'function') actualizarTarjetaTotalIndicadores(totalIndicadores, totalProgramas);
        if (typeof actualizarTarjetaBeneficiariosTotales === 'function') actualizarTarjetaBeneficiariosTotales(totalBeneficiarios, promedioBeneficiarios);
        if (typeof actualizarTarjetaVictimasConflictoDashboard === 'function') actualizarTarjetaVictimasConflictoDashboard(totalVictimasConflicto, porcentajeVictimas);
        if (typeof actualizarTarjetaPoblacionEtnicaDashboard === 'function') actualizarTarjetaPoblacionEtnicaDashboard(totalPoblacionEtnica, porcentajeEtnica, totalDiscapacidad, porcentajeDiscapacidad);

        // Guardar estadísticas para uso futuro
        window.estadisticasIndicadoresDashboard = {
            totalIndicadores,
            totalProgramas,
            totalBeneficiarios,
            promedioBeneficiarios,
            totalVictimasConflicto,
            porcentajeVictimas,
            totalPoblacionEtnica,
            porcentajeEtnica,
            totalDiscapacidad,
            porcentajeDiscapacidad
        };

    } catch (err) {
        console.warn('Error en refrescarCardsIndicadores:', err);
    }
}

// Exportar función para uso externo
window.cargarEstadisticasIndicadoresDashboard = cargarEstadisticasIndicadoresDashboard;
window.refrescarCardsIndicadores = refrescarCardsIndicadores;