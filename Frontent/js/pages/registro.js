/* ================================================
   CARGAR ESTADÍSTICAS DE INDICADORES (CON DATOS REALES)
   ================================================ */

import { registroService } from '../api/registro.service.js';

// Base API por si se necesita fallback con fetch
const API_BASE = 'http://127.0.0.1:8000';

async function cargarEstadisticasIndicadores() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.log('No hay token de autenticación');
        mostrarErrorEstadisticasIndicadores('No autenticado');
        return;
    }

    try {
        // Mostrar estado de carga
        mostrarCargandoEstadisticasIndicadores();

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
            mostrarErrorEstadisticasIndicadores('No hay datos disponibles');
            return;
        }

        // Calcular y mostrar estadísticas REALES
        calcularYMostrarEstadisticasRealesIndicadores(indicadores);

    } catch (error) {
        console.error('Error cargando estadísticas de indicadores:', error);
        mostrarErrorEstadisticasIndicadores('Error cargando datos');
    }
}

/* ==================================================
   CARGAR TABLA DE REGISTROS CALIFICADOS
   ================================================== */

async function cargarRegistrosCalificados() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const tbody = document.getElementById('tablaRegistros');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="10" class="text-center small text-muted">Cargando datos...</td></tr>';

    try {
        // Usar el servicio registroService (usa apiClient.request). Si no existe, usar fetch como fallback
        console.log('Cargando registros calificados (inicio)');
        let data;
        if (typeof registroService !== 'undefined' && registroService.getAllRegistro) {
            data = await registroService.getAllRegistro(1000, 0);
        } else {
            console.warn('registroService no disponible, usando fetch de fallback');
            const url = `${API_BASE}/registro_calificado/registro_calificado/?limit=1000&skip=0`;
            const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'accept': 'application/json' } });
            if (!resp.ok) throw new Error(`Error fetch registro: ${resp.status}`);
            data = await resp.json();
        }
        console.log('Respuesta registros (raw):', data);
        const registros = data.registros || data || [];

        if (!Array.isArray(registros) || registros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center small text-muted">No se encontraron registros</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        // Helper display
        function displayValue(val) {
            if (val === null || val === undefined) return 'Sin registro';
            if (typeof val === 'string' && val.trim() === '') return 'Sin registro';
            return String(val);
        }

        // Intentar obtener nombres de programas desde datosTablaCompleta si existe
        const programasCache = Array.isArray(window.datosTablaCompleta) ? window.datosTablaCompleta : [];

        registros.forEach(r => {
            const tr = document.createElement('tr');

            const prog = programasCache.find(p => Number(p.cod_programa) === Number(r.cod_programa) && String(p.version) === String(r.version));
            const nombrePrograma = prog ? prog.nombre : '';

            const tdNombre = document.createElement('td');
            tdNombre.textContent = nombrePrograma || displayValue(r.cod_programa);

            const tdCodigo = document.createElement('td');
            tdCodigo.textContent = displayValue(r.cod_programa);

            const tdResolucion = document.createElement('td');
            tdResolucion.textContent = displayValue(r.numero_resolucion);

            const tdTipo = document.createElement('td');
            tdTipo.textContent = displayValue(r.tipo_tramite);

            const tdModalidad = document.createElement('td');
            tdModalidad.textContent = displayValue(r.modalidad);

            const tdFechaRes = document.createElement('td');
            tdFechaRes.textContent = r.fecha_resolucion ? (new Date(r.fecha_resolucion)).toLocaleDateString() : '';

            const tdFechaVen = document.createElement('td');
            tdFechaVen.textContent = r.fecha_vencimiento ? (new Date(r.fecha_vencimiento)).toLocaleDateString() : '';

            const tdEstado = document.createElement('td');
            tdEstado.classList.add('text-center');
            tdEstado.textContent = displayValue(r.estado_catalogo);

            // Días restantes
            const tdDias = document.createElement('td');
            tdDias.classList.add('text-center');
            if (r.fecha_vencimiento) {
                const hoy = new Date();
                const venc = new Date(r.fecha_vencimiento);
                const diff = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
                tdDias.textContent = isNaN(diff) ? '' : String(diff);
            } else {
                tdDias.textContent = '';
            }

            // Acciones (ver/editar)
            const tdAcc = document.createElement('td');
            tdAcc.classList.add('text-center');
            const btnVer = document.createElement('button');
            btnVer.className = 'btn btn-sm btn-primary';
            btnVer.textContent = 'Más';
            btnVer.addEventListener('click', async() => {
                btnVer.disabled = true;
                btnVer.textContent = 'Cargando...';
                try {
                    // Intentar obtener detalle desde servicio
                    let detalle = r;
                    try {
                        detalle = await registroService.getRegistro(r.cod_programa, r.version);
                    } catch (e) { /* fallback usa r */ }
                    // Mostrar un modal simple con los datos
                    const contenido = `<div class="modal fade" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Registro: ${displayValue(r.cod_programa)} v${displayValue(r.version)}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><pre style="white-space:pre-wrap;">${JSON.stringify(detalle, null, 2)}</pre></div><div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div></div></div></div>`;
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
                } finally {
                    btnVer.disabled = false;
                    btnVer.textContent = 'Más';
                }
            });
            tdAcc.appendChild(btnVer);

            // Añadir atributos data-* para permitir filtros robustos
            tr.dataset.codigo = (r.cod_programa || '').toString();
            tr.dataset.tipoTramite = (r.tipo_tramite || '').toString().toLowerCase();
            tr.dataset.modalidad = (r.modalidad || '').toString().toLowerCase();
            tr.dataset.estadoCatalogo = (r.estado_catalogo || '').toString().toLowerCase();
            tr.dataset.clasificacion = (r.clasificacion || '').toString().toLowerCase();
            tr.dataset.fechaVencimiento = r.fecha_vencimiento || '';

            tr.append(tdNombre, tdCodigo, tdResolucion, tdTipo, tdModalidad, tdFechaRes, tdFechaVen, tdEstado, tdDias, tdAcc);
            tbody.appendChild(tr);
        });

        // Actualizar contador en la barra lateral
        const contador = document.getElementById('contadorRegistros');
        if (contador) contador.textContent = String(registros.length);

        // Cargar opciones de filtros y aplicar filtros si hay valores
        try { if (typeof cargarOpcionesFiltrosRegistros === 'function') cargarOpcionesFiltrosRegistros(registros); } catch (e) { /* no-op */ }
        setTimeout(() => { try { if (typeof aplicarFiltrosRegistros === 'function') aplicarFiltrosRegistros(); } catch (e) { /* no-op */ } }, 50);

        // Guardar copia en memoria para usos offline
        try { window.datosRegistros = registros; } catch (e) { /* no-op */ }
        // Actualizar estadísticas (cards) con los datos locales
        setTimeout(() => { try { if (typeof cargarEstadisticasRegistrosDashboard === 'function') cargarEstadisticasRegistrosDashboard(); } catch (e) { /* no-op */ } }, 150);

    } catch (err) {
        console.error('Error cargando registros calificados:', err);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center small text-danger">Error al cargar datos: ${err.message || err}</td></tr>`;
        try { if (typeof mostrarErrorEstadisticasRegistros === 'function') mostrarErrorEstadisticasRegistros('Error cargando datos'); } catch (e) { /* no-op */ }
    }
}

// Exponer globalmente para que el HTML pueda invocarla
try { window.cargarRegistrosCalificados = cargarRegistrosCalificados; } catch (e) { /* no-op */ }

// Inicializar al cargar la vista de registro
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.hash === '#registro' || document.getElementById('tablaRegistros')) {
        setTimeout(() => { cargarRegistrosCalificados(); }, 200);
        // Intentar cargar estadísticas locales si la tabla ya está presente
        setTimeout(() => { try { if (typeof cargarEstadisticasRegistrosDashboard === 'function') cargarEstadisticasRegistrosDashboard(); } catch (e) { /* no-op */ } }, 500);
    }
});

function calcularYMostrarEstadisticasRealesIndicadores(indicadores) {
    let totalBeneficiarios = 0;
    let totalVictimasConflicto = 0;
    let totalPoblacionEtnica = 0;
    let totalDiscapacidad = 0;

    let programasConDatos = 0;
    let totalGranTotal = 0;

    // Calcular por cada indicador
    indicadores.forEach(ind => {
        // 1. Beneficiarios totales (gran_total)
        const granTotal = ind.gran_total ? parseInt(ind.gran_total) : 0;
        totalBeneficiarios += granTotal;
        totalGranTotal += granTotal;

        // 2. Víctimas del conflicto (suma de varios campos)
        const victimas =
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
            (ind.reclut_forz_apr_tot || 0);

        totalVictimasConflicto += victimas;

        // 3. Población étnica (suma de campos étnicos)
        const etnicos =
            (ind.negro_apr_tot || 0) +
            (ind.afro_apr_tot || 0) +
            (ind.palenq_apr_tot || 0) +
            (ind.raizal_apr_tot || 0) +
            (ind.indig_apr_tot || 0);

        totalPoblacionEtnica += etnicos;

        // 4. Discapacidad (suma de todos los tipos)
        const discapacidad =
            (ind.discap_apr_tot || 0) +
            (ind.discap_aud_apr_tot || 0) +
            (ind.discap_vis_apr_tot || 0) +
            (ind.discap_fis_apr_tot || 0) +
            (ind.discap_int_apr_tot || 0) +
            (ind.discap_psico_apr_tot || 0) +
            (ind.discap_mult_apr_tot || 0) +
            (ind.sordoceg_apr_tot || 0);

        totalDiscapacidad += discapacidad;

        // Contar programas que tienen datos
        if (granTotal > 0 || victimas > 0 || etnicos > 0 || discapacidad > 0) {
            programasConDatos++;
        }
    });

    // Calcular porcentajes
    const totalIndicadores = indicadores.length;
    const porcentajeProgramasConDatos = totalIndicadores > 0 ?
        Math.round((programasConDatos / totalIndicadores) * 100) :
        0;

    const promedioBeneficiariosPorPrograma = programasConDatos > 0 ?
        Math.round(totalBeneficiarios / programasConDatos) :
        0;

    // Calcular otros grupos vulnerables
    let otrosVulnerables = 0;
    indicadores.forEach(ind => {
        otrosVulnerables +=
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
            (ind.camp_tot || 0);
    });

    // Calcular sin categoría específica
    const sinCategoria = indicadores.reduce((sum, ind) => {
        return sum + (ind.ning_tot || 0);
    }, 0);

    // Actualizar las tarjetas con datos REALES
    actualizarTarjetaTotalBeneficiarios(totalBeneficiarios, promedioBeneficiariosPorPrograma);
    actualizarTarjetaVictimasConflicto(totalVictimasConflicto, porcentajeProgramasConDatos);
    actualizarTarjetaPoblacionEtnica(totalPoblacionEtnica, otrosVulnerables);
    actualizarTarjetaDiscapacidad(totalDiscapacidad, sinCategoria);

    // Guardar estadísticas para gráficos o detalles
    window.estadisticasIndicadoresDetalladas = {
        totalIndicadores,
        totalBeneficiarios,
        totalVictimasConflicto,
        totalPoblacionEtnica,
        totalDiscapacidad,
        otrosVulnerables,
        sinCategoria,
        programasConDatos,
        porcentajeProgramasConDatos,
        promedioBeneficiariosPorPrograma,
        distribucion: {
            victimas: totalVictimasConflicto,
            etnicos: totalPoblacionEtnica,
            discapacidad: totalDiscapacidad,
            otros: otrosVulnerables,
            sinCategoria: sinCategoria
        }
    };

    // Opcional: Mostrar resumen en consola
    console.log('Estadísticas de Indicadores:', window.estadisticasIndicadoresDetalladas);
}

// Funciones específicas para cada tarjeta con datos REALES
function actualizarTarjetaTotalBeneficiarios(total, promedio) {
    // Formatear número grande con separadores de miles
    const totalFormateado = total.toLocaleString('es-CO');
    actualizarTarjetaIndicador('totalBeneficiarios', totalFormateado);

    const textoDetalle = `Promedio: ${promedio.toLocaleString('es-CO')} por programa`;
    actualizarDetalleIndicador('detalleTotalBeneficiarios', textoDetalle);

    // Cambiar color según cantidad
    const elemento = document.getElementById('detalleTotalBeneficiarios');
    if (elemento && total > 0) {
        if (total > 1000) elemento.className = 'text-success';
        else if (total > 100) elemento.className = 'text-warning';
    }
}

function actualizarTarjetaVictimasConflicto(total, porcentaje) {
    const totalFormateado = total.toLocaleString('es-CO');
    actualizarTarjetaIndicador('victimasConflicto', totalFormateado);

    const textoDetalle = `${porcentaje}% de programas registran víctimas`;
    actualizarDetalleIndicador('detalleVictimas', textoDetalle);

    // Cambiar color según porcentaje
    const elemento = document.getElementById('detalleVictimas');
    if (elemento) {
        if (porcentaje > 70) elemento.className = 'text-danger';
        else if (porcentaje > 30) elemento.className = 'text-warning';
        else elemento.className = 'text-muted';
    }
}

function actualizarTarjetaPoblacionEtnica(total, otrosVulnerables) {
    const totalFormateado = total.toLocaleString('es-CO');
    actualizarTarjetaIndicador('poblacionEtnica', totalFormateado);

    const textoDetalle = `+${otrosVulnerables.toLocaleString('es-CO')} otros grupos`;
    actualizarDetalleIndicador('detalleEtnica', textoDetalle);
}

function actualizarTarjetaDiscapacidad(total, sinCategoria) {
    const totalFormateado = total.toLocaleString('es-CO');
    actualizarTarjetaIndicador('conDiscapacidad', totalFormateado);

    const textoDetalle = `${sinCategoria.toLocaleString('es-CO')} sin categoría específica`;
    actualizarDetalleIndicador('detalleDiscapacidad', textoDetalle);
}

// Funciones auxiliares mejoradas
function actualizarTarjetaIndicador(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        // Para números formateados con separadores, extraer solo el número
        const valorActualTexto = elemento.textContent.replace(/[.,]/g, '');
        const valorActual = parseInt(valorActualTexto) || 0;

        // Si el valor es un string formateado, comparar sin formato
        const valorNuevoTexto = typeof valor === 'string' ? valor.replace(/[.,]/g, '') : valor.toString();
        const valorNuevo = parseInt(valorNuevoTexto) || 0;

        if (valorNuevo !== valorActual) {
            // Animación solo si son números
            if (!isNaN(valorActual) && !isNaN(valorNuevo)) {
                animateCount(elemento, valorActual, valorNuevo, 800, true);
            } else {
                elemento.textContent = valor;
            }
        } else {
            elemento.textContent = valor;
        }
    }
}

function actualizarDetalleIndicador(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = texto;
        elemento.title = texto;
    }
}

// Animación mejorada que maneja números grandes
function animateCount(element, start, end, duration, format = false) {
    if (start === end) {
        element.textContent = format ? end.toLocaleString('es-CO') : end;
        return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);

        element.textContent = format ? current.toLocaleString('es-CO') : current;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function mostrarCargandoEstadisticasIndicadores() {
    const ids = ['totalBeneficiarios', 'victimasConflicto', 'poblacionEtnica', 'conDiscapacidad'];
    ids.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = '..    .';
    });

    const detalles = ['detalleTotalBeneficiarios', 'detalleVictimas', 'detalleEtnica', 'detalleDiscapacidad'];
    detalles.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = 'Calculando estadísticas...';
    });
}

function mostrarErrorEstadisticasIndicadores(mensaje) {
    const ids = ['totalBeneficiarios', 'victimasConflicto', 'poblacionEtnica', 'conDiscapacidad'];
    ids.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = '0';
    });

    const detalles = ['detalleTotalBeneficiarios', 'detalleVictimas', 'detalleEtnica', 'detalleDiscapacidad'];
    detalles.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = mensaje;
    });
}

// Inicializar cuando cargue la página
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si estamos en la página de indicadores
    const esPaginaIndicadores =
        window.location.hash === '#indicadores' ||
        document.getElementById('tablaIndicadores') !== null ||
        Array.from(document.querySelectorAll('h5')).some(h => h.textContent && h.textContent.includes('Indicadores'));

    if (esPaginaIndicadores) {
        // Cargar estadísticas cuando se cargue la tabla
        setTimeout(() => {
            cargarEstadisticasIndicadores();
        }, 1000);

        // Integrar con cargarIndicadores existente
        if (typeof cargarIndicadores === 'function') {
            const originalCargarIndicadores = cargarIndicadores;
            cargarIndicadores = async function() {
                await originalCargarIndicadores.apply(this, arguments);
                // Esperar un poco para que se renderice la tabla
                setTimeout(cargarEstadisticasIndicadores, 300);
            };
        }
    }
});

// React to view:loaded so we initialise when loadView injects registro.html
document.addEventListener('view:loaded', (e) => {
    try {
        const path = (e && e.detail && e.detail.viewPath) || '';
        if (path.endsWith('registro.html')) {
            // small delay to allow DOM to be attached
            setTimeout(() => {
                try { cargarRegistrosCalificados(); } catch (err) { console.warn('No se pudo cargar registros tras view:loaded:', err); }
            }, 100);
        }
    } catch (err) { console.warn('view:loaded handler(registro) failed:', err); }
});

// Botón para recargar estadísticas (opcional)
document.addEventListener('click', function(e) {
    if (e.target && e.target.closest('[data-reload-estadisticas]')) {
        e.preventDefault();
        cargarEstadisticasIndicadores();
        // Mostrar feedback
        const btn = e.target.closest('button');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-arrow-clockwise animate-spin"></i> Actualizando...';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 1500);
        }
    }
});

// Exportar funciones
// -------------------------
// FILTROS: funciones expuestas (mínimas, consistentes con otras páginas)
// -------------------------
function aplicarFiltrosRegistros() {
    const filtroCodigoEl = document.getElementById('filtroCodigoRegistro');
    const filtroTipoEl = document.getElementById('filtroTipoTramite');
    const filtroModalidadEl = document.getElementById('filtroModalidad');
    const filtroEstadoEl = document.getElementById('filtroEstadoCatalogo');
    const filtroClasificacionEl = document.getElementById('filtroClasificacion');
    const fechaDesdeEl = document.getElementById('filtroFechaDesde');
    const fechaHastaEl = document.getElementById('filtroFechaHasta');

    const filtroCodigo = (filtroCodigoEl && filtroCodigoEl.value || '').toLowerCase().trim();
    const filtroTipo = (filtroTipoEl && filtroTipoEl.value || '').toLowerCase().trim();
    const filtroModalidad = (filtroModalidadEl && filtroModalidadEl.value || '').toLowerCase().trim();
    const filtroEstado = (filtroEstadoEl && filtroEstadoEl.value || '').toLowerCase().trim();
    const filtroClasificacion = (filtroClasificacionEl && filtroClasificacionEl.value || '').toLowerCase().trim();
    const fechaDesde = (fechaDesdeEl && fechaDesdeEl.value) || '';
    const fechaHasta = (fechaHastaEl && fechaHastaEl.value) || '';

    const tbody = document.getElementById('tablaRegistros');
    if (!tbody) return;

    const filas = Array.from(tbody.querySelectorAll('tr')).filter(r => r.cells && r.cells.length >= 9 && !r.classList.contains('no-results-registros') && !r.querySelector('.text-danger'));
    let visibles = 0;
    const total = filas.length;

    filas.forEach(fila => {
        const c = fila.cells;
        const codigo = (fila.dataset.codigo || (c[1] ? c[1].textContent : '')).toLowerCase().trim();
        const nombre = (c[0] ? c[0].textContent : '').toLowerCase().trim();
        const tipo = (fila.dataset.tipoTramite || (c[3] ? c[3].textContent : '')).toLowerCase().trim();
        const modalidad = (fila.dataset.modalidad || (c[4] ? c[4].textContent : '')).toLowerCase().trim();
        const estado = (fila.dataset.estadoCatalogo || (c[7] ? c[7].textContent : '')).toLowerCase().trim();
        const clasificacion = (fila.dataset.clasificacion || '').toLowerCase().trim();
        const fechaVenc = fila.dataset.fechaVencimiento || '';

        let pasa = true;
        if (filtroCodigo && !(codigo.includes(filtroCodigo) || nombre.includes(filtroCodigo))) pasa = false;
        if (filtroTipo && !tipo.includes(filtroTipo)) pasa = false;
        if (filtroModalidad && !modalidad.includes(filtroModalidad)) pasa = false;
        if (filtroEstado && !estado.includes(filtroEstado)) pasa = false;
        if (filtroClasificacion && !clasificacion.includes(filtroClasificacion)) pasa = false;

        if ((fechaDesde || fechaHasta) && fechaVenc) {
            try {
                const fV = new Date(fechaVenc);
                if (fechaDesde) {
                    const fd = new Date(fechaDesde);
                    if (fV < fd) pasa = false;
                }
                if (fechaHasta) {
                    const fh = new Date(fechaHasta);
                    if (fV > fh) pasa = false;
                }
            } catch (e) { /* ignore */ }
        } else if ((fechaDesde || fechaHasta) && !fechaVenc) {
            pasa = false;
        }

        fila.style.display = pasa ? '' : 'none';
        if (pasa) visibles++;
    });

    const existing = tbody.querySelector('.no-results-registros');
    if (visibles === 0 && total > 0) {
        if (!existing) {
            const tr = document.createElement('tr');
            tr.className = 'no-results-registros';
            tr.innerHTML = `<td colspan="10" class="text-center small text-danger">No se encontraron registros que coincidan con los filtros.</td>`;
            tbody.appendChild(tr);
        }
    } else if (existing) {
        existing.remove();
    }

    const contador = document.getElementById('contadorRegistros');
    if (contador) {
        contador.innerHTML = `Mostrando <span class="fw-bold">${visibles}</span> de <span class="fw-bold">${total}</span>`;
        if (visibles === 0 && total > 0) contador.className = 'text-danger';
        else if (visibles === total) contador.className = 'text-success';
        else contador.className = 'text-muted';
    }

    // Actualizar estadísticas en las cards según filas visibles (fallback local)
    try {
        const tbody2 = document.getElementById('tablaRegistros');
        if (tbody2) {
            const visiblesRows = Array.from(tbody2.querySelectorAll('tr')).filter(r => r.style.display !== 'none' && !r.classList.contains('no-results-registros') && !r.querySelector('.text-danger'));
            const datosVisibles = visiblesRows.map(r => ({ estado_catalogo: r.dataset.estadoCatalogo || (r.cells[7] ? r.cells[7].textContent : ''), fecha_vencimiento: r.dataset.fechaVencimiento || (r.cells[6] ? r.cells[6].textContent : '') }));
            const statsVis = calcularEstadisticasRegistrosDashboard(datosVisibles);
            const elTotal2 = document.getElementById('totalRegistros');
            if (elTotal2) elTotal2.textContent = String(statsVis.total);
            const elAprob2 = document.getElementById('registrosAprobados');
            if (elAprob2) elAprob2.textContent = String(statsVis.aprobados);
            const elVenc2 = document.getElementById('registrosPorVencer');
            if (elVenc2) elVenc2.textContent = String(statsVis.porVencer);
            const detAprob2 = document.getElementById('porcentajeAprobados') || document.getElementById('detalleAprobados');
            if (detAprob2) detAprob2.textContent = `${statsVis.aprobados} aprobados`;
            const detVenc2 = document.getElementById('detallePorVencer');
            if (detVenc2) detVenc2.textContent = `${statsVis.porVencer} por vencer en 30 días`;
        }
    } catch (e) { /* no-op */ }

    // Actualizar badge de filtros activos
    try {
        const badge = document.getElementById('badgeFiltrosRegistros');
        if (badge) {
            let count = 0;
            if (filtroCodigo) count++;
            if (filtroTipo) count++;
            if (filtroModalidad) count++;
            if (filtroEstado) count++;
            if (filtroClasificacion) count++;
            if (fechaDesde || fechaHasta) count++;
            badge.innerHTML = `<i class="bi bi-funnel me-1"></i>${count} filtros activos`;
            badge.className = count > 0 ? 'badge bg-primary bg-opacity-10 text-primary' : 'badge bg-light text-dark border px-3 py-1';
        }
    } catch (e) { /* no-op */ }
}

function limpiarFiltrosRegistros() {
    ['filtroCodigoRegistro', 'filtroTipoTramite', 'filtroModalidad', 'filtroEstadoCatalogo', 'filtroClasificacion', 'filtroFechaDesde', 'filtroFechaHasta'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    aplicarFiltrosRegistros();
}

function cargarOpcionesFiltrosRegistros(datos) {
    if (!Array.isArray(datos) || datos.length === 0) return;
    const tipos = new Set();
    const modalidades = new Set();
    const estados = new Set();
    const clases = new Set();
    datos.forEach(r => { if (r.tipo_tramite) tipos.add(r.tipo_tramite.toString()); if (r.modalidad) modalidades.add(r.modalidad.toString()); if (r.estado_catalogo) estados.add(r.estado_catalogo.toString()); if (r.clasificacion) clases.add(r.clasificacion.toString()); });
    const selTipo = document.getElementById('filtroTipoTramite');
    if (selTipo) {
        const existentes = Array.from(selTipo.options).map(o => o.value);
        Array.from(tipos).sort().forEach(t => {
            const v = t.toLowerCase();
            if (!existentes.includes(v)) {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = t;
                selTipo.appendChild(opt);
            }
        });
    }
    const selModal = document.getElementById('filtroModalidad');
    if (selModal) {
        const existentes = Array.from(selModal.options).map(o => o.value);
        Array.from(modalidades).sort().forEach(m => {
            const v = m.toLowerCase();
            if (!existentes.includes(v)) {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = m;
                selModal.appendChild(opt);
            }
        });
    }
    const selEstado = document.getElementById('filtroEstadoCatalogo');
    if (selEstado) {
        const existentes = Array.from(selEstado.options).map(o => o.value);
        Array.from(estados).sort().forEach(s => {
            const v = s.toLowerCase();
            if (!existentes.includes(v)) {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = s;
                selEstado.appendChild(opt);
            }
        });
    }
    const selClas = document.getElementById('filtroClasificacion');
    if (selClas) {
        const existentes = Array.from(selClas.options).map(o => o.value);
        Array.from(clases).sort().forEach(c => {
            const v = c.toLowerCase();
            if (!existentes.includes(v)) {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = c;
                selClas.appendChild(opt);
            }
        });
    }

    // Exponer funciones y manteners compatibilidad con otras páginas
    window.cargarEstadisticasIndicadores = cargarEstadisticasIndicadores;
    window.aplicarFiltrosRegistros = aplicarFiltrosRegistros;
    window.limpiarFiltrosRegistros = limpiarFiltrosRegistros;
    window.cargarOpcionesFiltrosRegistros = cargarOpcionesFiltrosRegistros;

    function actualizarContadorRegistros(visibles, total) {
        const contador = document.getElementById('contadorRegistros');
        if (contador) {
            contador.textContent = `Mostrando ${visibles} de ${total}`;
            if (visibles === 0 && total > 0) contador.className = 'text-danger';
            else if (visibles === total) contador.className = 'text-success';
            else contador.className = 'text-muted';
        }
    }
    window.actualizarContadorRegistros = actualizarContadorRegistros;

    // -------------------------
    // ESTADÍSTICAS / CARDS para REGISTROS
    // -------------------------
    function mostrarCargandoEstadisticasRegistros() {
        const ids = ['totalRegistros', 'registrosAprobados', 'registrosPorVencer'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '...'; });
        const detalles = ['detalleTotalRegistros', 'detalleAprobados', 'detallePorVencer'];
        detalles.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = 'Calculando estadísticas...'; });
    }

    function mostrarErrorEstadisticasRegistros(msg) {
        const ids = ['totalRegistros', 'registrosAprobados', 'registrosPorVencer'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '0'; });
        const detalles = ['detalleTotalRegistros', 'detalleAprobados', 'detallePorVencer'];
        detalles.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = msg || 'No hay datos'; });
    }

    function calcularEstadisticasRegistrosDashboard(datos) {
        if (!Array.isArray(datos)) return { total: 0, aprobados: 0, porVencer: 0 };
        const total = datos.length;
        const aprobados = datos.filter(r => (r.estado_catalogo || '').toString().toLowerCase().includes('aprob')).length;
        const hoy = new Date();
        const porVencer = datos.filter(r => {
            if (!r.fecha_vencimiento) return false;
            const v = new Date(r.fecha_vencimiento);
            const diff = Math.ceil((v - hoy) / (1000 * 60 * 60 * 24));
            return diff >= 0 && diff <= 30; // por vencer en 30 días
        }).length;
        return { total, aprobados, porVencer };
    }

    async function cargarEstadisticasRegistrosDashboard() {
        try {
            mostrarCargandoEstadisticasRegistros();

            let datos = Array.isArray(window.datosRegistros) ? window.datosRegistros : null;
            if (!datos) {
                // intentar reconstruir desde DOM
                const tbody = document.getElementById('tablaRegistros');
                if (tbody) {
                    const rows = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.classList.contains('no-results-registros') && !r.querySelector('.text-danger'));
                    datos = rows.map(r => ({
                        estado_catalogo: r.dataset.estadoCatalogo || (r.cells[7] ? r.cells[7].textContent : ''),
                        fecha_vencimiento: r.dataset.fechaVencimiento || (r.cells[6] ? r.cells[6].textContent : '')
                    }));
                }
            }

            if (!Array.isArray(datos) || datos.length === 0) {
                mostrarErrorEstadisticasRegistros('No hay datos locales');
                return;
            }

            const stats = calcularEstadisticasRegistrosDashboard(datos);
            const elTotal = document.getElementById('totalRegistros');
            if (elTotal) elTotal.textContent = String(stats.total);
            const elAprob = document.getElementById('registrosAprobados');
            if (elAprob) elAprob.textContent = String(stats.aprobados);
            const elVenc = document.getElementById('registrosPorVencer');
            if (elVenc) elVenc.textContent = String(stats.porVencer);

            const detTotal = document.getElementById('detalleTotalRegistros');
            if (detTotal) detTotal.textContent = `Mostrando ${stats.total} registros`;
            const detAprob = document.getElementById('porcentajeAprobados') || document.getElementById('detalleAprobados');
            if (detAprob) detAprob.textContent = `${stats.aprobados} aprobados`;
            const detVenc = document.getElementById('detallePorVencer');
            if (detVenc) detVenc.textContent = `${stats.porVencer} por vencer en 30 días`;

        } catch (err) {
            console.warn('Error cargando estadísticas registros (local):', err);
            mostrarErrorEstadisticasRegistros('Error calculando estadísticas');
        }
    }

    window.cargarEstadisticasRegistrosDashboard = cargarEstadisticasRegistrosDashboard;
}