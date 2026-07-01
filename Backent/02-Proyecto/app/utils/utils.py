# la función principal de tu archivo utils.py es encapsular esa lógica de soporte de subida para mantener los otros archivos del proyecto limpios y enfocados en sus tareas principales.

import os
import uuid
from fastapi import HTTPException
from core.config import settings 

# Función para guardar documentos subidos
# Recibe el objeto del archivo subido (UploadFile de FastAPI o similar).
def save_uploaded_document(file):
    """
    Guarda archivos PDF, Excel o Word en el servidor y retorna la ruta del archivo.
    """
    # Directorio base de almacenamiento, obtenido desde la configuración.
    UPLOAD_DOCS = settings.UPLOAD_DOCS 
    # Crea el directorio si no existe (exist_ok=True evita errores si ya existe).
    os.makedirs(UPLOAD_DOCS, exist_ok=True)

    # Tipos MIME válidos (lista de formatos aceptados: PDF, Word, Excel).
    valid_content_types = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
        'application/msword',  # .doc
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
        'application/vnd.ms-excel'  # .xls
    ]

    # Extensiones válidas esperadas.
    valid_extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']

    # --- 1. Verificar tipo MIME ---
    # Comprueba si el tipo de contenido del archivo está en la lista de permitidos.
    if file.content_type not in valid_content_types:
        # Lanza excepción 400 si el formato no es válido.
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Solo se permiten archivos PDF, Word o Excel."
        )

    # 2. Verificar extensión
    # Obtiene la extensión del nombre original del archivo.
    extension = os.path.splitext(file.filename)[1].lower()
    # Comprueba si la extensión está en la lista de permitidas.
    if extension not in valid_extensions:
        # Lanza excepción 400 si la extensión no es válida.
        raise HTTPException(
            status_code=400,
            detail="Extensión inválida. Solo se permiten .pdf, .doc, .docx, .xls, .xlsx."
        )

    # 3. Verificar tamaño
    # Lee el contenido completo del archivo.
    file_content = file.file.read()
    # Reinicia el puntero del archivo a 0 para que pueda ser leído de nuevo al guardarse.
    file.file.seek(0)  # Reiniciar el puntero

    # Define el tamaño máximo de archivo permitido (10 megabytes).
    max_file_size = 10 * 1024 * 1024
    # Comprueba si el tamaño del contenido leído excede el límite.
    if len(file_content) > max_file_size:
        # Lanza excepción 400 si el archivo es demasiado grande.
        raise HTTPException(
            status_code=400,
            detail="El archivo es demasiado grande. Tamaño máximo: 10 MB."
        )

    # 4. Generar nombre de archivo único y ruta
    # Genera un nombre único con UUID y le adjunta la extensión original.
    unique_filename = f"{uuid.uuid4()}{extension}"
    # Combina el directorio de subida con el nombre único para obtener la ruta completa.
    file_path = os.path.join(UPLOAD_DOCS, unique_filename)

    # 5. Guardar el archivo en el disco
    try:
        # Abre el archivo en modo de escritura binaria ("wb").
        with open(file_path, "wb") as buffer:
            # Escribe el contenido completo del archivo en el disco.
            buffer.write(file_content)
    # Maneja cualquier error que ocurra durante la operación de escritura.
    except Exception as e:
        print(f"Error al guardar el archivo: {str(e)}")
        # Lanza excepción 500 (Error interno del servidor).
        raise HTTPException(
            status_code=500,
            detail="Error al guardar el archivo en el servidor."
        )

    # Retorna la ruta completa donde se guardó el archivo.
    return file_path