from typing import Optional
from pydantic import BaseModel, Field

class RedConocimientoBase(BaseModel):
    nombre: str = Field(min_length=3, max_length=80)


class CrearRedConocimiento(RedConocimientoBase):
    pass


class RetornoRedConocimiento(RedConocimientoBase):
    id_red: int
   


class EditarRedConocimiento(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=3, max_length=80)

