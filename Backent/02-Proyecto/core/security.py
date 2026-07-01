#esponsable de la confiabilidad del sistema: asegura que las contraseñas estén almacenadas de forma segura y que solo los tokens válidos 
# y no expirados puedan otorgar acceso a la API.

from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import settings

# Configurar hashing de contraseñas
# Inicialización de CryptContext utilizando Argon2 como esquema de hashing.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Opción 2: Bcrypt (alternativa)
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Funciones para el manejo de Contraseñas

# Función para generar un hashed_password
# Toma una contraseña de texto plano y retorna su versión hasheada y segura.
def get_hashed_password(password: str):
    return pwd_context.hash(password)

# Función para verificar una contraseña hashada
# Compara una contraseña de texto plano con un hash almacenado. Retorna True si coinciden.
def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

# Funciones para el manejo de Tokens JWT

# Función para crear un token JWT
# Recibe un diccionario 'data' (payload) que contendrá la información del usuario (ej. ID, rol).
def create_access_token(data: dict):
    # Crea una copia del payload para evitar modificar el original.
    to_encode = data.copy()
    # Calcula el tiempo de expiración: hora actual UTC + tiempo de expiración definido en la configuración.
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    # Agrega el campo de expiración ('exp') al payload del token.
    to_encode.update({"exp": expire})
    # Codifica el payload para crear el JWT, usando el secreto y el algoritmo definidos en la configuración.
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    # Retorna el token JWT codificado.
    return encoded_jwt

# Función para verificar si un token JWT es válido
# Recibe el token JWT como string.
def verify_token(token: str):
    try:
        # Decodifica el token usando el secreto y el algoritmo. Esto también verifica la firma y la expiración ('exp').
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        # Extrae el ID del usuario ('sub') del payload.
        user_id = payload.get("sub")
        # Retorna el ID del usuario como entero si existe, o None si 'sub' no está presente.
        return int(user_id) if user_id is not None else None
    
    # Captura el error si el token ha expirado.
    except jwt.ExpiredSignatureError: # Token ha expirado
        print("Token expirado")
        return None
        
    # Captura cualquier otro error de JWT (ej. firma incorrecta, token malformado).
    except JWTError as e:
        print("Error al decodificar el token:", str(e))
        return None