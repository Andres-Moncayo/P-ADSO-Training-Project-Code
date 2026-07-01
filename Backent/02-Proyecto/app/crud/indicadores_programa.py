from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional, List, Dict, Any
import logging  

from app.schemas.indicadores_programa import CrearIndicadoresPrograma, RetornoIndicadoresPrograma, EditarIndicadoresPrograma

logger = logging.getLogger(__name__)

# ==================== FUNCIONES CRUD BÁSICAS ====================

def crear_indicadores(db: Session, indicadores: CrearIndicadoresPrograma) -> Optional[bool]:
    try:
        data = indicadores.model_dump()

        # Construcción dinámica del INSERT incluyendo numero_ficha, cod_programa y version
        columnas = ", ".join(data.keys())
        valores = ", ".join([f":{k}" for k in data.keys()])

        query = text(f"""
            INSERT INTO Indicadores_programa ({columnas})
            VALUES ({valores})
        """)

        db.execute(query, data)
        db.commit()
        return True

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear indicadores: {e}")
        if "Duplicate entry" in str(e) or "duplicate key" in str(e):
            raise HTTPException(
                status_code=400, 
                detail=f"Ya existe una ficha con número {indicadores.numero_ficha}"
            )
        if "foreign key constraint" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail=f"El programa {indicadores.cod_programa} versión {indicadores.version} no existe"
            )
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado al crear indicadores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_indicadores_by_numero_ficha(db: Session, numero_ficha: int) -> Optional[dict]:
    """Obtiene un registro de indicadores por su número de ficha único."""
    try:
        query = text("""
            SELECT *
            FROM Indicadores_programa
            WHERE numero_ficha = :numero_ficha
        """)

        result = db.execute(query, {"numero_ficha": numero_ficha}).mappings().first()

        if result is None:
            raise HTTPException(
                status_code=404, 
                detail=f"No existen indicadores para la ficha {numero_ficha}"
            )

        return dict(result)

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener indicadores por numero_ficha {numero_ficha}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def get_indicadores_by_cod_programa(db: Session, cod_programa: int) -> List[dict]:
    """Obtiene TODOS los registros de indicadores de un programa específico."""
    try:
        query = text("""
            SELECT *
            FROM Indicadores_programa
            WHERE cod_programa = :cod_programa
            ORDER BY numero_ficha
        """)

        results = db.execute(query, {"cod_programa": cod_programa}).mappings().all()

        if not results:
            raise HTTPException(
                status_code=404, 
                detail=f"No existen indicadores para el programa {cod_programa}"
            )

        return [dict(result) for result in results]

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener indicadores por cod_programa {cod_programa}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def get_indicadores_by_programa_version(db: Session, cod_programa: int, version: str) -> List[dict]:
    """Obtiene TODOS los registros de indicadores de un programa y versión específicos."""
    try:
        query = text("""
            SELECT *
            FROM Indicadores_programa
            WHERE cod_programa = :cod_programa AND version = :version
            ORDER BY numero_ficha
        """)

        results = db.execute(query, {"cod_programa": cod_programa, "version": version}).mappings().all()

        if not results:
            raise HTTPException(
                status_code=404, 
                detail=f"No existen indicadores para el programa {cod_programa} versión {version}"
            )

        return [dict(result) for result in results]

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener indicadores por programa {cod_programa} v{version}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def get_todos_indicadores(db: Session) -> List[dict]:
    """Obtiene TODOS los registros de indicadores."""
    try:
        query = text("""
            SELECT *
            FROM Indicadores_programa
            ORDER BY cod_programa, version, numero_ficha
        """)

        results = db.execute(query).mappings().all()
        return [dict(result) for result in results]

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todos los indicadores: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def indicadores_delete(db: Session, numero_ficha: int) -> bool:
    """Elimina un registro de indicadores por su número de ficha."""
    try:
        query = text("""
            DELETE FROM Indicadores_programa
            WHERE numero_ficha = :numero_ficha
        """)

        result = db.execute(query, {"numero_ficha": numero_ficha})

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Indicadores con ficha {numero_ficha} no encontrados"
            )

        db.commit()
        return True

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al eliminar indicadores ficha {numero_ficha}: {e}")
        if "foreign key constraint" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="No se pueden eliminar los indicadores porque tienen registros relacionados"
            )
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")


def trim_indicadores_table(db: Session, max_rows: int = 50) -> int:
    """
    Mantiene como máximo `max_rows` filas en la tabla `Indicadores_programa`.
    Elimina las filas más antiguas ordenando por `numero_ficha` asc (asumimos autoincrement).
    Devuelve el número de filas eliminadas.
    """
    try:
        total_q = text("SELECT COUNT(*) as total FROM Indicadores_programa")
        total_res = db.execute(total_q).mappings().first()
        total = int(total_res["total"] or 0)

        if total <= max_rows:
            return 0

        to_delete = total - max_rows

        # Muchos motores SQL permiten DELETE ... ORDER BY ... LIMIT n
        # Intentamos la forma directa; si falla, seleccionamos y borramos por filas.
        try:
            del_q = text(
                "DELETE FROM Indicadores_programa ORDER BY numero_ficha ASC LIMIT :to_delete"
            )
            res = db.execute(del_q, {"to_delete": to_delete})
            deleted = res.rowcount if res is not None else 0
            db.commit()
            logger.info(f"trim_indicadores_table: total={total}, eliminadas={deleted}")
            return deleted
        except SQLAlchemyError:
            # Fallback portable: seleccionar claves y eliminar una a una
            sel_q = text(
                "SELECT numero_ficha FROM Indicadores_programa ORDER BY numero_ficha ASC LIMIT :to_delete"
            )
            rows = db.execute(sel_q, {"to_delete": to_delete}).fetchall()
            deleted = 0
            for r in rows:
                d_q = text("DELETE FROM Indicadores_programa WHERE numero_ficha = :numero_ficha")
                rres = db.execute(d_q, {"numero_ficha": r[0]})
                deleted += rres.rowcount if rres is not None else 0

            db.commit()
            logger.info(f"trim_indicadores_table (fallback): total={total}, eliminadas={deleted}")
            return deleted

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al recortar tabla Indicadores_programa: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos al recortar indicadores: {str(e)}")

def update_indicadores(
    db: Session, numero_ficha: int, indicadores_update: EditarIndicadoresPrograma
) -> bool:
    """Actualiza los campos de indicadores de una ficha específica."""
    try:
        data = indicadores_update.model_dump(exclude_unset=True)

        if not data:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")

        set_clause = ", ".join([f"{key} = :{key}" for key in data.keys()])
        data["numero_ficha"] = numero_ficha

        query = text(f"""
            UPDATE Indicadores_programa
            SET {set_clause}
            WHERE numero_ficha = :numero_ficha
        """)

        result = db.execute(query, data)

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Indicadores con ficha {numero_ficha} no encontrados"
            )

        db.commit()
        return True

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar indicadores ficha {numero_ficha}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

# ==================== FUNCIONES DE ESTADÍSTICAS Y REPORTES ====================

def obtener_estadisticas_totales_programa(db: Session, cod_programa: int, version: str = None) -> Dict[str, Any]:
    """
    Obtiene estadísticas totales de indicadores para un programa (y versión específica si se proporciona).
    Calcula sumas, promedios y porcentajes por categoría.
    """
    try:
        condiciones = "cod_programa = :cod_programa"
        params = {"cod_programa": cod_programa}
        
        if version:
            condiciones += " AND version = :version"
            params["version"] = version
        
        # Consulta para obtener totales por categoría principal
        query = text(f"""
            SELECT 
                -- Totales por categorías principales
                SUM(COALESCE(indig_despl_viol_apr_tot, 0)) as total_victimas_indigenas,
                SUM(COALESCE(afro_despl_viol_apr_tot, 0)) as total_victimas_afro,
                SUM(COALESCE(despl_viol_apr_tot, 0)) as total_victimas_general,
                
                -- Totales por tipo de discapacidad
                SUM(COALESCE(discap_apr_tot, 0)) as total_discapacidad,
                SUM(COALESCE(discap_aud_apr_tot, 0)) as total_discapacidad_auditiva,
                SUM(COALESCE(discap_vis_apr_tot, 0)) as total_discapacidad_visual,
                SUM(COALESCE(discap_fis_apr_tot, 0)) as total_discapacidad_fisica,
                
                -- Totales por grupos étnicos
                SUM(COALESCE(indig_apr_tot, 0)) as total_indigenas,
                SUM(COALESCE(afro_apr_tot, 0)) as total_afrodescendientes,
                SUM(COALESCE(negro_apr_tot, 0)) as total_negros,
                
                -- Población vulnerable
                SUM(COALESCE(adol_conf_ley_apr_tot, 0)) as total_adolescentes_conflicto_ley,
                SUM(COALESCE(inpec_apr_tot, 0)) as total_privados_libertad,
                SUM(COALESCE(jov_vuln_apr_tot, 0)) as total_jovenes_vulnerables,
                SUM(COALESCE(muj_cabfam_apr_tot, 0)) as total_mujeres_cabeza_familia,
                
                -- Totales generales
                SUM(COALESCE(gran_total, 0)) as gran_total,
                COUNT(*) as total_fichas
            FROM Indicadores_programa
            WHERE {condiciones}
        """)
        
        result = db.execute(query, params).mappings().first()
        
        if not result or result["total_fichas"] == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontraron indicadores para el programa {cod_programa}" + 
                       (f" versión {version}" if version else "")
            )
        
        stats = dict(result)
        gran_total = stats.get("gran_total", 0)
        
        # Calcular porcentajes
        if gran_total > 0:
            stats["porcentaje_victimas"] = round((stats["total_victimas_general"] / gran_total) * 100, 2)
            stats["porcentaje_discapacidad"] = round((stats["total_discapacidad"] / gran_total) * 100, 2)
            stats["porcentaje_grupos_etnicos"] = round(
                ((stats["total_indigenas"] + stats["total_afrodescendientes"] + stats["total_negros"]) / gran_total) * 100, 2
            )
            stats["porcentaje_poblacion_vulnerable"] = round(
                ((stats["total_adolescentes_conflicto_ley"] + stats["total_privados_libertad"] + 
                  stats["total_jovenes_vulnerables"] + stats["total_mujeres_cabeza_familia"]) / gran_total) * 100, 2
            )
        
        return stats
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener estadísticas del programa {cod_programa}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def obtener_comparativa_versiones_programa(db: Session, cod_programa: int) -> Dict[str, Any]:
    """
    Compara los indicadores entre diferentes versiones del mismo programa.
    """
    try:
        # Obtener todas las versiones del programa
        query_versiones = text("""
            SELECT DISTINCT version
            FROM Indicadores_programa
            WHERE cod_programa = :cod_programa
            ORDER BY version
        """)
        
        versiones = db.execute(query_versiones, {"cod_programa": cod_programa}).fetchall()
        
        if not versiones:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontraron versiones para el programa {cod_programa}"
            )
        
        comparativa = {}
        for version_row in versiones:
            version = version_row[0]
            stats = obtener_estadisticas_totales_programa(db, cod_programa, version)
            comparativa[version] = stats
        
        # Calcular crecimiento entre versiones
        if len(comparativa) > 1:
            versiones_ordenadas = sorted(comparativa.keys())
            for i in range(1, len(versiones_ordenadas)):
                version_actual = versiones_ordenadas[i]
                version_anterior = versiones_ordenadas[i-1]
                
                total_actual = comparativa[version_actual]["gran_total"]
                total_anterior = comparativa[version_anterior]["gran_total"]
                
                if total_anterior > 0:
                    crecimiento = ((total_actual - total_anterior) / total_anterior) * 100
                    comparativa[version_actual]["crecimiento_porcentual"] = round(crecimiento, 2)
                else:
                    comparativa[version_actual]["crecimiento_porcentual"] = 100.0
        
        return {
            "programa": cod_programa,
            "total_versiones": len(comparativa),
            "comparativa": comparativa
        }
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener comparativa del programa {cod_programa}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def obtener_distribucion_porcentual_categorias(db: Session, cod_programa: int, version: str = None) -> Dict[str, Any]:
    """
    Obtiene la distribución porcentual de las diferentes categorías de indicadores.
    """
    try:
        condiciones = "cod_programa = :cod_programa"
        params = {"cod_programa": cod_programa}
        
        if version:
            condiciones += " AND version = :version"
            params["version"] = version
        
        # Consulta detallada por categorías
        query = text(f"""
            SELECT 
                -- Categoría: Víctimas del conflicto
                SUM(COALESCE(indig_despl_viol_apr_tot, 0) + 
                    COALESCE(afro_despl_viol_apr_tot, 0) + 
                    COALESCE(despl_viol_apr_tot, 0) + 
                    COALESCE(despl_disc_apr_tot, 0) + 
                    COALESCE(despojo_apr_tot, 0) + 
                    COALESCE(act_grup_arm_apr_tot, 0) + 
                    COALESCE(amenaza_apr_tot, 0) + 
                    COALESCE(del_sex_apr_tot, 0) + 
                    COALESCE(desap_forz_apr_tot, 0) + 
                    COALESCE(homi_masac_apr_tot, 0) + 
                    COALESCE(minas_exp_apr_tot, 0) + 
                    COALESCE(secuestro_apr_tot, 0) + 
                    COALESCE(tortura_apr_tot, 0) + 
                    COALESCE(uso_men_grup_arm_apr_tot, 0) + 
                    COALESCE(herido_apr_tot, 0) + 
                    COALESCE(reclut_forz_apr_tot, 0)) as total_victimas_conflicto,
                
                -- Categoría: Discapacidad
                SUM(COALESCE(discap_apr_tot, 0) + 
                    COALESCE(discap_aud_apr_tot, 0) + 
                    COALESCE(discap_vis_apr_tot, 0) + 
                    COALESCE(discap_fis_apr_tot, 0) + 
                    COALESCE(discap_int_apr_tot, 0) + 
                    COALESCE(discap_psico_apr_tot, 0) + 
                    COALESCE(discap_mult_apr_tot, 0) + 
                    COALESCE(sordoceg_apr_tot, 0)) as total_discapacidad_completo,
                
                -- Categoría: Grupos étnicos
                SUM(COALESCE(negro_apr_tot, 0) + 
                    COALESCE(afro_apr_tot, 0) + 
                    COALESCE(palenq_apr_tot, 0) + 
                    COALESCE(raizal_apr_tot, 0) + 
                    COALESCE(indig_apr_tot, 0) + 
                    COALESCE(rom_tot, 0)) as total_grupos_etnicos,
                
                -- Categoría: Población vulnerable especial
                SUM(COALESCE(adol_conf_ley_apr_tot, 0) + 
                    COALESCE(adol_trab_apr_tot, 0) + 
                    COALESCE(inpec_apr_tot, 0) + 
                    COALESCE(jov_vuln_apr_tot, 0) + 
                    COALESCE(muj_cabfam_apr_tot, 0) + 
                    COALESCE(proc_reint_apr_tot, 0) + 
                    COALESCE(ado_desv_gr_arm_tot, 0) + 
                    COALESCE(rem_pal_tot, 0) + 
                    COALESCE(sob_min_ant_tot, 0) + 
                    COALESCE(sold_camp_tot, 0) + 
                    COALESCE(terc_edad_tot, 0)) as total_vulnerable_especial,
                
                -- Total general
                SUM(COALESCE(gran_total, 0)) as gran_total
            FROM Indicadores_programa
            WHERE {condiciones}
        """)
        
        result = db.execute(query, params).mappings().first()
        
        if not result or result["gran_total"] == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontraron datos para calcular distribución"
            )
        
        data = dict(result)
        gran_total = data["gran_total"]
        
        # Calcular porcentajes
        distribucion = {
            "victimas_conflicto": {
                "total": data["total_victimas_conflicto"],
                "porcentaje": round((data["total_victimas_conflicto"] / gran_total) * 100, 2)
            },
            "discapacidad": {
                "total": data["total_discapacidad_completo"],
                "porcentaje": round((data["total_discapacidad_completo"] / gran_total) * 100, 2)
            },
            "grupos_etnicos": {
                "total": data["total_grupos_etnicos"],
                "porcentaje": round((data["total_grupos_etnicos"] / gran_total) * 100, 2)
            },
            "poblacion_vulnerable": {
                "total": data["total_vulnerable_especial"],
                "porcentaje": round((data["total_vulnerable_especial"] / gran_total) * 100, 2)
            }
        }
        
        return {
            "programa": cod_programa,
            "version": version if version else "todas",
            "gran_total": gran_total,
            "distribucion": distribucion
        }
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener distribución del programa {cod_programa}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def obtener_tendencias_historicas(db: Session, cod_programa: int) -> Dict[str, Any]:
    """
    Analiza las tendencias históricas de los indicadores a través de las versiones.
    """
    try:
        # Obtener datos históricos por versión
        query = text("""
            SELECT 
                version,
                SUM(COALESCE(gran_total, 0)) as total_participantes,
                SUM(COALESCE(indig_apr_tot, 0)) as total_indigenas,
                SUM(COALESCE(afro_apr_tot, 0)) as total_afrodescendientes,
                SUM(COALESCE(discap_apr_tot, 0)) as total_discapacidad,
                SUM(COALESCE(adol_conf_ley_apr_tot, 0)) as total_adolescentes_conflicto,
                COUNT(*) as total_fichas
            FROM Indicadores_programa
            WHERE cod_programa = :cod_programa
            GROUP BY version
            ORDER BY version
        """)
        
        resultados = db.execute(query, {"cod_programa": cod_programa}).mappings().all()
        
        if not resultados:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontraron datos históricos para el programa {cod_programa}"
            )
        
        historico = [dict(row) for row in resultados]
        
        # Calcular tendencias
        tendencias = []
        for i in range(1, len(historico)):
            actual = historico[i]
            anterior = historico[i-1]
            
            tendencia = {
                "version": actual["version"],
                "version_anterior": anterior["version"],
                "cambio_total_participantes": actual["total_participantes"] - anterior["total_participantes"],
                "cambio_porcentual_total": 0,
                "cambio_indigenas": actual["total_indigenas"] - anterior["total_indigenas"],
                "cambio_afrodescendientes": actual["total_afrodescendientes"] - anterior["total_afrodescendientes"],
                "cambio_discapacidad": actual["total_discapacidad"] - anterior["total_discapacidad"],
                "cambio_adolescentes_conflicto": actual["total_adolescentes_conflicto"] - anterior["total_adolescentes_conflicto"]
            }
            
            # Calcular cambio porcentual
            if anterior["total_participantes"] > 0:
                tendencia["cambio_porcentual_total"] = round(
                    ((actual["total_participantes"] - anterior["total_participantes"]) / anterior["total_participantes"]) * 100, 2
                )
            
            tendencias.append(tendencia)
        
        return {
            "programa": cod_programa,
            "total_versiones": len(historico),
            "datos_historicos": historico,
            "analisis_tendencias": tendencias,
            "resumen": {
                "version_mas_reciente": historico[-1]["version"] if historico else None,
                "total_participantes_actual": historico[-1]["total_participantes"] if historico else 0,
                "crecimiento_total": sum(t["cambio_total_participantes"] for t in tendencias) if tendencias else 0
            }
        }
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener tendencias del programa {cod_programa}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")


def buscar_programa_por_codigo(db: Session, cod_programa: int, version: str = None) -> Dict[str, Any]:
    """
    Busca un programa en la tabla Programas_formacion por su código.
    
    Args:
        db: Sesión de base de datos
        cod_programa: Código del programa a buscar
        version: Versión específica (opcional)
    
    Returns:
        Diccionario con la información del programa
    """
    try:
        # Construir la consulta base
        if version:
            # Buscar versión específica
            query = text("""
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
            query = text("""
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
        
        resultados = db.execute(query, params).mappings().all()
        
        if not resultados:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró el programa con código {cod_programa}" + 
                       (f" y versión {version}" if version else "")
            )
        
        # Convertir resultados
        programas = [dict(row) for row in resultados]
        
        # Si se especificó versión, devolver solo ese programa
        if version:
            return programas[0]
        
        # Si no se especificó versión, devolver todas con información adicional
        # Buscar también la red de conocimiento para cada programa
        for programa in programas:
            if programa.get("id_red"):
                try:
                    red_query = text("""
                        SELECT nombre 
                        FROM Redes_conocimiento 
                        WHERE id_red = :id_red
                    """)
                    red_result = db.execute(
                        red_query, 
                        {"id_red": programa["id_red"]}
                    ).mappings().first()
                    
                    if red_result:
                        programa["nombre_red"] = red_result["nombre"]
                except:
                    programa["nombre_red"] = None
        
        return {
            "cod_programa": cod_programa,
            "total_versiones": len(programas),
            "versiones": programas
        }
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar programa {cod_programa}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error de base de datos al buscar programa: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error inesperado al buscar programa {cod_programa}: {e}")
        raise HTTPException(status_code=500, detail=str(e))