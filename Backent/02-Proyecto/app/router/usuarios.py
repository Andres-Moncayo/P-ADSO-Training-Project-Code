from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List  # Import necesario

from app.router.dependencies import get_current_user
from app.schemas.usuarios import CrearUsuario, EditarPass, EditarUsuario, RetornoUsuario
from core.database import get_db
from app.crud import usuarios as crud_users

router = APIRouter()

# Ruta para el registro de un nuevo usuario 
@router.post("/registrar", status_code=status.HTTP_201_CREATED)
def create_user(
    user: CrearUsuario,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para crear usuario"
            )
        
        crear = crud_users.create_user(db, user)
        if crear:
            return {
                "message": "Usuario creado correctamente",
                "id_usuario": "Nuevo ID generado",
                "correo": user.correo
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener TODOS los usuarios (SIMPLE) ---
@router.get("/", status_code=status.HTTP_200_OK, response_model=List[RetornoUsuario])
def get_todos_usuarios(
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene TODOS los usuarios registrados.
    Solo accesible para administradores (id_rol = 1).
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener todos los usuarios"
            )
        
        # Llama a la función CRUD simple
        usuarios = crud_users.get_todos_usuarios_simple(db)
        
        if not usuarios:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontraron usuarios registrados"
            )
        
        return usuarios
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener un usuario por su ID ---
@router.get("/obtener-por-id/{id_usuario}", status_code=status.HTTP_200_OK, response_model=RetornoUsuario)
def get_by_id(
    id_usuario: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener usuario"
            )
        
        user = crud_users.get_user_by_id(db, id_usuario)
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para obtener un usuario por su correo electrónico ---
@router.get("/obtener-por-correo/{correo}", status_code=status.HTTP_200_OK, response_model=RetornoUsuario)
def get_by_email(
    correo:str,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):      
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener usuario por correo"
            )
        
        user = crud_users.get_user_by_email(db, correo)
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para eliminar un usuario por su ID ---
@router.delete("/eliminar-por-id/{id_usuario}", status_code=status.HTTP_200_OK)
def delete_by_id(
    id_usuario: int,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para eliminar un usuario"
            )
        
        user = crud_users.user_delete(db, id_usuario)
        if user:
            return {
                "message": "Usuario eliminado correctamente",
                "id_usuario": id_usuario
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para actualizar la información de un usuario ---
@router.put("/editar/{user_id}")
def update_user(
    user_id: int,
    user: EditarUsuario,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):    
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para editar usuario"
            )
        
        success = crud_users.update_user(db, user_id, user)
        if success:
            return {
                "message": "Usuario actualizado correctamente",
                "id_usuario": user_id
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Ruta para actualizar la contraseña de un usuario ---
@router.put("/editar-contrasenia")
def update_password(
    user: EditarPass,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para actualizar contraseña"
            )
        
        verificar = crud_users.verify_user_pass(db, user)
        if not verificar:
            raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")

        success = crud_users.update_password(db, user)
        if success:
            return {
                "message": "Contraseña actualizada correctamente",
                "id_usuario": user.id_usuario
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))