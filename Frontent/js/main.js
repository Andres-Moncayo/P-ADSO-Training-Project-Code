// Función para cargar una vista HTML en el contenedor principal
const loadView = async (viewPath) => { // Ejemplo: 'pages/programas.html'
    try {
        const response = await fetch(viewPath); // Intentar cargar el archivo HTML

        const contentContainer = document.getElementById('contenido'); // Contenedor principal donde se carga la vista
        if (!contentContainer) {
            console.error('No se encontró el contenedor #contenido');
            return;
        }

        if (!response.ok) { // Manejar errores HTTP (mostrar mensaje en UI)
            console.error(`Error al cargar: ${viewPath} (${response.status})`);
            contentContainer.innerHTML = `<div class="alert alert-danger" role="alert">
                <strong>Error al cargar la vista</strong><br>
                No se pudo cargar <code>${viewPath}</code> (HTTP ${response.status}).<br>
                <button class="btn btn-sm btn-outline-light mt-2" id="retry-load-view">Reintentar</button>
            </div>`;
            document.getElementById('retry-load-view')?.addEventListener('click', () => loadView(viewPath));
            document.dispatchEvent(new CustomEvent('view:error', { detail: { viewPath, status: response.status } }));
            return;
        }

        const html = await response.text(); // Obtener el contenido HTML como texto

        // Parsear y mover nodos, ejecutando scripts (incluidos type="module")
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Limpiar contenedor y añadir nodes procesando scripts
        contentContainer.innerHTML = '';
        const scriptsToLoad = [];
        
        // 🔥 PRIMERO: DESTRUIR GRÁFICAS EXISTENTES si estamos cargando gráficas
        if (viewPath.includes('graficas.html')) {
            console.log('🎯 Cargando gráficas - limpiando gráficas anteriores...');
            destruirTodasLasGraficas();
        }
        
        Array.from(temp.childNodes).forEach(node => {
            if (node.nodeName.toLowerCase() === 'script') {
                const newScript = document.createElement('script');
                // copiar atributos
                Array.from(node.attributes || []).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                
                // 🔥 MANEJO ESPECIAL PARA gráficas.js
                if (node.src && node.src.includes('graficas.js')) {
                    console.log('📦 Detectado script de gráficas');
                    
                    // Extraer ruta
                    let modulePath = node.src;
                    if (modulePath.startsWith('http')) {
                        const url = new URL(modulePath);
                        modulePath = url.pathname;
                    }
                    
                    // Asegurar ruta correcta
                    if (!modulePath.startsWith('./') && !modulePath.startsWith('../') && !modulePath.startsWith('/')) {
                        modulePath = './' + modulePath;
                    }
                    
                    modulePath = modulePath.split('?')[0];
                    
                    console.log('📂 Ruta del módulo:', modulePath);
                    
                    // Importar el módulo ES6
                    const scriptModule = import(modulePath)
                        .then(module => {
                            console.log('✅ Módulo de gráficas importado exitosamente');
                            // El módulo se auto-inicializa con DOMContentLoaded
                            return true;
                        })
                        .catch(err => {
                            console.error('❌ Error importando módulo:', err);
                            // Crear gráfica de error básica
                            crearGraficaErrorBasica();
                            throw err;
                        });
                    
                    scriptsToLoad.push(scriptModule);
                    
                } else if (node.src) {
                    // script externo normal
                    scriptsToLoad.push(new Promise((resolve, reject) => {
                        newScript.onload = resolve;
                        newScript.onerror = () => reject(new Error(`Script ${node.src} failed to load`));
                        contentContainer.appendChild(newScript);
                    }));
                } else {
                    // script inline
                    newScript.textContent = node.textContent;
                    contentContainer.appendChild(newScript);
                }
            } else {
                contentContainer.appendChild(node.cloneNode(true));
            }
        });

        // Esperar a que scripts externos terminen de cargar (si se cargaron)
        try {
            await Promise.all(scriptsToLoad);
        } catch (e) {
            console.warn('No se pudieron cargar algunos scripts de la vista:', e);
        }

        console.log(`Vista cargada: ${viewPath}`);
        document.dispatchEvent(new CustomEvent('view:loaded', { detail: { viewPath } }));
        
    } catch (error) {
        console.error('Error al cargar la vista:', error); // Log de error general
        const contentContainer = document.getElementById('contenido');
        if (contentContainer) {
            contentContainer.innerHTML = `<div class="alert alert-danger" role="alert">
                <strong>Error al cargar la vista</strong><br>
                Ocurrió un error: ${error.message || error}.<br>
                <button class="btn btn-sm btn-outline-light mt-2" id="retry-load-view-2">Reintentar</button>
            </div>`;
            document.getElementById('retry-load-view-2')?.addEventListener('click', () => loadView(viewPath));
        }
        document.dispatchEvent(new CustomEvent('view:error', { detail: { viewPath, error } }));
    }
};

// 🔥 FUNCIÓN PARA DESTRUIR GRÁFICAS
function destruirTodasLasGraficas() {
    console.log('🗑️ Destruyendo gráficas existentes...');
    
    // Lista de todas las gráficas posibles
    const chartIds = ['chartTotales', 'chartDistribucion', 'chartEtnicos', 'chartTendencias'];
    
    chartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            // Obtener la instancia de Chart.js del canvas
            const chart = Chart.getChart(canvas);
            if (chart) {
                console.log(`✅ Destruyendo gráfica ${chartId}`);
                chart.destroy();
            }
        }
    });
    
    // También destruir gráficas en variables globales
    if (window.chartTotales && typeof window.chartTotales.destroy === 'function') {
        window.chartTotales.destroy();
        window.chartTotales = null;
    }
    if (window.chartDistribucion && typeof window.chartDistribucion.destroy === 'function') {
        window.chartDistribucion.destroy();
        window.chartDistribucion = null;
    }
    if (window.chartEtnicos && typeof window.chartEtnicos.destroy === 'function') {
        window.chartEtnicos.destroy();
        window.chartEtnicos = null;
    }
    if (window.chartTendencias && typeof window.chartTendencias.destroy === 'function') {
        window.chartTendencias.destroy();
        window.chartTendencias = null;
    }
}

// FUNCIÓN PARA CREAR GRÁFICA DE ERROR
function crearGraficaErrorBasica() {
    const canvas = document.getElementById('chartTotales');
    if (!canvas || typeof Chart === 'undefined') return;
    
    try {
        // Destruir gráfica existente primero
        const existingChart = Chart.getChart(canvas);
        if (existingChart) existingChart.destroy();
        
        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Error'],
                datasets: [{
                    label: 'Error cargando datos',
                    data: [1],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '❌ Error - Verifica la consola'
                    }
                }
            }
        });
    } catch (e) {
        console.error('No se pudo crear gráfica de error:', e);
    }
}

// Función para actualizar el enlace activo en la barra de navegación
const updateActiveNavLink = (pageName) => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(
        `.nav-link[data-page="${pageName}"], .nav-link[href="#${pageName}"]`
    );

    if (activeLink) {
        activeLink.classList.add('active');
        console.log(`🔵Botón activo: ${pageName}`);
    }
};

// Función para configurar listeners en navbar
const setupNavbarListeners = () => {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const pageName = link.getAttribute('data-page');

            window.location.hash = pageName;
        });
    });

    /*Funcion Para cerrar sesión*/
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            console.log('Sesión cerrada');
        });
    }
};

// Mapeo de páginas disponibles
const pageMap = {
    // Páginas existentes
    'metas': 'metas.html',
    'oferta': 'oferta.html',
    'convenios': 'convenios.html',
    'egresados': 'egresados.html',
    'programas': 'programas.html',
    'eccl': 'eccl.html',
    'innovacion': 'innovacion.html',
    'usuarios': 'usuarios.html',
    'panel': 'panel.html',
    'perfil': 'perfil.html',
    'indicadores': 'indicadores.html',
    
    // NUEVA PÁGINA DE GRÁFICAS - agregada sin afectar lo demás
    'graficas': 'graficas.html',      // Para #graficas
    'graficos': 'graficas.html',      // Alias por si usas #graficos
    'dashboard': 'graficas.html',     // Otro alias opcional
    
    // Páginas que pueden no existir aún pero las dejamos listas
    'reportes': 'reportes.html',
    'estadisticas': 'estadisticas.html'
};

// Función para obtener el archivo de página correcto
const getPageFile = (pageName) => {
    // Si la página está en el mapeo, usa ese archivo
    if (pageMap[pageName]) {
        return pageMap[pageName];
    }
    
    // Si no está en el mapeo, asume que el archivo tiene el mismo nombre
    return `${pageName}.html`;
};

// Función para manejar el cambio de hash
const handleHashChange = () => {
    const hash = window.location.hash.substring(1);
    
    if (hash) {
        const pageFile = getPageFile(hash);
        loadView(`pages/${pageFile}`);
        updateActiveNavLink(hash);
    }
};

// Configurar event listeners
window.addEventListener('hashchange', handleHashChange);

// Ejecutarse una vez cuando el DOM está listo.
// Verificar si el usuario tiene token (autenticación).
// Configurar los listeners del menú.
// Cargar la vista inicial (por hash o por defecto). Programas
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Aplicación inicializada');

    const token = localStorage.getItem('access_token');
    if (!token) {
        console.warn('⚠️ No hay token, redirigiendo a login');
        window.location.href = 'login.html';
        return;
    }

    setupNavbarListeners();

    // Cargar página inicial basada en hash o por defecto
    if (window.location.hash) {
        handleHashChange();
    } else {
        // Página por defecto (puedes cambiarla si quieres)
        loadView('pages/programas.html');
        updateActiveNavLink('programas');
    }
});

/* ============================================================================
   - Permitir que estas funciones se puedan llamar desde otros scripts o HTML.
   - Útil para debugging o scripts embebidos.
   ============================================================================ */

window.loadView = loadView;
window.updateActiveNavLink = updateActiveNavLink;
window.setupNavbarListeners = setupNavbarListeners;
window.getPageFile = getPageFile;
window.destruirTodasLasGraficas = destruirTodasLasGraficas;  // Nueva función expuesta

// Manejar errores de carga globalmente y mostrar una alerta con opción de reintentar
document.addEventListener('view:error', (e) => {
    try {
        const detail = e?.detail || {};
        const viewPath = detail.viewPath || '';
        const msg = (detail.error && detail.error.message) || detail.status || 'Error desconocido';

        // Remover alerta previa si existe
        const prev = document.getElementById('global-view-error-alert');
        if (prev) prev.remove();

        const alert = document.createElement('div');
        alert.id = 'global-view-error-alert';
        alert.className = 'alert alert-warning alert-dismissible fade show m-3';
        alert.role = 'alert';
        alert.innerHTML = `<strong>Error al cargar vista</strong> ${viewPath ? `: <code>${viewPath}</code>` : ''} — ${msg}
            <button type="button" class="btn btn-sm btn-outline-primary ms-3" id="global-retry-view">Reintentar</button>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;

        // Insertar al inicio del body para visibilidad
        document.body.prepend(alert);

        // Handler del botón de reintento
        document.getElementById('global-retry-view')?.addEventListener('click', () => {
            if (viewPath) loadView(viewPath);
            alert.remove();
        });

        // Auto-dismiss after 10s
        setTimeout(() => { 
            try { 
                alert.classList.remove('show'); 
                alert.remove(); 
            } catch(e){} 
        }, 10000);
    } catch (err) {
        console.warn('Error manejando view:error:', err);
    }
});

// Log de todas las páginas disponibles (útil para debugging)
console.log('📋 Páginas disponibles:', Object.keys(pageMap).map(page => `#${page}`).join(', '));