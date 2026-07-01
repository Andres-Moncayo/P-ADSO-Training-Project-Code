from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.crud.usuarios import get_user_by_email_security, get_user_by_id
from core.security import verify_password, verify_token
from core.database import get_db
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/access/token",
    auto_error=False
)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 1. Verifica si se envió un token
    if token is None:
        raise HTTPException(status_code=401, detail="Token requerido")

    # 2. Verifica la validez del token (firma, expiración, etc.) y extrae el ID del usuario
    user_id = verify_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token inválido")

    # 3. Busca el usuario en la base de datos usando el ID extraído del token
    user_db = get_user_by_id(db, user_id)
    if user_db is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 4. Verifica si el usuario está activo (su estado es True)
    if not user_db.estado:
        raise HTTPException(status_code=403, detail="Usuario inactivo. No autorizado")

    return user_db

def authenticate_user(username: str, password: str, db: Session):
    # 1. Busca el usuario en la BD por su nombre de usuario (correo electrónico)
    user = get_user_by_email_security(db, username)
    
    # Si no se encuentra el usuario
    if not user:
        return False

    # 2. Verifica la contraseña proporcionada con la contraseña encriptada almacenada en la BD
    if not verify_password(password, user.contra_encript):
        return False

    # Si la autenticación es exitosa, retorna el objeto usuario
    return user