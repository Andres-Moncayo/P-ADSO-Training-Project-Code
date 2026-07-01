from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field

class RegistroCalificadoBase(BaseModel):
    cod_programa: int = Field(..., gt=0)
    version: str = Field(..., min_length=1, max_length=4)  # Nuevo campo
    tipo_tramite: str = Field(..., min_length=3, max_length=50)
    fecha_radicado: date
    numero_resolucion: int = Field(..., gt=0)
    fecha_resolucion: date
    fecha_vencimiento: date
    vigencia: str = Field(..., min_length=1, max_length=25)
    modalidad: str = Field(..., min_length=3, max_length=25)
    clasificacion: str = Field(..., min_length=3, max_length=15)
    estado_catalogo: str = Field(..., min_length=3, max_length=50)

class CrearRegistroCalificado(RegistroCalificadoBase):
    pass

class RetornoRegistroCalificado(RegistroCalificadoBase):
    pass

class EditarRegistroCalificado(BaseModel):
    tipo_tramite: Optional[str] = Field(None, min_length=3, max_length=50)
    fecha_radicado: Optional[date] = None
    numero_resolucion: Optional[int] = Field(None, gt=0)
    fecha_resolucion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    vigencia: Optional[str] = Field(None, min_length=1, max_length=25)
    modalidad: Optional[str] = Field(None, min_length=3, max_length=25)
    clasificacion: Optional[str] = Field(None, min_length=3, max_length=15)
    estado_catalogo: Optional[str] = Field(None, min_length=3, max_length=50)