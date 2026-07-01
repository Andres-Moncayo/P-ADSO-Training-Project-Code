from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
from core.database import get_db
from app.router.dependencies import get_current_user
from app.schemas.usuarios import RetornoUsuario

router = APIRouter()

UPLOAD_DIR = "uploads/pdfs"

@router.post("/subir-pdf_Programa-Diseño curricular/")
async def upload_pdf(
    codigo: int = Form(None, description="Código del programa"),
    file: UploadFile = File(..., description="Diseño curricular en formato PDF"),
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Sube un PDF para un programa específico
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No tienes permisos para subir PDFs de programas"
            )
    
        # Validar que sea PDF
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(400, "Solo se permiten archivos PDF")
        
        # Verificar que el programa exista
        programa = db.execute(
            text("SELECT nombre FROM Programas_formacion WHERE cod_programa = :codigo"),
            {"codigo": codigo}
        ).fetchone()
        
        if not programa:
            raise HTTPException(404, f"Programa {codigo} no encontrado")
        
        # Crear directorio
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Guardar archivo
        file_path = os.path.join(UPLOAD_DIR, f"programa_{codigo}_{file.filename}")
        
        try:
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Actualizar BD
            db.execute(
                text("UPDATE Programas_formacion SET url_pdf = :path WHERE cod_programa = :codigo"),
                {"path": file_path, "codigo": codigo}
            )
            db.commit()
            
            return {
                "mensaje": "PDF subido exitosamente",
                "programa": programa.nombre,
                "ruta": file_path
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(500, f"Error: {str(e)}")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=str(e))


@router.get("/ver-pdf/{codigo}")
async def ver_pdf(
    codigo: int, 
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Descarga el PDF de un programa específico
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No tienes permisos para ver PDFs de programas"
            )
        
        # Buscar la ruta del PDF en la base de datos
        resultado = db.execute(
            text("SELECT url_pdf FROM Programas_formacion WHERE cod_programa = :codigo"),
            {"codigo": codigo}
        ).fetchone()
        
        if not resultado or not resultado.url_pdf:
            raise HTTPException(404, f"No se encontró PDF para el programa {codigo}")
        
        ruta_pdf = resultado.url_pdf
        
        # Verificar que el archivo existe físicamente
        if not os.path.exists(ruta_pdf):
            raise HTTPException(404, f"El archivo PDF no existe en la ruta: {ruta_pdf}")
        
        # Devolver el archivo
        return FileResponse(
            path=ruta_pdf,
            filename=f"programa_{codigo}.pdf",
            media_type='application/pdf'
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@router.get("/programas/{codigo}/info-pdf")
async def info_pdf(
    codigo: int, 
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    """
    Obtiene información sobre el PDF de un programa
    """
    try:
        if user_token.id_rol != 1:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No tienes permisos para obtener información de PDFs"
            )
        
        resultado = db.execute(
            text("SELECT nombre, url_pdf FROM Programas_formacion WHERE cod_programa = :codigo"),
            {"codigo": codigo}
        ).fetchone()
        
        if not resultado:
            raise HTTPException(404, f"Programa {codigo} no encontrado")
        
        archivo_existe = os.path.exists(resultado.url_pdf) if resultado.url_pdf else False
        
        return {
            "codigo_programa": codigo,
            "nombre_programa": resultado.nombre,
            "url_pdf": resultado.url_pdf,
            "tiene_pdf": resultado.url_pdf is not None,
            "archivo_existe": archivo_existe
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=str(e))