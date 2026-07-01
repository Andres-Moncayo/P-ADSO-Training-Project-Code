from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging 
from sqlalchemy import text
from typing import Optional, List

from app.schemas.redes_conocimiento import CrearRedConocimiento, RetornoRedConocimiento, EditarRedConocimiento

logger = logging.getLogger(__name__)

def crear_RedConocimiento(db: Session, red: CrearRedConocimiento) -> Optional[bool]:
    """
    Crea una nueva red de conocimiento en la base de datos.
    """
    try:
        dataRed = red.model_dump()
        query = text("""
            INSERT INTO Redes_conocimiento(
                     nombre
                     ) VALUES(
                     :nombre
            )
        """)
        db.execute(query, dataRed)
        db.commit()
        return True     
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear red de conocimiento: {e}")
        if "Duplicate entry" in str(e) or "duplicate key" in str(e):
            raise HTTPException(
                status_code=400, 
                detail=f"Ya existe una red de conocimiento con el nombre '{red.nombre}'"
            )
        raise HTTPException(status_code=500, detail="Error de base de datos al crear la red de conocimiento")
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado al crear red de conocimiento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_red_by_id_red(db: Session, id_red: int) -> dict:
    """
    Obtiene una red de conocimiento por su ID.
    """
    try:
        query = text("""
            SELECT 
                id_red,
                nombre
            FROM Redes_conocimiento
            WHERE id_red = :id_red
        """)

        result = db.execute(query, {"id_red": id_red}).mappings().first()

        if result is None:
            raise HTTPException(
                status_code=404, 
                detail=f"No existe la red de conocimiento con ID {id_red}"
            )

        return {
            "id_red": result["id_red"],
            "nombre": result["nombre"]
        }

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la red por ID {id_red}: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error al obtener la red de conocimiento"
        )
    except Exception as e:
        logger.error(f"Error inesperado al obtener red por ID {id_red}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

def get_red_by_nombre(db: Session, nombre: str) -> dict:
    """
    Obtiene una red de conocimiento por su nombre exacto.
    """
    try:
        query = text("""
            SELECT 
                id_red,
                nombre
            FROM Redes_conocimiento
            WHERE nombre = :nombre
        """)

        result = db.execute(query, {"nombre": nombre}).mappings().first()

        if result is None:
            raise HTTPException(
                status_code=404, 
                detail=f"No existe la red de conocimiento con nombre '{nombre}'"
            )

        return {
            "id_red": result["id_red"],
            "nombre": result["nombre"]
        }

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la red por nombre '{nombre}': {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error al obtener la red de conocimiento"
        )
    except Exception as e:
        logger.error(f"Error inesperado al obtener red por nombre '{nombre}': {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

def get_todas_redes(db: Session) -> List[dict]:
    """
    Obtiene TODAS las redes de conocimiento registradas.
    Retorna una lista de diccionarios con id_red y nombre.
    """
    try:
        query = text("""
            SELECT 
                id_red,
                nombre
            FROM Redes_conocimiento
            ORDER BY nombre ASC
        """)

        result = db.execute(query).mappings().all()
        
        logger.info(f"Total redes encontradas: {len(result)}")
        
        # Convertir a lista de diccionarios con las claves exactas
        redes = []
        for row in result:
            redes.append({
                "id_red": row["id_red"],
                "nombre": row["nombre"]
            })
        
        return redes

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las redes: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error de base de datos: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error inesperado al obtener todas las redes: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error interno del servidor"
        )

def delete_red(db: Session, id_red: int) -> bool:
    """
    Elimina una red de conocimiento por su ID.
    """
    try:
        # Primero verificar si la red existe
        check_query = text("SELECT 1 FROM Redes_conocimiento WHERE id_red = :el_id")
        check_result = db.execute(check_query, {"el_id": id_red}).first()
        
        if not check_result:
            raise HTTPException(
                status_code=404, 
                detail=f"Red de conocimiento con ID {id_red} no encontrada"
            )
        
        # Verificar si hay programas asociados a esta red
        programas_query = text("SELECT COUNT(*) FROM Programas_formacion WHERE id_red = :el_id")
        programas_count = db.execute(programas_query, {"el_id": id_red}).scalar()
        
        if programas_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede eliminar la red porque tiene {programas_count} programa(s) asociado(s)"
            )
        
        # Eliminar la red
        delete_query = text("DELETE FROM Redes_conocimiento WHERE id_red = :el_id")
        result = db.execute(delete_query, {"el_id": id_red})
        
        db.commit()
        return True
        
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al eliminar red de conocimiento {id_red}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error de base de datos: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado al eliminar red {id_red}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

def update_red(db: Session, id_red: int, red_update: EditarRedConocimiento) -> bool:
    """
    Actualiza los datos de una red de conocimiento.
    """
    try:
        # Convierte el esquema Pydantic a dict y excluye campos no enviados
        fields = red_update.model_dump(exclude_unset=True)

        # Si no hay campos para actualizar, retorna False
        if not fields:
            raise HTTPException(
                status_code=400, 
                detail="No hay campos para actualizar"
            )

        # Verificar si la red existe
        check_query = text("SELECT nombre FROM Redes_conocimiento WHERE id_red = :id_red")
        check_result = db.execute(check_query, {"id_red": id_red}).first()
        
        if not check_result:
            raise HTTPException(
                status_code=404, 
                detail=f"Red de conocimiento con ID {id_red} no encontrada"
            )

        # Crea la parte dinámica del SET
        set_clause = ", ".join([f"{key} = :{key}" for key in fields])

        # Agrega el id del registro a actualizar
        fields["id_red"] = id_red

        # Ejecuta el UPDATE
        query = text(f"""
            UPDATE Redes_conocimiento 
            SET {set_clause}
            WHERE id_red = :id_red
        """)

        result = db.execute(query, fields)
        
        db.commit()
        
        if result.rowcount == 0:
            logger.warning(f"No se actualizó ninguna fila para red {id_red}")
            return False
            
        logger.info(f"Red {id_red} actualizada correctamente")
        return True

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar red de conocimiento {id_red}: {e}")
        
        if "Duplicate entry" in str(e) or "duplicate key" in str(e):
            raise HTTPException(
                status_code=400, 
                detail=f"Ya existe una red de conocimiento con ese nombre"
            )
            
        raise HTTPException(
            status_code=500, 
            detail=f"Error de base de datos: {str(e)}"
        )
        
    except HTTPException:
        db.rollback()
        raise
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado al actualizar red {id_red}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")