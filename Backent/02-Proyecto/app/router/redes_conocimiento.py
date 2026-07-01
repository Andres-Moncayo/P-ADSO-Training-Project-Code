from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List  # Agregar este import

from app.router.dependencies import get_current_user
from app.schemas.redes_conocimiento import CrearRedConocimiento, RetornoRedConocimiento, EditarRedConocimiento
from app.schemas.usuarios import RetornoUsuario

from core.database import get_db
from app.crud import redes_conocimiento as crud_redConocimiento

router = APIRouter()

@router.post("/registrar", status_code=status.HTTP_201_CREATED)
def crear_RedConocimiento(
    red: CrearRedConocimiento,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(status_code=401, detail="No tienes permisos para crear una Red de conocimiento")
        
        crear = crud_redConocimiento.crear_RedConocimiento(db, red)
        if crear:
            return {"message": "Red de conocimiento creada correctamente"}
        else:
            return {"message": "La Red de conocimiento no pudo ser creado correctamente"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ NUEVO ENDPOINT: OBTENER TODAS LAS REDES ============

@router.get("/", status_code=status.HTTP_200_OK, response_model=List[RetornoRedConocimiento])
def get_todas_redes(
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene TODAS las redes de conocimiento registradas.
    Retorna una lista simple con todas las redes.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(status_code=401, detail="No tienes permisos para obtener las redes de conocimiento")
        
        redes = crud_redConocimiento.get_todas_redes(db)
        
        if not redes:
            raise HTTPException(
                status_code=404, 
                detail="No se encontraron redes de conocimiento registradas"
            )
        
        # Convertir cada diccionario a RetornoRedConocimiento
        return [RetornoRedConocimiento(**red) for red in redes]
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener una red por su ID ---
@router.get("/obtener-por-id/{id_red}", status_code=status.HTTP_200_OK, response_model=RetornoRedConocimiento)
def get_by_id(
    id_red: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(status_code=401, detail="No tienes permisos para obtener esta red de conocimiento")
        
        red = crud_redConocimiento.get_red_by_id_red(db, id_red)
        if red is None:
            raise HTTPException(status_code=404, detail="Red de conocimiento no encontrada")
        return red
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/obtener-por-nombre/{nombre}", status_code=status.HTTP_200_OK, response_model=RetornoRedConocimiento)
def get_by_nombre(
    nombre: str,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(status_code=401, detail="No tienes permisos para obtener esta red de conocimiento")
        
        red = crud_redConocimiento.get_red_by_nombre(db, nombre)
        if red is None:
            raise HTTPException(status_code=404, detail="Red de conocimiento no encontrada")
        return red
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/eliminar-por-id/{id_red}", status_code=status.HTTP_200_OK)
def delete_by_id(
    id_red: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(status_code=401, detail="No tienes permisos para eliminar una red de conocimiento")
        
        user = crud_redConocimiento.delete_red(db, id_red)
        if user:
            return {"message": "Red de conocimiento eliminada correctamente"}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para actualizar la información de una red ---
@router.put("/editar/{id_red}")
def update_red(
    id_red: int,
    red: EditarRedConocimiento,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):    
    try:
        if user_token.id_rol != 1:
            raise HTTPException(status_code=401, detail="No tienes permisos para actualizar una red de conocimiento")
        
        success = crud_redConocimiento.update_red(db, id_red, red)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la red de conocimiento")
        
        return {"message": "Red de conocimiento actualizada correctamente"}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))