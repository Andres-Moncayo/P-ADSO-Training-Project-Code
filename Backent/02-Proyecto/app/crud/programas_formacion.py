from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional, List, Dict, Any
import logging  

from app.schemas.programas_formacion import CrearProgramaFormacion, RetornoProgramaFormacion, EditarProgramaFormacion 

logger = logging.getLogger(__name__)

# ==================== FUNCIONES CRUD ====================


def get_programas_con_filtros(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    cod_programa: Optional[int] = None,
    nombre: Optional[str] = None,
    nivel: Optional[str] = None,
    estado: Optional[str] = None,
    id_red: Optional[int] = None,
    ordenar_por: str = "cod_programa",
    orden: str = "desc"
) -> Dict[str, Any]:
    """
    Obtiene programas de formación con filtros opcionales.
    """
    try:
        # Construir consulta dinámica
        condiciones = []
        params = {}
        
        if cod_programa is not None:
            condiciones.append("pf.cod_programa = :cod_programa")
            params["cod_programa"] = cod_programa
            
        if nombre:
            condiciones.append("LOWER(pf.nombre) LIKE LOWER(:nombre)")
            params["nombre"] = f"%{nombre}%"
            
        if nivel:
            condiciones.append("pf.nivel = :nivel")
            params["nivel"] = nivel
            
        if estado:
            condiciones.append("pf.estado = :estado")
            params["estado"] = estado
            
        if id_red is not None:
            condiciones.append("pf.id_red = :id_red")
            params["id_red"] = id_red
        
        where_clause = " AND ".join(condiciones) if condiciones else "1=1"
        
        # Validar parámetros de ordenación
        columnas_validas = ["cod_programa", "nombre", "nivel", "estado", "tiempo_dur"]
        if ordenar_por not in columnas_validas:
            ordenar_por = "cod_programa"
        
        orden = "DESC" if orden.lower() == "desc" else "ASC"
        
        # Consulta principal
        query = text(f"""
            SELECT 
                pf.cod_programa,
                pf.version,
                pf.nombre,
                pf.nivel,
                pf.id_red,
                pf.tiempo_dur,
                pf.unidad_dur,
                pf.estado,
                pf.url_pdf,
                rc.nombre AS nombre_red
            FROM Programas_formacion pf
            LEFT JOIN Redes_conocimiento rc 
                ON pf.id_red = rc.id_red
            WHERE {where_clause}
            ORDER BY pf.{ordenar_por} {orden}, pf.version DESC
            LIMIT :limit OFFSET :skip
        """)
        
        params["skip"] = skip
        params["limit"] = limit
        
        result = db.execute(query, params).mappings().all()
        
        # Consulta para contar total con filtros
        count_query = text(f"""
            SELECT COUNT(*) as total
            FROM Programas_formacion pf
            WHERE {where_clause}
        """)
        
        total_result = db.execute(count_query, {k: v for k, v in params.items() if k not in ['skip', 'limit']}).mappings().first()
        total = total_result["total"] if total_result else 0
        
        return {
            "programas": [dict(row) for row in result],
            "paginacion": {
                "skip": skip,
                "limit": limit,
                "total": total,
                "pagina_actual": (skip // limit) + 1 if limit > 0 else 1,
                "total_paginas": (total + limit - 1) // limit if limit > 0 else 1
            },
            "filtros_aplicados": {
                "cod_programa": cod_programa,
                "nombre": nombre,
                "nivel": nivel,
                "estado": estado,
                "id_red": id_red
            }
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener programas con filtros: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")
    


    
def crear_programa(db: Session, programa: CrearProgramaFormacion) -> Optional[bool]:
    """
    Crea un nuevo programa de formación en la base de datos.
    """
    try:
        dataUser = programa.model_dump()
        
        query = text("""
            INSERT INTO Programas_formacion 
            (cod_programa, version, nombre, nivel, id_red, tiempo_dur, unidad_dur, estado, url_pdf)
            VALUES 
            (:cod_programa, :version, :nombre, :nivel, :id_red, :tiempo_dur, :unidad_dur, :estado, :url_pdf)
        """)

        db.execute(query, dataUser)
        db.commit()

        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear programa: {e}")
        if "Duplicate entry" in str(e) or "duplicate key" in str(e):
            raise HTTPException(
                status_code=400, 
                detail=f"Ya existe un programa con código {programa.cod_programa} y versión {programa.version}"
            )
        raise HTTPException(status_code=500, detail="Error de base de datos al crear el programa")
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado al crear programa: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_programa_by_cod_and_version(db: Session, cod_programa: int, version: str) -> Optional[dict]:
    """
    Busca un programa de formación por su código y versión (clave primaria compuesta).
    INCLUYE el nombre de la red desde Redes_conocimiento.
    """
    try:
        query = text("""
            SELECT 
                pf.cod_programa,
                pf.version,
                pf.nombre,
                pf.nivel,
                pf.id_red,
                pf.tiempo_dur,
                pf.unidad_dur,
                pf.estado,
                pf.url_pdf,
                rc.nombre AS nombre_red
            FROM Programas_formacion pf
            LEFT JOIN Redes_conocimiento rc 
                ON pf.id_red = rc.id_red
            WHERE pf.cod_programa = :cod_programa AND pf.version = :version
        """)

        result = db.execute(query, {"cod_programa": cod_programa, "version": version}).mappings().first()
        
        if result:
            logger.info(f"Programa encontrado: {result['nombre']} (v{result['version']})")
        else:
            logger.warning(f"No se encontró programa con código {cod_programa} y versión {version}")
            
        return dict(result) if result else None
        
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar programa {cod_programa} v{version}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos al buscar programa: {str(e)}")

def get_programas_by_cod(db: Session, cod_programa: int) -> List[dict]:
    """
    Busca TODAS las versiones de un programa por su código.
    INCLUYE el nombre de la red desde Redes_conocimiento.
    """
    try:
        query = text("""
            SELECT 
                pf.cod_programa,
                pf.version,
                pf.nombre,
                pf.nivel,
                pf.id_red,
                pf.tiempo_dur,
                pf.unidad_dur,
                pf.estado,
                pf.url_pdf,
                rc.nombre AS nombre_red
            FROM Programas_formacion pf
            LEFT JOIN Redes_conocimiento rc 
                ON pf.id_red = rc.id_red
            WHERE pf.cod_programa = :cod_programa
            ORDER BY pf.version DESC
        """)

        result = db.execute(query, {"cod_programa": cod_programa}).mappings().all()
        logger.info(f"Encontradas {len(result)} versiones para código {cod_programa}")
        return [dict(row) for row in result]
        
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar programas por código {cod_programa}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos al buscar programas: {str(e)}")

def get_programas_by_id_red(db: Session, id_red: int) -> List[dict]:
    """
    Busca TODOS los programas de una red de conocimiento.
    INCLUYE el nombre de la red desde Redes_conocimiento.
    """
    try:
        query = text("""
            SELECT 
                pf.cod_programa,
                pf.version,
                pf.nombre,
                pf.nivel,
                pf.id_red,
                pf.tiempo_dur,
                pf.unidad_dur,
                pf.estado,
                pf.url_pdf,
                rc.nombre AS nombre_red
            FROM Programas_formacion pf
            LEFT JOIN Redes_conocimiento rc 
                ON pf.id_red = rc.id_red
            WHERE pf.id_red = :id_red
            ORDER BY pf.cod_programa, pf.version
        """)

        result = db.execute(query, {"id_red": id_red}).mappings().all()
        logger.info(f"Encontrados {len(result)} programas para red {id_red}")
        return [dict(row) for row in result]
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar programas por id_red {id_red}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos al buscar programas por red: {str(e)}")

def get_programa_con_registro_calificado(db: Session, cod_programa: int, version: str) -> Optional[dict]:
    """
    Busca un programa de formación por código y versión,
    e incluye su registro calificado si existe.
    NOTA: Los campos de fecha se devuelven como objetos datetime.date
    """
    try:
        query = text("""
            SELECT 
                -- Datos del programa
                pf.cod_programa,
                pf.version,
                pf.nombre,
                pf.nivel,
                pf.id_red,
                pf.tiempo_dur,
                pf.unidad_dur,
                pf.estado,
                pf.url_pdf,
                rc.nombre AS nombre_red,
                
                -- Datos del registro calificado (LEFT JOIN, puede ser NULL)
                reg.tipo_tramite,
                reg.fecha_radicado,
                reg.numero_resolucion,
                reg.fecha_resolucion,
                reg.fecha_vencimiento,
                reg.vigencia,
                reg.modalidad,
                reg.clasificacion,
                reg.estado_catalogo
            FROM Programas_formacion pf
            LEFT JOIN Redes_conocimiento rc 
                ON pf.id_red = rc.id_red
            LEFT JOIN Registro_calificado reg
                ON pf.cod_programa = reg.cod_programa 
                AND pf.version = reg.version
            WHERE pf.cod_programa = :cod_programa 
                AND pf.version = :version
        """)

        result = db.execute(query, {"cod_programa": cod_programa, "version": version}).mappings().first()
        
        if result:
            logger.info(f"Programa con registro encontrado: {result['nombre']} (v{result['version']})")
        else:
            logger.warning(f"No se encontró programa {cod_programa} v{version}")
            
        return dict(result) if result else None
        
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar programa con registro {cod_programa} v{version}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def get_programas_con_registros_by_cod(db: Session, cod_programa: int) -> List[dict]:
    """
    Busca TODAS las versiones de un programa por su código,
    e incluye sus registros calificados si existen.
    NOTA: Los campos de fecha se devuelven como objetos datetime.date
    """
    try:
        query = text("""
            SELECT 
                -- Datos del programa
                pf.cod_programa,
                pf.version,
                pf.nombre,
                pf.nivel,
                pf.id_red,
                pf.tiempo_dur,
                pf.unidad_dur,
                pf.estado,
                pf.url_pdf,
                rc.nombre AS nombre_red,
                
                -- Datos del registro calificado (LEFT JOIN, puede ser NULL)
                reg.tipo_tramite,
                reg.fecha_radicado,
                reg.numero_resolucion,
                reg.fecha_resolucion,
                reg.fecha_vencimiento,
                reg.vigencia,
                reg.modalidad,
                reg.clasificacion,
                reg.estado_catalogo
            FROM Programas_formacion pf
            LEFT JOIN Redes_conocimiento rc 
                ON pf.id_red = rc.id_red
            LEFT JOIN Registro_calificado reg
                ON pf.cod_programa = reg.cod_programa 
                AND pf.version = reg.version
            WHERE pf.cod_programa = :cod_programa
            ORDER BY pf.version DESC
        """)

        results = db.execute(query, {"cod_programa": cod_programa}).mappings().all()
        logger.info(f"Encontradas {len(results)} versiones con registros para código {cod_programa}")
        return [dict(row) for row in results]
        
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar programas con registros por código {cod_programa}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def delete_programa(db: Session, cod_programa: int, version: str) -> bool:
    """
    Elimina un programa específico por código y versión.
    """
    try:
        query = text("""
            DELETE FROM Programas_formacion
            WHERE cod_programa = :cod_programa AND version = :version
        """)

        result = db.execute(query, {"cod_programa": cod_programa, "version": version})
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Programa con código {cod_programa} y versión {version} no encontrado"
            )

        db.commit()
        return True

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al eliminar programa {cod_programa} v{version}: {e}")
        
        # Verificar si hay violación de clave foránea
        if "foreign key constraint" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar el programa porque tiene registros relacionados"
            )
        
        raise HTTPException(status_code=500, detail=f"Error de base de datos al eliminar programa: {str(e)}")


def trim_programas_table(db: Session, max_rows: int = 50) -> int:
    """
    Mantiene como máximo `max_rows` filas en la tabla `Programas_formacion`.
    Elimina las filas más antiguas ordenando por `cod_programa ASC, version ASC`.
    Devuelve el número de filas eliminadas.
    """
    try:
        total_q = text("SELECT COUNT(*) as total FROM Programas_formacion")
        total_res = db.execute(total_q).mappings().first()
        total = int(total_res["total"] or 0)

        if total <= max_rows:
            return 0

        to_delete = total - max_rows

        # Seleccionar las claves a eliminar (las más antiguas)
        sel_q = text(
            "SELECT cod_programa, version FROM Programas_formacion "
            "ORDER BY cod_programa ASC, version ASC LIMIT :to_delete"
        )
        rows = db.execute(sel_q, {"to_delete": to_delete}).fetchall()

        if not rows:
            return 0

        # Eliminar fila por fila (forma portable entre motores SQL)
        deleted = 0
        for r in rows:
            del_q = text(
                "DELETE FROM Programas_formacion WHERE cod_programa = :cod_programa AND version = :version"
            )
            res = db.execute(del_q, {"cod_programa": r[0], "version": r[1]})
            deleted += res.rowcount if res is not None else 0

        db.commit()
        logger.info(f"trim_programas_table: total={total}, eliminadas={deleted}")
        return deleted

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al recortar tabla Programas_formacion: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos al recortar programas: {str(e)}")

def update_programa(
    db: Session, cod_programa: int, version: str, programa_update: EditarProgramaFormacion
) -> bool:
    """
    Actualiza un programa específico por código y versión.
    NO permite cambiar cod_programa ni version (parte de la PK).
    """
    try:
        # Obtener campos a actualizar
        data = programa_update.model_dump(exclude_unset=True)
        
        if not data:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")

        # Construir SET clause dinámicamente
        set_clause = ", ".join([f"{key} = :{key}" for key in data.keys()])
        
        # Agregar condiciones de búsqueda
        data["cod_programa"] = cod_programa
        data["version"] = version

        query = text(f"""
            UPDATE Programas_formacion
            SET {set_clause}
            WHERE cod_programa = :cod_programa AND version = :version
        """)

        result = db.execute(query, data)

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Programa con código {cod_programa} y versión {version} no encontrado"
            )

        db.commit()
        return True

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar programa {cod_programa} v{version}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos al actualizar programa: {str(e)}")