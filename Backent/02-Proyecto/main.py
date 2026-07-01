from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.router import usuarios
from app.router import auth
from app.router import redes_conocimiento
from app.router import programas_formacion
from app.router import registro_calificado
from app.router import indicadores_programa
from app.router import cargar_archivos
from app.router import subir_pdf_programas

# Crear la app con límite de tamaño para uploads
app = FastAPI(
    title="API Programas Formación",
    description="API para gestión de programas de formación",
    version="1.0.0",
    max_upload_size=50 * 1024 * 1024  # ✅ 50MB límite para archivos grandes
)

# Montar directorio estático para servir archivos
app.mount("/static", StaticFiles(directory="static"), name="static")

# Incluir en el objeto app los routers
app.include_router(usuarios.router, prefix="/usuario", tags=["SERVICIO USUARIOS"])
app.include_router(auth.router, prefix="/access", tags=["SERVICIO DE LOGIN"])
app.include_router(redes_conocimiento.router, prefix="/redes_conocimiento", tags=["SERVICIO REDES DE CONOCIMIENTO"])
app.include_router(cargar_archivos.router, prefix="/subir", tags=["CARGAR ARCHIVOS"])
app.include_router(programas_formacion.router, prefix="/programas_formacion", tags=["SERVICIO PROGRAMAS DE FORMACION"])
app.include_router(registro_calificado.router, prefix="/registro_calificado", tags=["SERVICIO REGISTRO CALIFICADO"])
app.include_router(indicadores_programa.router, prefix="/indicadores_programa", tags=["SERVICIO INDICADORES DE PROGRAMA"])
app.include_router(subir_pdf_programas.router, prefix="/subir_pdf", tags=["SUBIR PDF PROGRAMAS"])

# Configuración de CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",  # Para desarrollo
        "http://localhost:3000",
        "http://localhost:8000", 
        "https://*.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=600  # ✅ Cache de preflight requests
)

# Definición de la ruta raíz de la API
@app.get("/")
def read_root():
    return {
        "message": "API Programas Formación funcionando",
        "autor": "ADSO 2925888",
        "version": "1.0.0"
    }

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "programas_formacion_api"}