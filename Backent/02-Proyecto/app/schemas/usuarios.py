from typing import Optional
from pydantic import BaseModel, EmailStr, Field  



# Definición de un esquema base común para usuarios
class UsuarioBase(BaseModel):
    # Nombre completo: debe ser una cadena con al menos 3 y hasta 80 caracteres
    nombre_completo: str = Field(min_length=3, max_length=80)
    # ID del rol del usuario (por ejemplo: 1 = admin, 2 = estudiante, etc.)
    id_rol: int
    # Correo: debe ser una cadena válida con formato de email
    correo: EmailStr
    # Número de documento: string con longitud mínima 8 y máxima 12
    num_documento: str = Field(min_length=8, max_length=12)


# Esquema para crear un usuario (datos que envía el cliente al registrar usuario)
class CrearUsuario(UsuarioBase):
    # Contraseña encriptada (o la clave que vas a manejar), con mínimo de 8 caracteres
    contra_encript: str = Field(min_length=8)
    # Estado del usuario: si está activo (True) o no; por defecto True
    estado: bool = True


# Esquema para retornar datos de usuario (respuesta de la API)
class RetornoUsuario(UsuarioBase):
    # Id que identifica al usuario (en la base de datos)
    id_usuario: int
    # Estado del usuario (activo / inactivo)
    estado: bool
    # Nombre del rol del usuario, para que no solo devuelvas el id del rol sino su nombre descriptivo
    nombre_rol: str


# NUEVO: Esquema para autenticación (incluye contra_encript)
class UsuarioAuth(RetornoUsuario):
    contra_encript: str  # Agrega solo este campo extra para autenticación


# Esquema para editar (modificar) datos de usuario
class EditarUsuario(BaseModel):
    # Estos campos son opcionales, porque al hacer una actualización no siempre vas a cambiar todos los datos
    nombre_completo: Optional[str] = Field(default=None, min_length=3, max_length=80)
    correo: Optional[EmailStr] = Field(default=None)
    num_documento: Optional[str] = Field(default=None, min_length=8, max_length=12)
    # Estado también puede modificarse; es opcional
    estado: Optional[bool] = None


# Esquema para cambiar la contraseña de un usuario
class EditarPass(BaseModel):
    # Necesitas saber cuál usuario (id) querrá cambiar contraseña
    id_usuario: int
    # Contraseña anterior: mínimo 8 caracteres
    contra_anterior: str = Field(min_length=8)
    # Nueva contraseña: también mínimo 8 caracteres
    contra_nueva: str = Field(min_length=8)


# Esquema para el login (credenciales que envía el cliente)
class UsuarioLogin(BaseModel):
    correo: EmailStr
    contra_encript: str = Field(min_length=8)


# Esquema de respuesta con el token de acceso
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"