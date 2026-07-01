from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List

from app.router.dependencies import get_current_user
from app.schemas.registro_calificado import CrearRegistroCalificado, EditarRegistroCalificado, RetornoRegistroCalificado
from app.schemas.usuarios import RetornoUsuario
from core.database import get_db
from app.crud import registro_calificado as crud

# SOLO router SIN tags - los tags se definen en main.py
router = APIRouter(prefix="/registro_calificado")

@router.post("/registrar", status_code=status.HTTP_201_CREATED)
def crear_RegistroCalificado(
    registro: CrearRegistroCalificado,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para crear un Registro Calificado"
            )
        
        crear = crud.crear_registro_calificado(db, registro)
        
        if crear:
            return {
                "message": "Registro Calificado creado correctamente",
                "cod_programa": registro.cod_programa,
                "version": registro.version
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener TODOS los registros calificados ---
@router.get("/", status_code=status.HTTP_200_OK, response_model=List[RetornoRegistroCalificado])
def get_todos_registrosCalificados(
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener todos los registros calificados"
            )
        
        registros = crud.get_todos_registros_calificados(db)
        return registros
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener TODOS los registros de un programa (todas versiones) ---
# ¡IMPORTANTE! Esta ruta debe estar ANTES de la ruta con dos parámetros
@router.get("/programa/{cod_programa}", status_code=status.HTTP_200_OK, response_model=List[RetornoRegistroCalificado])
def get_registros_por_programa(
    cod_programa: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener registros por programa"
            )
        
        registros = crud.get_todos_registros_por_programa(db, cod_programa)
        return registros
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener UN registro específico por programa y versión ---
# ¡IMPORTANTE! Esta ruta debe estar DESPUÉS de la ruta con un solo parámetro
@router.get("/{cod_programa}/{version}", status_code=status.HTTP_200_OK, response_model=RetornoRegistroCalificado)
def get_registroCalificado_especifico(
    cod_programa: int,
    version: str,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener registros calificados específicos"
            )
        
        registro = crud.get_registro_by_cod_programa(db, cod_programa, version)
        return registro
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para editar un registro específico ---
@router.put("/{cod_programa}/{version}", status_code=status.HTTP_200_OK)
def editar_registroCalificado(
    cod_programa: int,
    version: str,
    registro: EditarRegistroCalificado,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para editar un Registro Calificado"
            )
        
        editar = crud.update_registro_calificado(db, cod_programa, version, registro)
        
        if editar:
            return {
                "message": "Registro Calificado editado correctamente",
                "cod_programa": cod_programa,
                "version": version
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para eliminar un registro específico ---
@router.delete("/{cod_programa}/{version}", status_code=status.HTTP_200_OK)
def eliminar_registroCalificado(
    cod_programa: int,
    version: str,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para eliminar un Registro Calificado"
            )
        
        eliminar = crud.delete_registro_calificado(db, cod_programa, version)
        
        if eliminar:
            return {
                "message": "Registro Calificado eliminado correctamente",
                "cod_programa": cod_programa,
                "version": version
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))