from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from typing import List, Optional

from app.router.dependencies import get_current_user
from app.schemas.indicadores_programa import CrearIndicadoresPrograma, RetornoIndicadoresPrograma, EditarIndicadoresPrograma
from app.schemas.usuarios import RetornoUsuario
from core.database import get_db
from app.crud import indicadores_programa as crud

# Por esto:
router = APIRouter()  # Sin prefix

# ==================== ENDPOINTS CRUD BÁSICOS ====================

@router.post("/registrar", status_code=status.HTTP_201_CREATED)
def crear_indicadores_programa(
    indicadores: CrearIndicadoresPrograma,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para crear indicadores de programa"
            )
        
        creado = crud.crear_indicadores(db, indicadores)

        if creado:
            return {
                "message": "Indicadores de programa creados correctamente",
                "numero_ficha": indicadores.numero_ficha,
                "cod_programa": indicadores.cod_programa,
                "version": indicadores.version
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener TODOS los indicadores ---
@router.get("/", status_code=status.HTTP_200_OK, response_model=List[RetornoIndicadoresPrograma])
def get_todos_indicadores(
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener todos los indicadores de programa"
            )
        
        resultados = crud.get_todos_indicadores(db)
        return resultados
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RUTAS CON PREFIJOS FIJOS (PRIMERO) ====================

# --- Ruta para obtener indicadores por número de ficha (único) ---
@router.get("/ficha/{numero_ficha}", status_code=status.HTTP_200_OK, response_model=RetornoIndicadoresPrograma)
def get_indicadores_by_ficha(
    numero_ficha: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener indicadores por ficha"
            )
        
        resultado = crud.get_indicadores_by_numero_ficha(db, numero_ficha)
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ENDPOINTS DE ESTADÍSTICAS (PREFIJOS FIJOS) ====================

# **TODAS las rutas con prefijo /estadisticas/ van juntas y ANTES de las dinámicas**

@router.get("/estadisticas/consolidado-general", status_code=status.HTTP_200_OK)
def obtener_consolidado_general(
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene un consolidado general de todos los indicadores de todos los programas.
    Útil para análisis a nivel institucional.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener el consolidado general"
            )
        
        query = text("""
            SELECT 
                COUNT(DISTINCT cod_programa) as total_programas,
                COUNT(DISTINCT version) as total_versiones,
                COUNT(*) as total_fichas,
                SUM(COALESCE(gran_total, 0)) as total_participantes,
                SUM(COALESCE(indig_apr_tot, 0)) as total_indigenas,
                SUM(COALESCE(afro_apr_tot, 0)) as total_afrodescendientes,
                SUM(COALESCE(discap_apr_tot, 0)) as total_discapacidad,
                SUM(COALESCE(adol_conf_ley_apr_tot, 0)) as total_adolescentes_conflicto_ley,
                SUM(COALESCE(inpec_apr_tot, 0)) as total_privados_libertad
            FROM Indicadores_programa
        """)
        
        resultado = db.execute(query).mappings().first()
        consolidado = dict(resultado)
        
        # Calcular porcentajes
        total_participantes = consolidado["total_participantes"]
        if total_participantes > 0:
            consolidado["porcentaje_indigenas"] = round((consolidado["total_indigenas"] / total_participantes) * 100, 2)
            consolidado["porcentaje_afrodescendientes"] = round((consolidado["total_afrodescendientes"] / total_participantes) * 100, 2)
            consolidado["porcentaje_discapacidad"] = round((consolidado["total_discapacidad"] / total_participantes) * 100, 2)
            consolidado["porcentaje_adolescentes_conflicto"] = round((consolidado["total_adolescentes_conflicto_ley"] / total_participantes) * 100, 2)
        
        return consolidado
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/estadisticas/totales/{cod_programa}", status_code=status.HTTP_200_OK)
def obtener_estadisticas_totales(
    cod_programa: int,
    version: Optional[str] = Query(None, description="Versión específica (opcional)"),
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene estadísticas totales de indicadores para un programa.
    Incluye sumas, promedios y porcentajes por categoría principal.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener estadísticas totales"
            )
        
        estadisticas = crud.obtener_estadisticas_totales_programa(db, cod_programa, version)
        return estadisticas
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/estadisticas/comparativa/{cod_programa}", status_code=status.HTTP_200_OK)
def obtener_comparativa_versiones(
    cod_programa: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Compara los indicadores entre diferentes versiones del mismo programa.
    Muestra crecimiento y evolución de las métricas.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener comparativa de versiones"
            )
        
        comparativa = crud.obtener_comparativa_versiones_programa(db, cod_programa)
        return comparativa
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/estadisticas/distribucion/{cod_programa}", status_code=status.HTTP_200_OK)
def obtener_distribucion_porcentual(
    cod_programa: int,
    version: Optional[str] = Query(None, description="Versión específica (opcional)"),
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene la distribución porcentual de las diferentes categorías de indicadores.
    Permite analizar la composición de la población beneficiaria.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener distribución porcentual"
            )
        
        distribucion = crud.obtener_distribucion_porcentual_categorias(db, cod_programa, version)
        return distribucion
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/estadisticas/tendencias/{cod_programa}", status_code=status.HTTP_200_OK)
def obtener_tendencias_historicas(
    cod_programa: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Analiza las tendencias históricas de los indicadores a través de las versiones.
    Identifica patrones de crecimiento y cambios en la composición poblacional.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener tendencias históricas"
            )
        
        tendencias = crud.obtener_tendencias_historicas(db, cod_programa)
        return tendencias
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reporte/resumen/{cod_programa}", status_code=status.HTTP_200_OK)
def generar_reporte_resumen(
    cod_programa: int,
    version: Optional[str] = Query(None, description="Versión específica (opcional)"),
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Genera un reporte ejecutivo resumido con los datos más relevantes.
    Ideal para presentaciones y dashboards.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para generar reportes resumen"
            )
        
        # Obtener todas las estadísticas en un solo endpoint
        estadisticas = crud.obtener_estadisticas_totales_programa(db, cod_programa, version)
        distribucion = crud.obtener_distribucion_porcentual_categorias(db, cod_programa, version)
        
        # Si no se especifica versión, obtener comparativa
        if not version:
            comparativa = crud.obtener_comparativa_versiones_programa(db, cod_programa)
            return {
                "tipo_reporte": "completo",
                "programa": cod_programa,
                "estadisticas_totales": estadisticas,
                "distribucion_categorias": distribucion,
                "comparativa_versiones": comparativa
            }
        else:
            return {
                "tipo_reporte": "por_version",
                "programa": cod_programa,
                "version": version,
                "estadisticas_totales": estadisticas,
                "distribucion_categorias": distribucion
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RUTAS DINÁMICAS CON PARÁMETROS (AL FINAL) ====================

# **IMPORTANTE: Estas rutas van AL FINAL porque son más genéricas**

# --- Ruta para obtener TODOS los indicadores de un programa ---

# ==================== NUEVO ENDPOINT (DEBE IR ANTES) ====================

@router.get("/buscar-programa/{cod_programa}", status_code=status.HTTP_200_OK)
def buscar_programa_codigo_dando_nombre(
    cod_programa: int,
    version: Optional[str] = None,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Busca el nombre y detalles de un programa por su código.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para buscar programas"
            )
        
        # Construir la consulta SQL directa
        if version:
            # Buscar versión específica
            sql = text("""
                SELECT 
                    cod_programa,
                    version,
                    nombre,
                    nivel,
                    id_red,
                    tiempo_dur,
                    unidad_dur,
                    estado,
                    url_pdf
                FROM Programas_formacion
                WHERE cod_programa = :cod_programa 
                  AND version = :version
            """)
            params = {"cod_programa": cod_programa, "version": version}
        else:
            # Buscar todas las versiones
            sql = text("""
                SELECT 
                    cod_programa,
                    version,
                    nombre,
                    nivel,
                    id_red,
                    tiempo_dur,
                    unidad_dur,
                    estado,
                    url_pdf
                FROM Programas_formacion
                WHERE cod_programa = :cod_programa
                ORDER BY version DESC
            """)
            params = {"cod_programa": cod_programa}
        
        # Ejecutar consulta
        resultados = db.execute(sql, params).mappings().all()
        
        if not resultados:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró programa con código {cod_programa}" + 
                    (f" y versión {version}" if version else "")
            )
        
        # Convertir resultados a diccionarios
        programas = [dict(row) for row in resultados]
        
        # Si se especificó versión, devolver solo ese programa
        if version and len(programas) == 1:
            programa = programas[0]
            return {
                "cod_programa": programa["cod_programa"],
                "version": programa["version"],
                "nombre": programa["nombre"],
                "nivel": programa["nivel"],
                "id_red": programa["id_red"],
                "tiempo_dur": programa["tiempo_dur"],
                "unidad_dur": programa["unidad_dur"],
                "estado": programa["estado"],
                "url_pdf": programa["url_pdf"]
            }
        
        # Si no se especifica versión, devolver todas
        return {
            "cod_programa": cod_programa,
            "total_versiones": len(programas),
            "versiones": [
                {
                    "version": p["version"],
                    "nombre": p["nombre"],
                    "nivel": p["nivel"],
                    "estado": p["estado"],
                    "url_pdf": p["url_pdf"]
                }
                for p in programas
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RUTAS DINÁMICAS CON PARÁMETROS (AL FINAL) ====================

# **IMPORTANTE: Estas rutas van AL FINAL porque son más genéricas**

# --- Ruta para obtener TODOS los indicadores de un programa ---
@router.get("/programa/{cod_programa}", status_code=status.HTTP_200_OK, response_model=List[RetornoIndicadoresPrograma])
def get_indicadores_by_programa(
    cod_programa: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene TODOS los registros de indicadores de un programa específico.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener indicadores por programa"
            )
        
        resultados = crud.get_indicadores_by_cod_programa(db, cod_programa)
        return resultados
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener indicadores de un programa y versión específicos ---
@router.get("/{cod_programa}/{version}", status_code=status.HTTP_200_OK, response_model=List[RetornoIndicadoresPrograma])
def get_indicadores_by_programa_version(
    cod_programa: int,
    version: str,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene indicadores de un programa y versión específicos.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener indicadores por programa y versión"
            )
        
        resultados = crud.get_indicadores_by_programa_version(db, cod_programa, version)
        return resultados
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/programa/{cod_programa}", status_code=status.HTTP_200_OK, response_model=List[RetornoIndicadoresPrograma])
def get_indicadores_by_programa(
    cod_programa: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene TODOS los registros de indicadores de un programa específico.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener indicadores por programa"
            )
        
        resultados = crud.get_indicadores_by_cod_programa(db, cod_programa)
        return resultados
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener indicadores de un programa y versión específicos ---
@router.get("/{cod_programa}/{version}", status_code=status.HTTP_200_OK, response_model=List[RetornoIndicadoresPrograma])
def get_indicadores_by_programa_version(
    cod_programa: int,
    version: str,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene indicadores de un programa y versión específicos.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener indicadores por programa y versión"
            )
        
        resultados = crud.get_indicadores_by_programa_version(db, cod_programa, version)
        return resultados
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/ficha/{numero_ficha}", status_code=status.HTTP_200_OK)
def editar_indicadores_programa(
    numero_ficha: int,
    indicadores_update: EditarIndicadoresPrograma,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para editar indicadores de programa"
            )
        
        actualizado = crud.update_indicadores(db, numero_ficha, indicadores_update)

        if actualizado:
            return {
                "message": "Indicadores de programa editados correctamente",
                "numero_ficha": numero_ficha
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/ficha/{numero_ficha}", status_code=status.HTTP_200_OK)
def eliminar_indicadores_programa(
    numero_ficha: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para eliminar indicadores de programa"
            )
        
        eliminado = crud.indicadores_delete(db, numero_ficha)

        if eliminado:
            return {
                "message": "Indicadores de programa eliminados correctamente",
                "numero_ficha": numero_ficha
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))