# Servicio de emisión de tickets de tu aplicación, donde los 
# usuarios intercambian sus credenciales privadas por un token temporal que les
# permite acceder a los recursos protegidos.

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.router.dependencies import authenticate_user
from app.schemas.auth import ResponseLoggin
from core.security import create_access_token
from core.database import get_db
from fastapi.security import OAuth2PasswordRequestForm


# Creación de una instancia de APIRouter para definir las rutas de acceso/autenticación.
router = APIRouter()

# Ruta POST para el inicio de sesión y obtención del token de acceso
# La ruta es "/token" y el modelo de respuesta esperado es ResponseLoggin.
@router.post("/token", response_model=ResponseLoggin)
# Función asíncrona que maneja la solicitud de login.
async def login_for_access_token(
    # Recibe los datos del formulario (username y password) como una dependencia de OAuth2PasswordRequestForm.
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    # Dependencia para obtener la sesión de la base de datos.
    db: Session = Depends(get_db)
):
    # 1. Intenta autenticar al usuario usando el username (correo) y password proporcionados.
    user = authenticate_user(form_data.username, form_data.password, db)
    
    # 2. Si la autenticación falla (authenticate_user retorna False o None).
    if not user:
        # Lanza una excepción HTTP 401 (Unauthorized).
        raise HTTPException(
            status_code=401,
            detail="Datos Incorrectos en email o password",
            # Incluye la cabecera WWW-Authenticate requerida por el esquema OAuth2.
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Si la autenticación es exitosa, crea el token de acceso JWT.
    # El payload del token incluye el ID del usuario ('sub') y el rol.
    access_token = create_access_token(
        data={"sub": str(user.id_usuario), "rol": user.id_rol}
    )

    # 4. Retorna la respuesta de login exitosa.
    return ResponseLoggin(
        # Incluye los datos del usuario (serializados).
        user=user,
        # Incluye el token de acceso generado.
        access_token=access_token
    )