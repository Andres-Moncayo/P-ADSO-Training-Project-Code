from pydantic import BaseModel  # Importa BaseModel para definir modelos de datos con validación

from app.schemas.usuarios import RetornoUsuario  # Importa un esquema (modelo) anidado para usuario que ya definiste

# Este modelo representa la respuesta que devuelves cuando un usuario inicia sesión (login)
class ResponseLoggin(BaseModel):
    user: RetornoUsuario  # El campo `user` será otro modelo Pydantic (anidado): contiene los datos del usuario autenticado
    access_token: str     # Aquí va el token de acceso generado (JWT u otro), como cadena
