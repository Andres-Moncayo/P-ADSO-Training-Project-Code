import os
import uuid
from fastapi import HTTPException
from core.config import settings 

def save_uploaded_document(file):
    """
    Guarda archivos PDF, Excel o Word en el servidor y retorna la ruta del archivo.
    """
    # Directorio base de almacenamiento
    UPLOAD_DOCS = settings.UPLOAD_DOCS 
    os.makedirs(UPLOAD_DOCS, exist_ok=True)

    # Tipos MIME válidos
    valid_content_types = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
        'application/msword',  # .doc
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
        'application/vnd.ms-excel'  # .xls
    ]

    # Extensiones válidas
    valid_extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']

    # Verificar tipo MIME
    if file.content_type not in valid_content_types:
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Solo se permiten archivos PDF, Word o Excel."
        )

    # Verificar extensión
    extension = os.path.splitext(file.filename)[1].lower()
    if extension not in valid_extensions:
        raise HTTPException(
            status_code=400,
            detail="Extensión inválida. Solo se permiten .pdf, .doc, .docx, .xls, .xlsx."
        )

    # Leer contenido para validar tamaño
    file_content = file.file.read()
    file.file.seek(0)  # Reiniciar el puntero

    # Tamaño máximo: 10 MB
    max_file_size = 10 * 1024 * 1024
    if len(file_content) > max_file_size:
        raise HTTPException(
            status_code=400,
            detail="El archivo es demasiado grande. Tamaño máximo: 10 MB."
        )

    # Generar nombre único manteniendo la extensión original
    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join(UPLOAD_DOCS, unique_filename)

    # Guardar el archivo
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
    except Exception as e:
        print(f"Error al guardar el archivo: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al guardar el archivo en el servidor."
        )

    return file_path
