from sqlalchemy.orm import Session
from sqlalchemy import text

def verificar_programa_existe(db: Session, cod_programa: int):
    """Verifica si un programa existe y retorna sus datos"""
    result = db.execute(
        text("SELECT nombre FROM Programas_formacion WHERE cod_programa = :codigo"),
        {"codigo": cod_programa}
    ).fetchone()
    return result

def actualizar_url_pdf(db: Session, cod_programa: int, url_pdf: str):
    """Actualiza la URL del PDF de un programa"""
    db.execute(
        text("UPDATE Programas_formacion SET url_pdf = :path WHERE cod_programa = :codigo"),
        {"path": url_pdf, "codigo": cod_programa}
    )
    db.commit()