#Aquí se establece cómo el proyecto se conecta a la base de datos, se manejan las sesiones de conexión y se asegura que FastAPI pueda interactuar correctamente con MySQL.

from typing import Generator
import logging
from sqlalchemy import create_engine, text, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError, OperationalError, DisconnectionError
from sqlalchemy.pool import QueuePool

from core.config import settings 



# Configurar el módulo de logging de Python y se usa para crear un registrador de eventos (logger)
logger = logging.getLogger(__name__)

# motor de base de datos con configuraciones optimas
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,          # Desactivar echo para evitar bloqueos en inicio
    pool_pre_ping=True,  # Verifica que las conexiones estén activas antes de usarlas
    pool_recycle=3600,   # Recicla conexiones después de una hora para evitar el error "connection has been closed"
    pool_size=5,         # Reducir pool size para evitar bloqueos
    max_overflow=10,     # Reducir overflow
    pool_timeout=5,      # Reducir timeout para fallar rápido si no hay conexión
    poolclass=QueuePool,  # Clase de pool para manejo eficiente de conexiones
    connect_args={"connect_timeout": 5}  # Timeout de conexión MySQL
)



# Crear la fábrica de sesiones a la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Declarar la base para los modelos ORM
Base = declarative_base()
# Instancia de MetaData para trabajar con tablas
metadata = MetaData()



def get_db() -> Generator: #Esto te da una sesión de SQLAlchemy conectada a la base de datos.
    db = SessionLocal()
    try:
        yield db  # permite que la función de endpoint use la sesión.
    finally:
        db.close() # Cierra la sesión de base de datos y libera los recursos asociados.
        # Esto es esencial para evitar fugas de memoria y conexiones abiertas.



def check_database_connection() -> bool: # Verifica la conexión a la base de datos.
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except (OperationalError, DisconnectionError) as e:
        logger.error(f"Error de conexión a la base de datos: {str(e)}")
        return False
    # bool: True si la conexión es exitosa, False en caso contrario.