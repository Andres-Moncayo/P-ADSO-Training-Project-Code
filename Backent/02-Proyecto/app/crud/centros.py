from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import logging

from app.schemas.centros import CentroBase

logger = logging.getLogger(__name__)

def create_centro(db: Session, centro: CentroBase) -> Optional[bool]:
    try:
        dataCentro = centro.model_dump() # convierte el esquema en diccionario
        
        query = text("""
            INSERT INTO centro (
                cod_centro, nombre_centro
            ) VALUES (
                :cod_centro, :nombre_centro
            )
        """)
        db.execute(query, dataCentro)
        db.commit()

        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear centro: {e}")
        raise Exception("Error de base de datos al crear el centro")
