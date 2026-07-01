// js/pages/graficas.js - DASHBOARD CON COMPARATIVA DE VERSIONES
console.log('🚀 graficas.js INICIADO - COMPARATIVA DE VERSIONES');

// Variables globales para las gráficas
let chartTotales = null;
let chartDistribucion = null;
let chartEtnicos = null;
let chartTendencias = null;
let chartComparativaVersiones = null;
let chartCrecimiento = null;
let chartCategorias = null;
let chartTendenciasDetalladas = null;

// 🔥 URL BASE DE TU API (PUERTO 8000)
const API_BASE_URL = 'http://127.0.0.1:8000';

// ==================== FUNCIONES DE API ====================
async function apiRequest(endpoint, options = {}) {
    try {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem('access_token');
        
        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        const response = await fetch(url, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.warn('⚠️ No autorizado - Token inválido o expirado');
                return null;
            }
            if (response.status === 404) {
                console.warn(`⚠️ Endpoint no encontrado: ${url}`);
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error(`❌ Error en API request ${endpoint}:`, error.message);
        return null;
    }
}

// ==================== INICIALIZACIÓN PRINCIPAL ====================
async function initGraficas() {
    console.log('🔧 Inicializando dashboard de comparativa...');
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js no disponible');
        mostrarError('Chart.js no está cargado. Recarga la página.');
        return;
    }
    
    // Esperar DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarCompleto);
    } else {
        setTimeout(inicializarCompleto, 100);
    }
}

async function inicializarCompleto() {
    console.log('🎯 Inicializando comparativa de versiones...');
    
    try {
        // 1. Destruir gráficas anteriores
        destruirTodasLasGraficas();
        
        // 2. Crear gráfica de bienvenida
        crearGraficaBienvenida();
        
        // 3. Cargar programas con sus versiones
        await cargarProgramasConVersiones();
        
        // 4. Configurar eventos
        configurarEventos();
        
        console.log('✅ Dashboard de comparativa listo');
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        mostrarError('Error al inicializar el dashboard: ' + error.message);
    }
}

// ==================== CARGAR PROGRAMAS CON VERSIONES ====================
async function cargarProgramasConVersiones() {
    console.log('📋 Cargando programas con sus versiones...');
    
    const select = document.getElementById('selectPrograma');
    if (!select) return;
    
    try {
        select.innerHTML = '<option value="">Cargando programas SENA...</option>';
        
        // 🔥 PASO 1: Cargar TODOS los indicadores para extraer programas y versiones
        console.log('📊 Extrayendo programas y versiones desde indicadores...');
        const indicadores = await apiRequest('/indicadores_programa/');
        
        if (!indicadores || indicadores.length === 0) {
            console.error('❌ No se encontraron indicadores');
            select.innerHTML = '<option value="">No hay datos disponibles</option>';
            return;
        }
        
        // 🔥 PASO 2: Organizar programas por código, con sus versiones
        const programasMap = new Map();
        
        indicadores.forEach(ind => {
            const codPrograma = ind.cod_programa;
            const version = ind.version;
            const nombrePrograma = ind.nombre_programa || `Programa ${codPrograma}`;
            
            if (!programasMap.has(codPrograma)) {
                programasMap.set(codPrograma, {
                    cod_programa: codPrograma,
                    nombre: nombrePrograma,
                    versiones: new Set(),
                    totalFichas: 0
                });
            }
            
            const programa = programasMap.get(codPrograma);
            programa.versiones.add(version);
            programa.totalFichas++;
            
            // Actualizar nombre si encontramos uno mejor
            if (nombrePrograma && nombrePrograma !== `Programa ${codPrograma}`) {
                programa.nombre = nombrePrograma;
            }
        });
        
        // 🔥 PASO 3: Convertir a array y ordenar
        const programasArray = Array.from(programasMap.values())
            .sort((a, b) => (a.cod_programa || 0) - (b.cod_programa || 0));
        
        console.log(`✅ ${programasArray.length} programas encontrados con versiones`);
        
        // 🔥 PASO 4: Llenar el select
        select.innerHTML = '<option value="">Selecciona un programa</option>';
        
        programasArray.forEach(programa => {
            const versionesArray = Array.from(programa.versiones).sort();
            const tieneMultiplesVersiones = versionesArray.length > 1;
            
            const option = document.createElement('option');
            option.value = programa.cod_programa;
            option.textContent = `${programa.cod_programa} - ${programa.nombre}`;
            
            // Agregar badge si tiene múltiples versiones
            if (tieneMultiplesVersiones) {
                option.textContent += ` (${versionesArray.length} versiones)`;
                option.dataset.versiones = versionesArray.join(',');
                option.dataset.nombre = programa.nombre;
            }
            
            select.appendChild(option);
        });
        
        console.log('✅ Programas cargados con información de versiones');
        
    } catch (error) {
        console.error('❌ Error cargando programas:', error);
        select.innerHTML = '<option value="">Error al cargar programas</option>';
        mostrarError('Error al cargar la lista de programas: ' + error.message);
    }
}

// ==================== CARGAR DATOS CON COMPARATIVA ====================
async function cargarDatosReales(codPrograma, versionEspecifica = null) {
    console.log(`📊 Cargando datos para programa ${codPrograma}${versionEspecifica ? ` v${versionEspecifica}` : ''}...`);
    
    const btnCargar = document.getElementById('btnCargar');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const programaOption = document.querySelector(`#selectPrograma option[value="${codPrograma}"]`);
    const programaNombre = programaOption ? programaOption.textContent.split(' - ')[1] || `Programa ${codPrograma}` : `Programa ${codPrograma}`;
    
    if (!btnCargar) return;
    
    // Mostrar loading
    const originalText = btnCargar.innerHTML;
    btnCargar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Analizando...';
    btnCargar.disabled = true;
    
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
    
    try {
        console.log(`🌐 Cargando datos para: ${programaNombre}`);
        
        // 🔥 PASO 1: Obtener TODOS los indicadores del programa
        console.log('📋 Obteniendo todos los indicadores del programa...');
        const urlIndicadores = `/indicadores_programa/programa/${codPrograma}`;
        const indicadoresCompletos = await apiRequest(urlIndicadores);
        
        if (!indicadoresCompletos || indicadoresCompletos.length === 0) {
            throw new Error('Este programa no tiene datos de indicadores registrados');
        }
        
        console.log(`✅ ${indicadoresCompletos.length} indicadores obtenidos`);
        
        // 🔥 PASO 2: Separar por versión
        const indicadoresPorVersion = {};
        indicadoresCompletos.forEach(ind => {
            const version = ind.version;
            if (!indicadoresPorVersion[version]) {
                indicadoresPorVersion[version] = [];
            }
            indicadoresPorVersion[version].push(ind);
        });
        
        const versiones = Object.keys(indicadoresPorVersion).sort();
        console.log(`📊 Versiones encontradas: ${versiones.join(', ')}`);
        
        // 🔥 PASO 3: Mostrar información del programa
        mostrarInformacionPrograma(codPrograma, programaNombre, versiones);
        
        // 🔥 PASO 4: Procesar según si se seleccionó versión específica o todas
        if (versionEspecifica) {
            // Cargar solo la versión específica
            await procesarVersionEspecifica(codPrograma, versionEspecifica, indicadoresPorVersion[versionEspecifica], programaNombre);
        } else {
            // Cargar comparativa de todas las versiones
            await procesarComparativaVersiones(codPrograma, indicadoresPorVersion, programaNombre);
        }
        
        console.log('🎉 Análisis completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        mostrarError(`Error: ${error.message}`);
    } finally {
        // Restaurar botón
        btnCargar.innerHTML = originalText;
        btnCargar.disabled = false;
        
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
    }
}

// ==================== PROCESAR VERSIÓN ESPECÍFICA ====================
async function procesarVersionEspecifica(codPrograma, version, indicadores, programaNombre) {
    console.log(`📊 Procesando versión específica ${version}...`);
    
    if (!indicadores || indicadores.length === 0) {
        throw new Error(`La versión ${version} no tiene datos`);
    }
    
    // 1. Calcular estadísticas de esta versión
    const estadisticas = calcularEstadisticas(indicadores);
    estadisticas.version = version;
    
    if (!estadisticas.gran_total || estadisticas.gran_total === 0) {
        throw new Error(`La versión ${version} no tiene participantes registrados`);
    }
    
    console.log(`✅ Versión ${version}: ${estadisticas.gran_total} participantes en ${estadisticas.total_fichas} fichas`);
    
    // 2. Destruir gráficas anteriores
    destruirTodasLasGraficas();
    
    // 3. Crear gráficas para esta versión
    crearGraficaTotalesReales(estadisticas, programaNombre, version);
    
    if (estadisticas.total_indigenas > 0 || estadisticas.total_afrodescendientes > 0 || estadisticas.total_negros > 0) {
        crearGraficaGruposEtnicos(estadisticas, version);
    }
    
    const distribucion = calcularDistribucion(estadisticas);
    if (distribucion.distribucion) {
        crearGraficaDistribucion(distribucion, `${programaNombre} - v${version}`);
    }
    
    crearGraficaAnalisisCategorias(estadisticas, version);
    
    // 4. Actualizar UI
    actualizarTarjetasResumen(estadisticas, version);
    actualizarTablaDatos(indicadores, version);
    
    // 5. Mostrar secciones
    mostrarSeccionesPrincipales();
    
    // 6. Mostrar éxito
    mostrarMensajeExito(`✅ Versión ${version} cargada: ${estadisticas.gran_total} participantes`);
}

// ==================== PROCESAR COMPARATIVA DE VERSIONES ====================
async function procesarComparativaVersiones(codPrograma, indicadoresPorVersion, programaNombre) {
    console.log('📊 Procesando comparativa de versiones...');
    
    const versiones = Object.keys(indicadoresPorVersion).sort();
    
    if (versiones.length === 0) {
        throw new Error('No hay versiones para comparar');
    }
    
    // 1. Calcular estadísticas por versión
    const estadisticasPorVersion = {};
    const comparativaData = [];
    
    for (const version of versiones) {
        const indicadores = indicadoresPorVersion[version];
        const estadisticas = calcularEstadisticas(indicadores);
        estadisticas.version = version;
        
        estadisticasPorVersion[version] = estadisticas;
        comparativaData.push({
            version: version,
            estadisticas: estadisticas,
            indicadores: indicadores
        });
        
        console.log(`📋 v${version}: ${estadisticas.gran_total} participantes, ${estadisticas.total_fichas} fichas`);
    }
    
    // 2. Destruir gráficas anteriores
    destruirTodasLasGraficas();
    
    // 3. Si solo hay una versión, mostrar normalmente
    if (versiones.length === 1) {
        const version = versiones[0];
        const estadisticas = estadisticasPorVersion[version];
        const indicadores = indicadoresPorVersion[version];
        
        crearGraficaTotalesReales(estadisticas, programaNombre, version);
        
        if (estadisticas.total_indigenas > 0 || estadisticas.total_afrodescendientes > 0) {
            crearGraficaGruposEtnicos(estadisticas, version);
        }
        
        actualizarTarjetasResumen(estadisticas, version);
        actualizarTablaDatos(indicadores, version);
        
        
    } else {
        // 4. Si hay múltiples versiones, crear comparativa
        console.log('📈 Creando gráficas de comparativa...');
        
        // Gráfica de comparativa de versiones
        crearGraficaComparativaVersiones(estadisticasPorVersion, programaNombre);
        
        // Gráfica de crecimiento
        crearGraficaCrecimientoVersiones(estadisticasPorVersion);
        
        // Gráfica de tendencias
        crearGraficaTendenciasVersiones(estadisticasPorVersion, programaNombre);
        
        // Gráfica de tendencias detalladas (grupos étnicos)
        crearGraficaTendenciasDetalladas(estadisticasPorVersion);
        
        // Actualizar tabla comparativa
        actualizarTablaComparativa(estadisticasPorVersion);
        
        // Mostrar resumen de la versión más reciente
        const versionMasReciente = versiones[versiones.length - 1];
        const estadisticasRecientes = estadisticasPorVersion[versionMasReciente];
        actualizarTarjetasResumen(estadisticasRecientes, `v${versionMasReciente} (más reciente)`);
        
        // Actualizar tabla de detalle con todas las fichas
        const todosIndicadores = versiones.flatMap(v => indicadoresPorVersion[v]);
        actualizarTablaDatos(todosIndicadores, `Todas las versiones (${versiones.length})`);
        
        mostrarMensajeExito(`✅ Comparativa de ${versiones.length} versiones cargada`);
    }
    
    // 5. Mostrar secciones
    mostrarSeccionesPrincipales();
}

// ==================== FUNCIONES DE CÁLCULO ====================
function calcularEstadisticas(indicadores) {
    console.log(`🧮 Calculando estadísticas para ${indicadores.length} indicadores...`);
    
    const estadisticas = {
        gran_total: 0,
        total_indigenas: 0,
        total_afrodescendientes: 0,
        total_negros: 0,
        total_discapacidad: 0,
        total_victimas_general: 0,
        total_adolescentes_conflicto_ley: 0,
        total_privados_libertad: 0,
        total_jovenes_vulnerables: 0,
        total_mujeres_cabeza_familia: 0,
        total_fichas: indicadores.length
    };
    
    indicadores.forEach(ind => {
        estadisticas.gran_total += ind.gran_total || 0;
        estadisticas.total_indigenas += ind.indig_apr_tot || 0;
        estadisticas.total_afrodescendientes += ind.afro_apr_tot || 0;
        estadisticas.total_negros += ind.negro_apr_tot || 0;
        estadisticas.total_discapacidad += ind.discap_apr_tot || 0;
        
        // Víctimas del conflicto
        const victimas = 
            (ind.indig_despl_viol_apr_tot || 0) +
            (ind.afro_despl_viol_apr_tot || 0) +
            (ind.despl_viol_apr_tot || 0) +
            (ind.despl_disc_apr_tot || 0);
        estadisticas.total_victimas_general += victimas;
        
        estadisticas.total_adolescentes_conflicto_ley += ind.adol_conf_ley_apr_tot || 0;
        estadisticas.total_privados_libertad += ind.inpec_apr_tot || 0;
        estadisticas.total_jovenes_vulnerables += ind.jov_vuln_apr_tot || 0;
        estadisticas.total_mujeres_cabeza_familia += ind.muj_cabfam_apr_tot || 0;
    });
    
    // Calcular porcentajes
    if (estadisticas.gran_total > 0) {
        estadisticas.porcentaje_indigenas = ((estadisticas.total_indigenas / estadisticas.gran_total) * 100).toFixed(2);
        estadisticas.porcentaje_afrodescendientes = ((estadisticas.total_afrodescendientes / estadisticas.gran_total) * 100).toFixed(2);
        estadisticas.porcentaje_negros = ((estadisticas.total_negros / estadisticas.gran_total) * 100).toFixed(2);
        estadisticas.porcentaje_discapacidad = ((estadisticas.total_discapacidad / estadisticas.gran_total) * 100).toFixed(2);
        estadisticas.porcentaje_diversidad = (
            (estadisticas.total_indigenas + estadisticas.total_afrodescendientes + estadisticas.total_negros) / 
            estadisticas.gran_total * 100
        ).toFixed(2);
    }
    
    return estadisticas;
}

function calcularDistribucion(estadisticas) {
    const granTotal = estadisticas.gran_total;
    if (granTotal === 0) return { distribucion: {} };
    
    const distribucion = {
        victimas_conflicto: {
            total: estadisticas.total_victimas_general || 0,
            porcentaje: granTotal > 0 ? ((estadisticas.total_victimas_general || 0) / granTotal * 100).toFixed(2) : 0
        },
        discapacidad: {
            total: estadisticas.total_discapacidad || 0,
            porcentaje: granTotal > 0 ? ((estadisticas.total_discapacidad || 0) / granTotal * 100).toFixed(2) : 0
        },
        grupos_etnicos: {
            total: (estadisticas.total_indigenas || 0) + (estadisticas.total_afrodescendientes || 0) + (estadisticas.total_negros || 0),
            porcentaje: granTotal > 0 ? (((estadisticas.total_indigenas || 0) + (estadisticas.total_afrodescendientes || 0) + (estadisticas.total_negros || 0)) / granTotal * 100).toFixed(2) : 0
        },
        poblacion_vulnerable: {
            total: (estadisticas.total_adolescentes_conflicto_ley || 0) + (estadisticas.total_privados_libertad || 0) +
                   (estadisticas.total_jovenes_vulnerables || 0) + (estadisticas.total_mujeres_cabeza_familia || 0),
            porcentaje: granTotal > 0 ? (((estadisticas.total_adolescentes_conflicto_ley || 0) + (estadisticas.total_privados_libertad || 0) +
                   (estadisticas.total_jovenes_vulnerables || 0) + (estadisticas.total_mujeres_cabeza_familia || 0)) / granTotal * 100).toFixed(2) : 0
        }
    };
    
    return {
        version: estadisticas.version,
        gran_total: granTotal,
        distribucion: distribucion
    };
}

// ==================== MOSTRAR INFORMACIÓN DEL PROGRAMA ====================
function mostrarInformacionPrograma(codPrograma, nombrePrograma, versiones) {
    console.log('📋 Mostrando información del programa...');
    
    const infoCard = document.getElementById('infoProgramaCard');
    const nombreElem = document.getElementById('nombrePrograma');
    const codigoElem = document.getElementById('codigoPrograma');
    const versionesElem = document.getElementById('versionesDisponibles');
    const badgesElem = document.getElementById('badgesVersiones');
    
    if (!infoCard || !nombreElem || !codigoElem || !versionesElem || !badgesElem) return;
    
    // Actualizar información
    nombreElem.textContent = nombrePrograma;
    codigoElem.textContent = `Código: ${codPrograma}`;
    versionesElem.textContent = `${versiones.length} versión${versiones.length !== 1 ? 'es' : ''} disponible${versiones.length !== 1 ? 's' : ''}`;
    
    // Crear badges para cada versión
    badgesElem.innerHTML = '';
    versiones.sort().forEach(version => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary version-badge me-1 mb-1';
        badge.innerHTML = `<i class="bi bi-tag me-1"></i>v${version}`;
        badgesElem.appendChild(badge);
    });
    
    // Mostrar tarjeta
    infoCard.style.display = 'block';
}

// ==================== CREAR GRÁFICAS ====================

// 1. Gráfica de Bienvenida
function crearGraficaBienvenida() {
    console.log('🎨 Creando gráfica de bienvenida...');
    
    const canvas = document.getElementById('chartTotales');
    if (!canvas) {
        console.error('❌ Canvas chartTotales no encontrado');
        return;
    }
    
    try {
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        chartTotales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Comparativa', 'Versiones', 'Análisis', 'Tendencias', 'Distribución'],
                datasets: [{
                    label: 'Dashboard SENA',
                    data: [95, 85, 90, 88, 92],
                    backgroundColor: [
                        'rgba(0, 114, 206, 0.8)',
                        'rgba(0, 165, 80, 0.8)',
                        'rgba(247, 147, 30, 0.8)',
                        'rgba(102, 45, 145, 0.8)',
                        'rgba(54, 162, 235, 0.8)'
                    ],
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '📊 COMPARATIVA DE VERSIONES SENA',
                        font: { size: 18, weight: 'bold' }
                    },
                    subtitle: {
                        display: true,
                        text: 'Selecciona un programa para comparar versiones',
                        color: '#666'
                    }
                }
            }
        });
        
        console.log('✅ Gráfica de bienvenida creada');
        
    } catch (error) {
        console.error('❌ Error creando gráfica de bienvenida:', error);
    }
}

// 2. Gráfica de Totales Reales
function crearGraficaTotalesReales(estadisticas, programaNombre, version = null) {
    console.log('📊 Creando gráfica de totales...');
    
    const canvas = document.getElementById('chartTotales');
    if (!canvas) return;
    
    try {
        let nombreMostrar = programaNombre;
        if (nombreMostrar.length > 40) {
            nombreMostrar = nombreMostrar.substring(0, 40) + '...';
        }
        
        if (version) {
            nombreMostrar += ` - v${version}`;
        }
        
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        chartTotales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Total', 'Indígenas', 'Afrodescendientes', 'Negros', 'Discapacidad'],
                datasets: [{
                    label: 'Cantidad de Personas',
                    data: [
                        estadisticas.gran_total || 0,
                        estadisticas.total_indigenas || 0,
                        estadisticas.total_afrodescendientes || 0,
                        estadisticas.total_negros || 0,
                        estadisticas.total_discapacidad || 0
                    ],
                    backgroundColor: [
                        'rgba(0, 114, 206, 0.8)',
                        'rgba(0, 165, 80, 0.8)',
                        'rgba(247, 147, 30, 0.8)',
                        'rgba(102, 45, 145, 0.8)',
                        'rgba(230, 57, 70, 0.8)'
                    ],
                    borderColor: [
                        'rgb(0, 114, 206)',
                        'rgb(0, 165, 80)',
                        'rgb(247, 147, 30)',
                        'rgb(102, 45, 145)',
                        'rgb(230, 57, 70)'
                    ],
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `📊 INDICADORES PRINCIPALES - ${nombreMostrar}`,
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Cantidad de Personas' },
                        ticks: { callback: value => value.toLocaleString() }
                    }
                }
            }
        });
        
        console.log('✅ Gráfica de totales creada');
        
    } catch (error) {
        console.error('❌ Error creando gráfica de totales:', error);
    }
}

// 3. Gráfica de Comparativa de Versiones
function crearGraficaComparativaVersiones(estadisticasPorVersion, programaNombre) {
    console.log('📊 Creando gráfica de comparativa de versiones...');
    
    const canvas = document.getElementById('chartComparativaVersiones');
    if (!canvas) return;
    
    try {
        const versiones = Object.keys(estadisticasPorVersion).sort();
        
        if (versiones.length < 2) {
            canvas.parentElement.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-arrow-left-right fs-1 text-muted mb-3"></i>
                    <p class="text-muted">Se necesitan al menos 2 versiones para comparar</p>
                </div>
            `;
            return;
        }
        
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        chartComparativaVersiones = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: versiones.map(v => `v${v}`),
                datasets: [
                    {
                        label: 'Total Participantes',
                        data: versiones.map(v => estadisticasPorVersion[v].gran_total || 0),
                        backgroundColor: 'rgba(0, 114, 206, 0.8)',
                        borderColor: 'rgb(0, 114, 206)',
                        borderWidth: 1,
                        borderRadius: 5,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Fichas',
                        data: versiones.map(v => estadisticasPorVersion[v].total_fichas || 0),
                        backgroundColor: 'rgba(0, 165, 80, 0.8)',
                        borderColor: 'rgb(0, 165, 80)',
                        borderWidth: 1,
                        borderRadius: 5,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `📊 COMPARATIVA ENTRE VERSIONES - ${programaNombre.substring(0, 40)}`,
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label === 'Total Participantes') {
                                    return `${label}: ${context.parsed.y.toLocaleString()} personas`;
                                }
                                return `${label}: ${context.parsed.y} fichas`;
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Versiones' } },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Participantes' },
                        ticks: { callback: value => value.toLocaleString() }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: { display: true, text: 'Fichas' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
        
        console.log('✅ Gráfica de comparativa creada');
        
    } catch (error) {
        console.error('❌ Error creando gráfica de comparativa:', error);
    }
}

// 4. Gráfica de Crecimiento por Versión
function crearGraficaCrecimientoVersiones(estadisticasPorVersion) {
    console.log('📈 Creando gráfica de crecimiento...');
    
    const canvas = document.getElementById('chartCrecimiento');
    if (!canvas) return;
    
    try {
        const versiones = Object.keys(estadisticasPorVersion).sort();
        
        if (versiones.length < 2) {
            canvas.parentElement.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-arrow-up-right fs-1 text-muted mb-3"></i>
                    <p class="text-muted">Se necesitan al menos 2 versiones para mostrar crecimiento</p>
                </div>
            `;
            return;
        }
        
        // Calcular crecimiento
        const crecimientoData = [];
        for (let i = 1; i < versiones.length; i++) {
            const versionActual = versiones[i];
            const versionAnterior = versiones[i-1];
            const totalActual = estadisticasPorVersion[versionActual].gran_total || 0;
            const totalAnterior = estadisticasPorVersion[versionAnterior].gran_total || 0;
            
            let crecimiento = 0;
            if (totalAnterior > 0) {
                crecimiento = ((totalActual - totalAnterior) / totalAnterior) * 100;
            }
            
            crecimientoData.push({
                version: versionActual,
                crecimiento: crecimiento,
                totalActual: totalActual,
                totalAnterior: totalAnterior
            });
        }
        
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        chartCrecimiento = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: crecimientoData.map(d => `v${d.version}`),
                datasets: [{
                    label: 'Crecimiento %',
                    data: crecimientoData.map(d => d.crecimiento),
                    backgroundColor: crecimientoData.map(d => 
                        d.crecimiento >= 0 ? 'rgba(0, 165, 80, 0.8)' : 'rgba(230, 57, 70, 0.8)'
                    ),
                    borderColor: crecimientoData.map(d => 
                        d.crecimiento >= 0 ? 'rgb(0, 165, 80)' : 'rgb(230, 57, 70)'
                    ),
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '📈 CRECIMIENTO POR VERSIÓN',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const crecimiento = context.raw;
                                const versionData = crecimientoData[context.dataIndex];
                                const signo = crecimiento >= 0 ? '+' : '';
                                return [
                                    `Crecimiento: ${signo}${crecimiento.toFixed(2)}%`,
                                    `v${versionData.version}: ${versionData.totalActual.toLocaleString()} participantes`,
                                    `v${versionData.versionAnterior}: ${versionData.totalAnterior.toLocaleString()} participantes`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Crecimiento %' },
                        ticks: { callback: value => `${value}%` }
                    }
                }
            }
        });
        
        console.log('✅ Gráfica de crecimiento creada');
        
    } catch (error) {
        console.error('❌ Error creando gráfica de crecimiento:', error);
    }
}

// 5. Gráfica de Tendencias
function crearGraficaTendenciasVersiones(estadisticasPorVersion, programaNombre) {
    console.log('📈 Creando gráfica de tendencias...');
    
    const canvas = document.getElementById('chartTendencias');
    if (!canvas) return;
    
    try {
        const versiones = Object.keys(estadisticasPorVersion).sort();
        
        if (versiones.length < 2) {
            canvas.parentElement.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-graph-up fs-1 text-muted mb-3"></i>
                    <p class="text-muted">Se necesitan al menos 2 versiones para mostrar tendencias</p>
                </div>
            `;
            return;
        }
        
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        chartTendencias = new Chart(ctx, {
            type: 'line',
            data: {
                labels: versiones.map(v => `v${v}`),
                datasets: [
                    {
                        label: 'Total Participantes',
                        data: versiones.map(v => estadisticasPorVersion[v].gran_total || 0),
                        borderColor: 'rgb(0, 114, 206)',
                        backgroundColor: 'rgba(0, 114, 206, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '📈 TENDENCIAS - PARTICIPANTES POR VERSIÓN',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Participantes: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Participantes' },
                        ticks: { callback: value => value.toLocaleString() }
                    }
                }
            }
        });
        
        console.log('✅ Gráfica de tendencias creada');
        
    } catch (error) {
        console.error('❌ Error creando gráfica de tendencias:', error);
    }
}

// 6. Gráfica de Tendencias Detalladas (Grupos Étnicos)
function crearGraficaTendenciasDetalladas(estadisticasPorVersion) {
    console.log('📈 Creando gráfica de tendencias detalladas...');
    
    const canvas = document.getElementById('chartTendenciasDetalladas');
    if (!canvas) return;
    
    try {
        const versiones = Object.keys(estadisticasPorVersion).sort();
        
        if (versiones.length < 2) {
            canvas.parentElement.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-trending-up fs-1 text-muted mb-3"></i>
                    <p class="text-muted">Se necesitan al menos 2 versiones para análisis detallado</p>
                </div>
            `;
            return;
        }
        
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        chartTendenciasDetalladas = new Chart(ctx, {
            type: 'line',
            data: {
                labels: versiones.map(v => `v${v}`),
                datasets: [
                    {
                        label: 'Indígenas',
                        data: versiones.map(v => estadisticasPorVersion[v].total_indigenas || 0),
                        borderColor: 'rgb(0, 165, 80)',
                        backgroundColor: 'rgba(0, 165, 80, 0.1)',
                        borderWidth: 2,
                        tension: 0.4
                    },
                    {
                        label: 'Afrodescendientes',
                        data: versiones.map(v => estadisticasPorVersion[v].total_afrodescendientes || 0),
                        borderColor: 'rgb(247, 147, 30)',
                        backgroundColor: 'rgba(247, 147, 30, 0.1)',
                        borderWidth: 2,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '📈 EVOLUCIÓN DE GRUPOS ÉTNICOS',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Cantidad' },
                        ticks: { callback: value => value.toLocaleString() }
                    }
                }
            }
        });
        
        console.log('✅ Gráfica de tendencias detalladas creada');
        
    } catch (error) {
        console.error('❌ Error creando gráfica de tendencias detalladas:', error);
    }
}

// 7. Gráfica de Grupos Étnicos
function crearGraficaGruposEtnicos(estadisticas, version = null) {
    console.log('👥 Creando gráfica de grupos étnicos...');
    
    const canvas = document.getElementById('chartEtnicos');
    if (!canvas) return;
    
    try {
        const grupos = [
            { nombre: 'Indígenas', valor: estadisticas.total_indigenas || 0 },
            { nombre: 'Afrodescendientes', valor: estadisticas.total_afrodescendientes || 0 },
            { nombre: 'Negros', valor: estadisticas.total_negros || 0 }
        ].filter(g => g.valor > 0);
        
        if (grupos.length === 0) {
            canvas.parentElement.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-people fs-1 text-muted mb-3"></i>
                    <p class="text-muted">No hay datos de grupos étnicos</p>
                </div>
            `;
            return;
        }
        
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        let titulo = '👥 DISTRIBUCIÓN POR GRUPOS ÉTNICOS';
        if (version) {
            titulo += ` - v${version}`;
        }
        
        const ctx = canvas.getContext('2d');
        chartEtnicos = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: grupos.map(g => g.nombre),
                datasets: [{
                    label: 'Grupos Étnicos',
                    data: grupos.map(g => g.valor),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: titulo,
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { position: 'right' }
                }
            }
        });
        
        console.log('✅ Gráfica de grupos étnicos creada');
        
    } catch (error) {
        console.error('❌ Error creando gráfica de grupos étnicos:', error);
    }
}

// 8. Gráfica de Distribución
function crearGraficaDistribucion(distribucion, titulo = 'Distribución') {
    console.log('🥧 Creando gráfica de distribución...');
    
    const canvas = document.getElementById('chartDistribucion');
    if (!canvas) return;
    
    try {
        const dist = distribucion.distribucion || {};
        
        const categorias = [
            { nombre: 'Víctimas Conflicto', data: dist.victimas_conflicto },
            { nombre: 'Discapacidad', data: dist.discapacidad },
            { nombre: 'Grupos Étnicos', data: dist.grupos_etnicos },
            { nombre: 'Población Vulnerable', data: dist.poblacion_vulnerable }
        ];
        
        const labels = categorias.filter(c => c.data && c.data.porcentaje > 0).map(c => c.nombre);
        const datos = categorias.filter(c => c.data && c.data.porcentaje > 0).map(c => parseFloat(c.data.porcentaje));
        
        if (datos.length === 0) {
            canvas.parentElement.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-pie-chart fs-1 text-muted mb-3"></i>
                    <p class="text-muted">No hay datos de distribución</p>
                </div>
            `;
            return;
        }
        
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        chartDistribucion = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Distribución (%)',
                    data: datos,
                    backgroundColor: [
                        'rgba(230, 57, 70, 0.8)',
                        'rgba(102, 45, 145, 0.8)',
                        'rgba(247, 147, 30, 0.8)',
                        'rgba(0, 165, 80, 0.8)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `🥧 DISTRIBUCIÓN PORCENTUAL - ${titulo}`,
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { position: 'right' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed.toFixed(2)}%`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Gráfica de distribución creada');
        
    } catch (error) {
        console.error('❌ Error creando gráfica de distribución:', error);
    }
}

// 9. Gráfica de Análisis por Categorías
function crearGraficaAnalisisCategorias(estadisticas, version = null) {
    console.log('📊 Creando gráfica de análisis por categorías...');
    
    const canvas = document.getElementById('chartCategorias');
    if (!canvas) return;
    
    try {
        const categorias = [
            { 
                nombre: 'Grupos Étnicos', 
                valor: estadisticas.total_indigenas + estadisticas.total_afrodescendientes + estadisticas.total_negros,
                color: '#FF6384'
            },
            { 
                nombre: 'Discapacidad', 
                valor: estadisticas.total_discapacidad,
                color: '#36A2EB'
            },
            { 
                nombre: 'Víctimas Conflicto', 
                valor: estadisticas.total_victimas_general,
                color: '#FFCE56'
            },
            { 
                nombre: 'Población Vulnerable', 
                valor: estadisticas.total_adolescentes_conflicto_ley + estadisticas.total_privados_libertad +
                       estadisticas.total_jovenes_vulnerables + estadisticas.total_mujeres_cabeza_familia,
                color: '#4BC0C0'
            }
        ].filter(c => c.valor > 0);
        
        if (categorias.length === 0) {
            canvas.parentElement.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-diagram-3 fs-1 text-muted mb-3"></i>
                    <p class="text-muted">No hay datos para análisis por categorías</p>
                </div>
            `;
            return;
        }
        
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        let titulo = '📊 ANÁLISIS POR CATEGORÍAS';
        if (version) {
            titulo += ` - v${version}`;
        }
        
        const ctx = canvas.getContext('2d');
        chartCategorias = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categorias.map(c => c.nombre),
                datasets: [{
                    label: 'Total por Categoría',
                    data: categorias.map(c => c.valor),
                    backgroundColor: categorias.map(c => c.color),
                    borderColor: categorias.map(c => c.color.replace('0.8', '1')),
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: titulo,
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Cantidad' },
                        ticks: { callback: value => value.toLocaleString() }
                    }
                }
            }
        });
        
        console.log('✅ Gráfica de análisis por categorías creada');
        
    } catch (error) {
        console.error('❌ Error creando gráfica de análisis por categorías:', error);
    }
}

// ==================== ACTUALIZAR UI ====================

function actualizarTarjetasResumen(estadisticas, versionInfo = '') {
    console.log('🔄 Actualizando tarjetas de resumen...');
    
    try {
        const total = estadisticas.gran_total || 0;
        const indigenas = estadisticas.total_indigenas || 0;
        const afro = estadisticas.total_afrodescendientes || 0;
        const discapacidad = estadisticas.total_discapacidad || 0;
        const fichas = estadisticas.total_fichas || 0;
        
        // Actualizar valores
        document.getElementById('cardTotal').textContent = total.toLocaleString();
        document.getElementById('cardIndigenas').textContent = indigenas.toLocaleString();
        document.getElementById('cardAfro').textContent = afro.toLocaleString();
        document.getElementById('cardDiscapacidad').textContent = discapacidad.toLocaleString();
        
        // Actualizar información de fichas
        const cardFichas = document.getElementById('cardFichas');
        if (cardFichas) {
            cardFichas.textContent = fichas;
        }
        
        // Calcular y actualizar porcentajes
        if (total > 0) {
            const porcentajeIndigenas = ((indigenas / total) * 100).toFixed(1);
            const porcentajeAfro = ((afro / total) * 100).toFixed(1);
            const porcentajeDiscapacidad = ((discapacidad / total) * 100).toFixed(1);
            
            document.getElementById('cardIndigenasPorc').textContent = `${porcentajeIndigenas}%`;
            document.getElementById('cardAfroPorc').textContent = `${porcentajeAfro}%`;
            document.getElementById('cardDiscapacidadPorc').textContent = `${porcentajeDiscapacidad}%`;
        }
        
        // Mostrar información de versión en el título si está disponible
        if (versionInfo) {
            const cardTitles = document.querySelectorAll('.stat-card h6.text-muted');
            cardTitles.forEach(title => {
                const originalText = title.textContent;
                if (!originalText.includes('(')) {
                    title.textContent = `${originalText} (${versionInfo})`;
                }
            });
        }
        
        // Mostrar tarjetas
        document.getElementById('cardsResumen').style.display = 'flex';
        
        console.log('✅ Tarjetas actualizadas');
        
    } catch (error) {
        console.error('❌ Error actualizando tarjetas:', error);
    }
}

function actualizarTablaDatos(indicadores, versionInfo = '') {
    console.log('📋 Actualizando tabla de datos...');
    
    const tbody = document.getElementById('tablaDatos');
    if (!tbody) return;
    
    try {
        tbody.innerHTML = '';
        
        if (!indicadores || indicadores.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="bi bi-table me-2"></i>No hay registros detallados
                    </td>
                </tr>
            `;
            return;
        }
        
        // Ordenar por número de ficha
        indicadores.sort((a, b) => (a.numero_ficha || 0) - (b.numero_ficha || 0));
        
        // Mostrar todos los registros
        indicadores.forEach(ind => {
            const total = ind.gran_total || 0;
            const indigenas = ind.indig_apr_tot || 0;
            const afro = ind.afro_apr_tot || 0;
            const negros = ind.negro_apr_tot || 0;
            const discapacidad = ind.discap_apr_tot || 0;
            const porcentajeEtnico = total > 0 ? ((indigenas + afro + negros) / total * 100).toFixed(1) : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="fw-bold">${ind.numero_ficha || 'N/A'}</td>
                <td>v${ind.version || 'N/A'}</td>
                <td class="text-end">${total.toLocaleString()}</td>
                <td class="text-end">${indigenas.toLocaleString()}</td>
                <td class="text-end">${afro.toLocaleString()}</td>
                <td class="text-end">${negros.toLocaleString()}</td>
                <td class="text-end">${discapacidad.toLocaleString()}</td>
                <td class="text-end text-success fw-bold">${porcentajeEtnico}%</td>
            `;
            tbody.appendChild(row);
        });
        
        // Actualizar título de la pestaña si hay información de versión
        if (versionInfo) {
            const tabDetalle = document.getElementById('tab-detalle');
            if (tabDetalle) {
                const icon = tabDetalle.querySelector('i');
                tabDetalle.innerHTML = `<i class="${icon.className}"></i>Detalle ${versionInfo}`;
            }
        }
        
        console.log(`✅ Tabla actualizada con ${indicadores.length} registros`);
        
    } catch (error) {
        console.error('❌ Error actualizando tabla:', error);
    }
}

function actualizarTablaComparativa(estadisticasPorVersion) {
    console.log('📊 Actualizando tabla comparativa...');
    
    const tbody = document.getElementById('tablaComparativa');
    if (!tbody) return;
    
    try {
        tbody.innerHTML = '';
        
        const versiones = Object.keys(estadisticasPorVersion).sort();
        
        versiones.forEach(version => {
            const stats = estadisticasPorVersion[version];
            const porcentajeDiversidad = stats.porcentaje_diversidad || '0.00';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="fw-bold">v${version}</td>
                <td class="text-end">${stats.gran_total.toLocaleString()}</td>
                <td class="text-end">${stats.total_fichas}</td>
                <td class="text-end">${stats.total_indigenas.toLocaleString()} <small class="text-muted">(${stats.porcentaje_indigenas || '0.00'}%)</small></td>
                <td class="text-end">${stats.total_afrodescendientes.toLocaleString()} <small class="text-muted">(${stats.porcentaje_afrodescendientes || '0.00'}%)</small></td>
                <td class="text-end">${stats.total_discapacidad.toLocaleString()} <small class="text-muted">(${stats.porcentaje_discapacidad || '0.00'}%)</small></td>
                <td class="text-end fw-bold ${parseFloat(porcentajeDiversidad) > 0 ? 'text-success' : 'text-muted'}">
                    ${porcentajeDiversidad}%
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log(`✅ Tabla comparativa actualizada con ${versiones.length} versiones`);
        
    } catch (error) {
        console.error('❌ Error actualizando tabla comparativa:', error);
    }
}

function mostrarSeccionesPrincipales() {
    console.log('👁️ Mostrando secciones principales...');
    
    try {
        // Mostrar información del programa
        const infoCard = document.getElementById('infoProgramaCard');
        if (infoCard) infoCard.style.display = 'block';
        
        // Mostrar tarjetas de resumen
        const cardsResumen = document.getElementById('cardsResumen');
        if (cardsResumen) cardsResumen.style.display = 'flex';
        
        // Mostrar tabs de gráficas
        const graficasTabs = document.getElementById('graficasTabsContainer');
        if (graficasTabs) graficasTabs.style.display = 'block';
        
        // Ocultar mensaje vacío
        const mensajeVacio = document.getElementById('mensajeVacio');
        if (mensajeVacio) mensajeVacio.style.display = 'none';
        
        console.log('✅ Secciones mostradas');
        
    } catch (error) {
        console.error('❌ Error mostrando secciones:', error);
    }
}

function destruirTodasLasGraficas() {
    console.log('🗑️ Limpiando gráficas...');
    
    try {
        const ids = [
            'chartTotales', 
            'chartDistribucion', 
            'chartEtnicos', 
            'chartTendencias',
            'chartComparativaVersiones',
            'chartCrecimiento',
            'chartCategorias',
            'chartTendenciasDetalladas'
        ];
        
        ids.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                try {
                    const chart = Chart.getChart(canvas);
                    if (chart) {
                        chart.destroy();
                    }
                } catch (error) {
                    console.warn(`⚠️ Error destruyendo gráfica ${canvasId}:`, error.message);
                }
            }
        });
        
        // Resetear variables
        chartTotales = null;
        chartDistribucion = null;
        chartEtnicos = null;
        chartTendencias = null;
        chartComparativaVersiones = null;
        chartCrecimiento = null;
        chartCategorias = null;
        chartTendenciasDetalladas = null;
        
        console.log('✅ Gráficas limpiadas');
        
    } catch (error) {
        console.error('❌ Error destruyendo gráficas:', error);
    }
}

function limpiarTodo() {
    console.log('🧹 Limpiando dashboard...');
    
    try {
        // Resetear selects
        const selectPrograma = document.getElementById('selectPrograma');
        if (selectPrograma) selectPrograma.value = '';
        
        const selectVersion = document.getElementById('selectVersion');
        if (selectVersion) selectVersion.innerHTML = '<option value="">Todas las versiones (Comparar)</option>';
        
        // Ocultar secciones
        const secciones = ['infoProgramaCard', 'cardsResumen', 'graficasTabsContainer'];
        secciones.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.style.display = 'none';
        });
        
        // Mostrar mensaje vacío
        const mensajeVacio = document.getElementById('mensajeVacio');
        if (mensajeVacio) {
            mensajeVacio.style.display = 'block';
        }
        
        // Destruir gráficas
        destruirTodasLasGraficas();
        
        // Crear nueva gráfica de bienvenida
        setTimeout(() => {
            crearGraficaBienvenida();
        }, 200);
        
        mostrarMensajeInfo('✅ Dashboard limpiado. Selecciona un nuevo programa.');
        
    } catch (error) {
        console.error('❌ Error limpiando dashboard:', error);
        mostrarError('Error al limpiar el dashboard');
    }
}

// ==================== FUNCIONES DE MENSAJES ====================
function mostrarMensajeExito(mensaje) {
    console.log(`✅ ${mensaje}`);
    // Puedes implementar toast/notificaciones aquí
    if (typeof alert !== 'undefined') {
        alert(mensaje);
    }
}

function mostrarMensajeInfo(mensaje) {
    console.log(`ℹ️ ${mensaje}`);
}

function mostrarError(mensaje) {
    console.error(`❌ ${mensaje}`);
    if (typeof alert !== 'undefined') {
        alert(`Error: ${mensaje}`);
    }
}

// ==================== CONFIGURAR EVENTOS ====================
function configurarEventos() {
    console.log('⚙️ Configurando eventos...');
    
    try {
        // Cuando cambie el programa, cargar sus versiones en el select
        const selectPrograma = document.getElementById('selectPrograma');
        if (selectPrograma) {
            selectPrograma.addEventListener('change', async function() {
                const codPrograma = this.value;
                const selectVersion = document.getElementById('selectVersion');
                
                if (!codPrograma || !selectVersion) return;
                
                // Limpiar versiones
                selectVersion.innerHTML = '<option value="">Todas las versiones (Comparar)</option>';
                
                // Obtener las versiones del programa seleccionado
                const option = this.options[this.selectedIndex];
                const versionesStr = option.dataset.versiones;
                
                if (versionesStr) {
                    const versiones = versionesStr.split(',').sort();
                    
                    versiones.forEach(version => {
                        const optionVersion = document.createElement('option');
                        optionVersion.value = version;
                        optionVersion.textContent = `Versión ${version}`;
                        selectVersion.appendChild(optionVersion);
                    });
                    
                    // Si hay múltiples versiones, agregar opción para comparar todas
                    if (versiones.length > 1) {
                        const compareOption = document.createElement('option');
                        compareOption.value = '';
                        compareOption.textContent = `Comparar ${versiones.length} versiones`;
                        selectVersion.insertBefore(compareOption, selectVersion.firstChild.nextSibling);
                        selectVersion.value = '';
                    }
                }
            });
        }
        
        // Botón Cargar/Analizar
        const btnCargar = document.getElementById('btnCargar');
        if (btnCargar) {
            btnCargar.addEventListener('click', async function() {
                const selectPrograma = document.getElementById('selectPrograma');
                const selectVersion = document.getElementById('selectVersion');
                
                if (!selectPrograma || !selectVersion) return;
                
                const codPrograma = selectPrograma.value;
                const version = selectVersion.value;
                
                if (!codPrograma) {
                    mostrarError('Por favor selecciona un programa primero');
                    return;
                }
                
                await cargarDatosReales(codPrograma, version || null);
            });
        }
        
        // Botón Limpiar
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', limpiarTodo);
        }
        
        // Select de tipo de gráfica principal
        const selectTipo = document.getElementById('selectTipo');
        if (selectTipo) {
            selectTipo.addEventListener('change', function() {
                const tipo = this.value;
                if (chartTotales) {
                    try {
                        chartTotales.config.type = tipo;
                        chartTotales.update();
                        console.log(`🔄 Tipo de gráfica principal: ${tipo}`);
                    } catch (error) {
                        console.error('❌ Error cambiando tipo de gráfica:', error);
                    }
                }
            });
        }
        
        console.log('✅ Eventos configurados');
        
    } catch (error) {
        console.error('❌ Error configurando eventos:', error);
    }
}

// ==================== FUNCIONES GLOBALES ====================
window.cargarProgramasReales = cargarProgramasConVersiones;

window.cambiarTipoGrafica = function(tipo) {
    if (chartTotales) {
        try {
            chartTotales.config.type = tipo;
            chartTotales.update();
            console.log(`🔄 Tipo de gráfica principal: ${tipo}`);
        } catch (error) {
            console.error('❌ Error cambiando tipo de gráfica:', error);
        }
    }
};

window.cambiarTipoGraficaEspecifica = function(canvasId, tipo) {
    let chart;
    switch(canvasId) {
        case 'chartComparativaVersiones':
            chart = chartComparativaVersiones;
            break;
        case 'chartTotales':
            chart = chartTotales;
            break;
        default:
            console.warn(`Gráfica no encontrada: ${canvasId}`);
            return;
    }
    
    if (chart) {
        try {
            chart.config.type = tipo;
            chart.update();
            console.log(`🔄 Tipo de gráfica ${canvasId}: ${tipo}`);
        } catch (error) {
            console.error('❌ Error cambiando tipo de gráfica:', error);
        }
    }
};

window.descargarGrafica = function(canvasId) {
    console.log('💾 Descargando gráfica:', canvasId);
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        try {
            const link = document.createElement('a');
            link.download = `grafica-sena-${canvasId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            mostrarMensajeExito('✅ Gráfica descargada');
        } catch (error) {
            console.error('❌ Error descargando gráfica:', error);
            mostrarError('Error al descargar la gráfica');
        }
    } else {
        mostrarError('Gráfica no encontrada para descargar');
    }
};

// ==================== INICIALIZACIÓN AUTOMÁTICA ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ DOM cargado - inicializando dashboard');
        setTimeout(initGraficas, 300);
    });
} else {
    console.log('⚡ DOM ya listo - inicializando dashboard');
    setTimeout(initGraficas, 300);
}

// ==================== EXPORTAR FUNCIONES ====================
export default {
    initGraficas,
    cargarDatosReales,
    limpiarTodo,
    cargarProgramasConVersiones
};

console.log('✅ graficas.js cargado - comparativa de versiones');