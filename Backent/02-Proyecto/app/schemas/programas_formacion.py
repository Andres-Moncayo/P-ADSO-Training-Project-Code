from typing import Optional, List
from datetime import date  # IMPORTANTE: Agregado para manejar fechas
from pydantic import BaseModel, Field

class ProgramaFormacionBase(BaseModel):
    cod_programa: int = Field(..., gt=0)  # Obligatorio, parte de PK
    version: str = Field(..., min_length=1, max_length=4)  # Obligatorio, parte de PK
    nombre: str = Field(..., min_length=3, max_length=180)
    nivel: Optional[str] = Field(None, min_length=3, max_length=50)
    id_red: Optional[int] = None
    tiempo_dur: Optional[int] = Field(None, ge=0)
    unidad_dur: Optional[str] = Field(None, max_length=20)
    estado: Optional[str] = Field(None, max_length=20)
    url_pdf: Optional[str] = Field(None, max_length=180)

class CrearProgramaFormacion(ProgramaFormacionBase):
    pass

class RetornoProgramaFormacion(ProgramaFormacionBase):
    nombre_red: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True

class EditarProgramaFormacion(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=180)
    nivel: Optional[str] = Field(None, min_length=3, max_length=50)
    id_red: Optional[int] = None
    tiempo_dur: Optional[int] = Field(None, ge=0)
    unidad_dur: Optional[str] = Field(None, max_length=20)
    estado: Optional[str] = Field(None, min_length=3, max_length=20)
    url_pdf: Optional[str] = Field(None, max_length=180)

# SCHEMA CORREGIDO: Usa date en lugar de str para las fechas
class ProgramaConRegistroCalificado(BaseModel):
    # Datos del programa
    cod_programa: int
    version: str
    nombre: str
    nivel: Optional[str] = None
    id_red: Optional[int] = None
    tiempo_dur: Optional[int] = None
    unidad_dur: Optional[str] = None
    estado: Optional[str] = None
    url_pdf: Optional[str] = None
    nombre_red: Optional[str] = None
    
    # Datos del registro calificado (pueden ser None si no existe)
    tipo_tramite: Optional[str] = None
    fecha_radicado: Optional[date] = None  # CAMBIADO: date en lugar de str
    numero_resolucion: Optional[int] = None
    fecha_resolucion: Optional[date] = None  # CAMBIADO: date en lugar de str
    fecha_vencimiento: Optional[date] = None  # CAMBIADO: date en lugar de str
    vigencia: Optional[str] = None
    modalidad: Optional[str] = None
    clasificacion: Optional[str] = None
    estado_catalogo: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True