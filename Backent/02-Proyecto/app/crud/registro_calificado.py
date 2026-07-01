from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging 
from sqlalchemy import text
from typing import Optional, List

from app.schemas.registro_calificado import CrearRegistroCalificado, RetornoRegistroCalificado, EditarRegistroCalificado

logger = logging.getLogger(__name__)

def crear_registro_calificado(db: Session, registro: CrearRegistroCalificado) -> Optional[bool]:
    try:
        dataRegistro = registro.model_dump()

        query = text("""
            INSERT INTO Registro_calificado(
                     cod_programa,
                     version,  -- NUEVO CAMPO
                     tipo_tramite,
                     fecha_radicado,
                     numero_resolucion,
                     fecha_resolucion,
                     fecha_vencimiento,
                     vigencia,
                     modalidad,
                     clasificacion,
                     estado_catalogo
                     ) VALUES(
                     :cod_programa,
                     :version,  -- NUEVO CAMPO
                     :tipo_tramite,
                     :fecha_radicado,
                     :numero_resolucion,
                     :fecha_resolucion,
                     :fecha_vencimiento,
                     :vigencia,
                     :modalidad,
                     :clasificacion,
                     :estado_catalogo
            )
        """)
        db.execute(query, dataRegistro)
        db.commit()
        return True     
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear registro calificado: {e}")
        if "Duplicate entry" in str(e) or "duplicate key" in str(e):
            raise HTTPException(
                status_code=400, 
                detail=f"Ya existe un registro para el programa {registro.cod_programa} versión {registro.version}"
            )
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado al crear registro calificado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_registro_by_cod_programa(db: Session, cod_programa: int, version: str) -> Optional[dict]:
    try:
        query = text("""
            SELECT 
                cod_programa,
                version,  -- NUEVO CAMPO
                tipo_tramite,
                fecha_radicado,
                numero_resolucion,
                fecha_resolucion,
                fecha_vencimiento,
                vigencia,
                modalidad,
                clasificacion,
                estado_catalogo
            FROM Registro_calificado
            WHERE cod_programa = :cod_programa AND version = :version
        """)

        result = db.execute(query, {"cod_programa": cod_programa, "version": version}).mappings().first()

        if result is None:
            raise HTTPException(
                status_code=404, 
                detail=f"No existe registro calificado para el programa {cod_programa} versión {version}"
            )

        return dict(result)

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener el registro calificado: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def get_todos_registros_por_programa(db: Session, cod_programa: int) -> List[dict]:
    try:
        query = text("""
            SELECT 
                cod_programa,
                version,
                tipo_tramite,
                fecha_radicado,
                numero_resolucion,
                fecha_resolucion,
                fecha_vencimiento,
                vigencia,
                modalidad,
                clasificacion,
                estado_catalogo
            FROM Registro_calificado
            WHERE cod_programa = :cod_programa
            ORDER BY version DESC
        """)

        results = db.execute(query, {"cod_programa": cod_programa}).mappings().all()

        if not results:
            raise HTTPException(
                status_code=404, 
                detail=f"No existen registros para el programa {cod_programa}"
            )

        return [dict(result) for result in results]

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener registros por programa: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def get_todos_registros_calificados(db: Session) -> List[dict]:
    try:
        query = text("""
            SELECT 
                cod_programa,
                version,
                tipo_tramite,
                fecha_radicado,
                numero_resolucion,
                fecha_resolucion,
                fecha_vencimiento,
                vigencia,
                modalidad,
                clasificacion,
                estado_catalogo
            FROM Registro_calificado
            ORDER BY cod_programa, version DESC
        """)

        results = db.execute(query).mappings().all()
        
        registros = []
        for result in results:
            registro = dict(result)
            registros.append(registro)
        
        return registros

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todos los registros calificados: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def update_registro_calificado(
    db: Session, cod_programa: int, version: str, registro: EditarRegistroCalificado
) -> Optional[bool]:
    try:
        dataRegistro = registro.model_dump(exclude_unset=True)
        
        if not dataRegistro:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")
        
        set_clause = ", ".join([f"{key} = :{key}" for key in dataRegistro.keys()])
        
        query = text(f"""
            UPDATE Registro_calificado
            SET {set_clause}
            WHERE cod_programa = :cod_programa AND version = :version
        """)
        
        dataRegistro["cod_programa"] = cod_programa
        dataRegistro["version"] = version
        
        result = db.execute(query, dataRegistro)
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Registro calificado para programa {cod_programa} versión {version} no encontrado"
            )
        
        db.commit()
        return True

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar el registro calificado: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def delete_registro_calificado(db: Session, cod_programa: int, version: str) -> Optional[bool]:
    try:
        query = text("""
            DELETE FROM Registro_calificado
            WHERE cod_programa = :cod_programa AND version = :version
        """)
        
        result = db.execute(query, {"cod_programa": cod_programa, "version": version})
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Registro calificado para programa {cod_programa} versión {version} no encontrado"
            )
        
        db.commit()
        return True

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al eliminar el registro calificado: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")