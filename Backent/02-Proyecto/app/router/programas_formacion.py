from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional

from app.router.dependencies import get_current_user
from app.schemas.programas_formacion import (
    CrearProgramaFormacion, 
    EditarProgramaFormacion, 
    RetornoProgramaFormacion,
    ProgramaConRegistroCalificado
)
from app.schemas.usuarios import RetornoUsuario
from core.database import get_db
from app.crud import programas_formacion as crud

router = APIRouter(prefix="/programas_formacion")




# --- Crear un nuevo programa ---
@router.post("/registrar", status_code=status.HTTP_201_CREATED)
def crear_programaFormacion(
    programa: CrearProgramaFormacion,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Crea un nuevo programa de formación.
    Requiere permisos de administrador (id_rol = 1).
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para crear un Programa de Formación"
            )
        
        crear = crud.crear_programa(db, programa)
        if crear:
            return {
                "message": "Programa creado correctamente",
                "cod_programa": programa.cod_programa,
                "version": programa.version
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ==================== ENDPOINTS DE CONSULTA ====================

# --- Obtener TODOS los programas 
@router.get("/", status_code=status.HTTP_200_OK)
def get_todos_programas(
    skip: int = Query(0, ge=0, description="Número de registros a saltar"),
    limit: int = Query(100, ge=1, le=500, description="Límite de registros por página"),
    cod_programa: Optional[int] = Query(None, description="Filtrar por código de programa"),
    nombre: Optional[str] = Query(None, description="Filtrar por nombre (búsqueda parcial)"),
    nivel: Optional[str] = Query(None, description="Filtrar por nivel (Técnico, Tecnólogo, etc.)"),
    estado: Optional[str] = Query(None, description="Filtrar por estado (Activo, Inactivo, etc.)"),
    id_red: Optional[int] = Query(None, description="Filtrar por ID de red de conocimiento"),
    ordenar_por: str = Query("cod_programa", description="Campo para ordenar"),
    orden: str = Query("desc", description="Orden ascendente (asc) o descendente (desc)"),
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene TODOS los programas de formación con paginación y filtros opcionales.
    
    Parámetros:
    - skip: Número de registros a saltar (paginación)
    - limit: Límite de registros por página (máx 500)
    - cod_programa: Filtrar por código específico
    - nombre: Filtrar por nombre (búsqueda parcial, case-insensitive)
    - nivel: Filtrar por nivel académico
    - estado: Filtrar por estado del programa
    - id_red: Filtrar por red de conocimiento
    - ordenar_por: Campo para ordenar los resultados
    - orden: Dirección del orden (asc o desc)
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener programas de formación"
            )
        
        resultados = crud.get_programas_con_filtros(
            db=db,
            skip=skip,
            limit=limit,
            cod_programa=cod_programa,
            nombre=nombre,
            nivel=nivel,
            estado=estado,
            id_red=id_red,
            ordenar_por=ordenar_por,
            orden=orden
        )
        
        if not resultados["programas"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontraron programas con los filtros aplicados"
            )
        
        return resultados
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# --- Obtener programas por red de conocimiento (RUTA FIJA PRIMERO) ---
@router.get("/por-red/{id_red}", status_code=status.HTTP_200_OK, response_model=List[RetornoProgramaFormacion])
def get_programas_por_red(
    id_red: int, 
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene todos los programas de una red de conocimiento específica.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener programas por red"
            )
        
        programas = crud.get_programas_by_id_red(db, id_red)
        if not programas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontraron programas para la red {id_red}"
            )
        return programas
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# --- Obtener TODAS las versiones de un programa (sin registro) (RUTA FIJA) ---
@router.get("/codigo/{cod_programa}", status_code=status.HTTP_200_OK, response_model=List[RetornoProgramaFormacion])
def get_todas_versiones_programa(
    cod_programa: int, 
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene TODAS las versiones de un programa dado su código.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener versiones de programas"
            )
        
        programas = crud.get_programas_by_cod(db, cod_programa)
        if not programas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontraron programas con código {cod_programa}"
            )
        return programas
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# --- Obtener TODAS las versiones de un programa CON sus registros calificados (RUTA FIJA) ---
@router.get(
    "/con-registros/{cod_programa}",
    status_code=status.HTTP_200_OK,
    response_model=List[ProgramaConRegistroCalificado]
)
def get_todas_versiones_con_registros(
    cod_programa: int, 
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene TODAS las versiones de un programa, cada una con su registro calificado incluido.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener programas con registros calificados"
            )
        
        programas = crud.get_programas_con_registros_by_cod(db, cod_programa)
        if not programas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontraron programas con código {cod_programa}"
            )
        return programas
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# --- IMPORTANTE: Ahora las rutas dinámicas van DESPUÉS de las rutas fijas ---

# --- Obtener un programa específico CON su registro calificado ---
@router.get(
    "/{cod_programa}/{version}/con-registro",
    status_code=status.HTTP_200_OK,
    response_model=ProgramaConRegistroCalificado
)
def get_programa_con_registro(
    cod_programa: int, 
    version: str, 
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene un programa específico con su registro calificado incluido.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener programas con registro calificado"
            )
        
        programa = crud.get_programa_con_registro_calificado(db, cod_programa, version)
        if programa is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Programa con código {cod_programa} y versión {version} no encontrado"
            )
        return programa
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# --- Obtener UNA versión específica de un programa (sin registro) ---
@router.get("/{cod_programa}/{version}", status_code=status.HTTP_200_OK, response_model=RetornoProgramaFormacion)
def get_programa_version_especifica(
    cod_programa: int, 
    version: str, 
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene una versión específica de un programa.
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para obtener programas específicos"
            )
        
        programa = crud.get_programa_by_cod_and_version(db, cod_programa, version)
        if programa is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Programa con código {cod_programa} y versión {version} no encontrado"
            )
        return programa
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# ==================== ENDPOINTS DE MODIFICACIÓN ====================



# --- Actualizar un programa ---
@router.put("/{cod_programa}/{version}", status_code=status.HTTP_200_OK)
def update_programa(
    cod_programa: int,
    version: str,
    programa: EditarProgramaFormacion,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):    
    """
    Actualiza un programa específico.
    Requiere permisos de administrador (id_rol = 1).
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para editar un Programa de Formación"
            )
        
        success = crud.update_programa(db, cod_programa, version, programa)
        if success:
            return {
                "message": "Programa actualizado correctamente",
                "cod_programa": cod_programa,
                "version": version
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# --- Eliminar un programa específico ---
@router.delete("/{cod_programa}/{version}", status_code=status.HTTP_200_OK)
def delete_programa(
    cod_programa: int,
    version: str,
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Elimina un programa específico.
    Requiere permisos de administrador (id_rol = 1).
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para eliminar un programa"
            )
        
        resultado = crud.delete_programa(db, cod_programa, version)
        if resultado:
            return {
                "message": "Programa eliminado correctamente",
                "cod_programa": cod_programa,
                "version": version
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )