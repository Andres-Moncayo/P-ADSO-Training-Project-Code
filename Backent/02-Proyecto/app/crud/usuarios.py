from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import logging  

from app.schemas.usuarios import CrearUsuario, EditarPass, EditarUsuario, RetornoUsuario, UsuarioAuth
from core.security import get_hashed_password, verify_password  

logger = logging.getLogger(__name__)  

def create_user(db: Session, user: CrearUsuario) -> Optional[bool]:
    try:
        dataUser = user.model_dump()
        contraOrigin = dataUser["contra_encript"]
        contraEncript = get_hashed_password(contraOrigin)
        dataUser["contra_encript"] = contraEncript

        query = text("""
            INSERT INTO usuario (
                nombre_completo, num_documento, 
                correo, contra_encript, id_rol,
                estado
            ) VALUES (
                :nombre_completo, :num_documento,
                :correo, :contra_encript, :id_rol,
                :estado
            )
        """)
        db.execute(query, dataUser)
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear usuario: {e}")
        if "Duplicate entry" in str(e) or "duplicate key" in str(e):
            if "correo" in str(e).lower():
                raise HTTPException(status_code=400, detail="El correo ya está registrado")
            elif "num_documento" in str(e).lower():
                raise HTTPException(status_code=400, detail="El número de documento ya está registrado")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado al crear usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_user_by_id(db: Session, id_usuario: int):
    """Retorna un usuario por ID (sin contraseña)"""
    try:
        query = text("""
            SELECT usuario.id_usuario, usuario.nombre_completo, 
                   usuario.num_documento, usuario.correo, usuario.id_rol, 
                   usuario.estado, rol.nombre_rol
            FROM usuario
            INNER JOIN rol ON usuario.id_rol = rol.id_rol
            WHERE usuario.id_usuario = :id_user
        """)
        result = db.execute(query, {"id_user": id_usuario}).mappings().first()
        
        if result is None:
            raise HTTPException(
                status_code=404, 
                detail=f"Usuario con ID {id_usuario} no encontrado"
            )
        
        # Convertir a RetornoUsuario
        return RetornoUsuario(**dict(result))
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar usuario por id {id_usuario}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def get_user_by_email(db: Session, un_correo: str):
    """Retorna un usuario por correo (sin contraseña)"""
    try:
        query = text("""
            SELECT usuario.id_usuario, usuario.nombre_completo, 
                   usuario.num_documento, usuario.correo, usuario.id_rol, 
                   usuario.estado, rol.nombre_rol
            FROM usuario
            INNER JOIN rol ON usuario.id_rol = rol.id_rol
            WHERE usuario.correo = :email
        """)
        result = db.execute(query, {"email": un_correo}).mappings().first()
        
        if result is None:
            raise HTTPException(
                status_code=404, 
                detail=f"Usuario con correo {un_correo} no encontrado"
            )
        
        # Convertir a RetornoUsuario
        return RetornoUsuario(**dict(result))
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar usuario por email {un_correo}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def get_user_by_email_security(db: Session, un_correo: str):
    """Retorna un usuario por correo CON contraseña (para autenticación)"""
    try:
        query = text("""
            SELECT usuario.id_usuario, usuario.nombre_completo, 
                   usuario.num_documento, usuario.contra_encript, 
                   usuario.correo, usuario.id_rol, 
                   usuario.estado, rol.nombre_rol
            FROM usuario
            INNER JOIN rol ON usuario.id_rol = rol.id_rol
            WHERE usuario.correo = :email
        """)
        result = db.execute(query, {"email": un_correo}).mappings().first()
        
        if result is None:
            raise HTTPException(
                status_code=404, 
                detail=f"Usuario con correo {un_correo} no encontrado"
            )
        
        # Convertir a UsuarioAuth (incluye contra_encript)
        return UsuarioAuth(**dict(result))
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar usuario por email {un_correo}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def user_delete(db: Session, id: int) -> bool:
    """Elimina un usuario por ID"""
    try:
        query = text("""
            DELETE FROM usuario
            WHERE usuario.id_usuario = :el_id
        """)
        result = db.execute(query, {"el_id": id})
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        db.commit()
        return True
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al eliminar usuario {id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def update_user(db: Session, user_id: int, user_update: EditarUsuario) -> bool:
    """Actualiza los datos de un usuario"""
    try:
        fields = user_update.model_dump(exclude_unset=True)
        
        if not fields:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")
        
        set_clause = ", ".join([f"{key} = :{key}" for key in fields])
        fields["user_id"] = user_id

        query = text(f"UPDATE usuario SET {set_clause} WHERE id_usuario = :user_id")
        result = db.execute(query, fields)
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        db.commit()
        return True
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar usuario {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def update_password(db: Session, user_data: EditarPass) -> bool:
    """Cambia la contraseña de un usuario"""
    try:
        datos_usuario = user_data.model_dump()
        contra_encript = get_hashed_password(datos_usuario['contra_nueva'])
        datos_usuario['pass_encript'] = contra_encript

        query = text("UPDATE usuario SET contra_encript = :pass_encript WHERE id_usuario = :id_usuario")
        result = db.execute(query, datos_usuario)
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        db.commit()
        return True
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar contraseña usuario {user_data.id_usuario}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

def verify_user_pass(db: Session, user_data: EditarPass) -> bool:
    """Verifica que la contraseña anterior sea correcta"""
    try:
        query = text("SELECT usuario.contra_encript FROM usuario WHERE usuario.id_usuario = :id_user")
        result = db.execute(query, {"id_user": user_data.id_usuario}).mappings().first()
        
        if result is None:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        contra_en_db = result["contra_encript"]
        contra_anterior = user_data.contra_anterior
        validated = verify_password(contra_anterior, contra_en_db)
        
        return validated
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al validar la contraseña usuario {user_data.id_usuario}: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")



def get_todos_usuarios_simple(db: Session) -> List[dict]:
    """
    Obtiene TODOS los usuarios registrados (versión simple).
    """
    try:
        query = text("""
            SELECT 
                usuario.id_usuario,
                usuario.nombre_completo,
                usuario.num_documento,
                usuario.correo,
                usuario.id_rol,
                usuario.estado,
                rol.nombre_rol
            FROM usuario
            INNER JOIN rol ON usuario.id_rol = rol.id_rol
            ORDER BY usuario.id_usuario DESC
        """)

        result = db.execute(query).mappings().all()
        logger.info(f"Total usuarios encontrados: {len(result)}")
        return [dict(row) for row in result]
        
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todos los usuarios: {e}")
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")