from typing import List, Dict, Optional
from copy import Error
import os
from fastapi import UploadFile
import pandas as pd
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
import logging


logger = logging.getLogger(__name__)

# ESTE CRUD ES SOLO PARA REGISTRO_CALIFICADO
def insertar_registro_calificado(db: Session, lista_registros):
    insertados = 0
    actualizados = 0
    errores = []

    insert_sql = text("""
        INSERT INTO Registro_calificado (
            cod_programa,
            tipo_tramite,
            fecha_radicado,
            numero_resolucion,
            fecha_resolucion,
            fecha_vencimiento,
            vigencia,
            modalidad,
            clasificacion,
            estado_catalogo
        ) VALUES (
            :cod_programa,
            :tipo_tramite,
            :fecha_radicado,
            :numero_resolucion,
            :fecha_resolucion,
            :fecha_vencimiento,
            :vigencia,
            :modalidad,
            :clasificacion,
            :estado_catalogo
        )
        ON DUPLICATE KEY UPDATE
            tipo_tramite = VALUES(tipo_tramite),
            fecha_radicado = VALUES(fecha_radicado),
            numero_resolucion = VALUES(numero_resolucion),
            fecha_resolucion = VALUES(fecha_resolucion),
            fecha_vencimiento = VALUES(fecha_vencimiento),
            vigencia = VALUES(vigencia),
            modalidad = VALUES(modalidad),
            clasificacion = VALUES(clasificacion),
            estado_catalogo = VALUES(estado_catalogo)
    """)

    for registro in lista_registros:
        try:
            # asegurarse que estado_catalogo sea texto
            if "estado_catalogo" in registro:
                registro["estado_catalogo"] = str(registro["estado_catalogo"])

            result = db.execute(insert_sql, registro)

            if result.rowcount == 1:
                insertados += 1
            elif result.rowcount == 2:
                actualizados += 1

        except SQLAlchemyError as e:
            msg = f"Error en cod_programa {registro.get('cod_programa')}: {e}"
            errores.append(msg)
            logger.error(msg)

    db.commit()
    return {
        "insertados": insertados,
        "actualizados": actualizados,
        "errores": errores,
        "mensaje": "Carga completada con errores" if errores else "Carga completada exitosamente"
    }





def insertar_redes_conocimiento(db, lista_redes):
    """
    Inserta redes de conocimiento evitando duplicados.
    lista_redes = ["Red A", "Red B", ...]
    """
    sql_insert = text("""
        INSERT INTO Redes_conocimiento (nombre)
        VALUES (:nombre)
        ON DUPLICATE KEY UPDATE nombre = nombre;
    """)

    for nombre_red in lista_redes:
        if nombre_red and str(nombre_red).strip() != "":
            db.execute(sql_insert, {"nombre": nombre_red.strip()})

    db.commit()
    return {"mensaje": "Redes cargadas correctamente", "total": len(lista_redes)}



# CRUD SOLO PARA PROGRAMAS_FORMACION

def insertar_programas_formacion(db: Session, lista_registros):
    """
    Inserta o actualiza registros en Programas_formacion y retorna
    estadísticas separadas de inserciones vs actualizaciones
    lista_registros = [
        {"cod_programa": 123, "version": "001", "nombre": "Programa A", ...},
        ...
    ]
    """
    insertados = 0
    actualizados = 0
    errores = []

    for registro in lista_registros:
        try:
            # Buscar id_red por nombre
            resultado = db.execute(
                text("SELECT id_red FROM Redes_conocimiento WHERE nombre = :nombre_red"),
                {"nombre_red": registro["nombre_red"]}
            ).fetchone()

            if not resultado:
                errores.append(f"Red no encontrada: {registro['nombre_red']}")
                continue

            id_red = resultado[0]

            # Insert / Update en Programas_formacion y CAPTURAR RESULTADO
            result = db.execute(  # Capturamos el resultado
                text("""
                    INSERT INTO Programas_formacion (
                        cod_programa, version, nombre, nivel, id_red, tiempo_dur, unidad_dur, estado, url_pdf
                    ) VALUES (
                        :cod_programa, :version, :nombre, :nivel, :id_red, :tiempo_dur, :unidad_dur, :estado, :url_pdf
                    )
                    ON DUPLICATE KEY UPDATE
                        version = VALUES(version),
                        nombre = VALUES(nombre),
                        nivel = VALUES(nivel),
                        id_red = VALUES(id_red),
                        tiempo_dur = VALUES(tiempo_dur),
                        unidad_dur = VALUES(unidad_dur),
                        estado = VALUES(estado),
                        url_pdf = VALUES(url_pdf)
                """),
                {
                    "cod_programa": registro["cod_programa"],
                    "version": registro["version"],
                    "nombre": registro["nombre"],
                    "nivel": registro["nivel"],
                    "id_red": id_red,
                    "tiempo_dur": registro.get("tiempo_dur"),
                    "unidad_dur": registro.get("unidad_dur"),
                    "estado": registro.get("estado"),
                    "url_pdf": registro.get("url_pdf")
                }
            )

            # 👇 DIFERENCIAR ENTRE INSERT Y UPDATE
            if result.rowcount == 1:
                # Se insertó un nuevo registro
                insertados += 1
            elif result.rowcount == 2:
                # Se actualizó un registro existente (comportamiento de MySQL con ON DUPLICATE KEY)
                actualizados += 1

        except Exception as e:
            errores.append(f"Error en {registro['cod_programa']}: {str(e)}")

    db.commit()
    
    return {
        "insertados": insertados,
        "actualizados": actualizados,
        "total_procesados": insertados + actualizados,  # Total real de operaciones
        "errores": errores
    }

def actualizar_estado_y_duracion(db: Session, lista_registros):
    """
    Actualiza estado, tiempo_dur y unidad_dur usando el nombre del programa.
    Retorna estadísticas detalladas de programas encontrados vs no encontrados.
    """
    actualizados = 0
    no_encontrados = 0
    errores = []

    for registro in lista_registros:
        try:
            nombre_prog = registro["NOMBRE_PROGRAMA_FORMACION"]

            # Buscar el código del programa por nombre
            res = db.execute(
                text("SELECT cod_programa FROM Programas_formacion WHERE nombre = :nombre"),
                {"nombre": nombre_prog}
            ).fetchone()

            if not res:
                no_encontrados += 1
                errores.append(f"No existe el programa: {nombre_prog}")
                continue

            cod_programa = res[0]

            estado = registro["ESTADO_CURSO"]
            duracion = registro["DURACION_PROGRAMA"]

            # unidad_dur
            unidad = "horas" if duracion > 30 else "meses"

            # Update SOLO esos 3 campos
            result = db.execute(  # Capturamos el resultado
                text("""
                    UPDATE Programas_formacion
                    SET estado = :estado,
                        tiempo_dur = :tiempo_dur,
                        unidad_dur = :unidad_dur
                    WHERE cod_programa = :cod_programa
                """),
                {
                    "estado": estado,
                    "tiempo_dur": duracion,
                    "unidad_dur": unidad,
                    "cod_programa": cod_programa
                }
            )

            #  Verificar si realmente se actualizó el registro
            if result.rowcount > 0:
                actualizados += 1

        except Exception as e:
            errores.append(f"Error en {nombre_prog}: {str(e)}")

    db.commit()

    return {
        "actualizados": actualizados,
        "no_encontrados": no_encontrados,  #  Nuevo: programas que no existen
        "total_procesados": actualizados + no_encontrados,  #  Total de registros procesados
        "errores": errores
    }

def insertar_indicadores_programa(db: Session, lista_registros: List[Dict]):
    """
    Inserta o actualiza registros en Indicadores_programa mapeando TODAS las columnas
    """
    
    insertados = 0
    actualizados = 0
    errores = []
    programas_no_encontrados = []

    def limpiar_valor(valor):
        """Convierte cualquier valor a entero, retorna 0 si no es posible"""
        if valor is None:
            return 0
        try:
            if isinstance(valor, str):
                valor = valor.strip()
                if valor in ["", "nan", "none", "null", "na"]:
                    return 0
            return int(float(valor))
        except (ValueError, TypeError):
            return 0

    for i, registro in enumerate(lista_registros, 1):
        try:
            # Validar nombre del programa
            nombre_programa = registro.get("NOMBRE_PROGRAMA_FORMACION")
            if not nombre_programa or str(nombre_programa).strip() == "":
                errores.append(f"Fila {i}: Nombre de programa es obligatorio")
                continue

            nombre_programa_limpio = str(nombre_programa).strip()

            # Buscar código del programa
            res = db.execute(
                text("SELECT cod_programa FROM Programas_formacion WHERE nombre = :nombre"),
                {"nombre": nombre_programa_limpio}
            ).fetchone()

            if not res:
                programas_no_encontrados.append(nombre_programa_limpio)
                errores.append(f"Fila {i}: No existe el programa '{nombre_programa_limpio}'")
                continue

            cod_programa = res[0]

            # Preparar datos para TODAS las columnas de la tabla
            datos = {
                "cod_programa": cod_programa,
                
                # Violencia y desplazamiento
                "indig_despl_viol_apr_tot": limpiar_valor(registro.get("INDIGENAS_VIOLENCIA_TOTAL")),
                "indig_despl_viol_cab_fam_apr_tot": limpiar_valor(registro.get("INDIGENAS_VIOLENCIA_CDF_TOTAL")),
                "afro_despl_viol_apr_tot": limpiar_valor(registro.get("AFRO_VIOLENCIA_TOTAL")),
                "afro_despl_viol_cab_fam_apr_tot": limpiar_valor(registro.get("AFRO_VIOLENCIA_CDF_TOTAL")),
                "despl_viol_apr_tot": limpiar_valor(registro.get("DESPLAZADOS_VIOLENCIA_TOTAL")),
                "despl_viol_cab_fam_apr_tot": limpiar_valor(registro.get("DESPLAZADOS_VIOLENCIA_CDF_TOTAL")),
                
                # Tipos de violencia específicos
                "despl_disc_apr_tot": limpiar_valor(registro.get("DESPLAZADOS_DISCAPACITADOS_TOTAL")),
                "despojo_apr_tot": limpiar_valor(registro.get("DESPOJO_TOTAL")),
                "act_grup_arm_apr_tot": limpiar_valor(registro.get("ACTOS_GRUPOS_ARMADOS_TOTAL")),
                "amenaza_apr_tot": limpiar_valor(registro.get("AMENAZA_TOTAL")),
                "del_sex_apr_tot": limpiar_valor(registro.get("DELITOS_SEXUALES_TOTAL")),
                "desap_forz_apr_tot": limpiar_valor(registro.get("DESAPARICION_FORZADA_TOTAL")),
                "homi_masac_apr_tot": limpiar_valor(registro.get("HOMICIDIO_MASACRE_TOTAL")),
                "minas_exp_apr_tot": limpiar_valor(registro.get("MINAS_ANTIPERSONALES_TOTAL")),
                "secuestro_apr_tot": limpiar_valor(registro.get("SECUESTRO_TOTAL")),
                "tortura_apr_tot": limpiar_valor(registro.get("TORTURA_TOTAL")),
                "uso_men_grup_arm_apr_tot": limpiar_valor(registro.get("USO_MENORES_GRUPOS_ARMADOS_TOTAL")),
                "herido_apr_tot": limpiar_valor(registro.get("HERIDO_TOTAL")),
                "reclut_forz_apr_tot": limpiar_valor(registro.get("RECLUTAMIENTO_FORZADO_TOTAL")),
                
                # Grupos étnicos
                "negro_apr_tot": limpiar_valor(registro.get("NEGRO_TOTAL")),
                "afro_apr_tot": limpiar_valor(registro.get("AFROCOLOMBIANOS_TOTAL")),
                "palenq_apr_tot": limpiar_valor(registro.get("PALENQUEROS_TOTAL")),
                "raizal_apr_tot": limpiar_valor(registro.get("RAIZALES_TOTAL")),
                "indig_apr_tot": limpiar_valor(registro.get("INDIGENAS_TOTAL")),
                "rom_tot": limpiar_valor(registro.get("ROM_TOTAL")),
                
                # Discapacidad
                "discap_apr_tot": limpiar_valor(registro.get("DISCAPACIDAD_TOTAL")),
                "discap_aud_apr_tot": limpiar_valor(registro.get("DISCAPACIDAD_AUDITIVA_TOTAL")),
                "discap_vis_apr_tot": limpiar_valor(registro.get("DISCAPACIDAD_VISUAL_TOTAL")),
                "discap_fis_apr_tot": limpiar_valor(registro.get("DISCAPACIDAD_FISICA_TOTAL")),
                "discap_int_apr_tot": limpiar_valor(registro.get("DISCAPACIDAD_INTELECTUAL_TOTAL")),
                "discap_psico_apr_tot": limpiar_valor(registro.get("DISCAPACIDAD_PSICOSOCIAL_TOTAL")),
                "discap_mult_apr_tot": limpiar_valor(registro.get("DISCAPACIDAD_MULTIPLE_TOTAL")),
                "sordoceg_apr_tot": limpiar_valor(registro.get("SORDOCEGUERA_TOTAL")),
                
                # Desplazados por fenómenos naturales
                "despl_fen_nat_apr_tot": limpiar_valor(registro.get("DESPLAZADOS_FENOMENOS_NAT_TOTAL")),
                "despl_fen_nat_cab_fam_apr_tot": limpiar_valor(registro.get("DESPLAZADOS_FENOMENOS_NAT_CDF_TOTAL")),
                
                # Poblaciones especiales
                "adol_conf_ley_apr_tot": limpiar_valor(registro.get("ADOLESCENTE_CONFLICTO_LEY_TOTAL")),
                "adol_trab_apr_tot": limpiar_valor(registro.get("ADOLESCENTE_TRABAJADOR_TOTAL")),
                "inpec_apr_tot": limpiar_valor(registro.get("INPEC_TOTAL")),
                "jov_vuln_apr_tot": limpiar_valor(registro.get("JOVENES_VULNERABLES_TOTAL")),
                "muj_cabfam_apr_tot": limpiar_valor(registro.get("MUJER_CABEZA_FAMILIA_TOTAL")),
                "proc_reint_apr_tot": limpiar_valor(registro.get("PROC_REINTEGRACION_TOTAL")),
                "ado_desv_gr_arm_tot": limpiar_valor(registro.get("ADOLESCENTE_DESVINCULADO_GRUPOS_ARMADOS_TOTAL")),
                "rem_pal_tot": limpiar_valor(registro.get("REMITIDOS_PAL_TOTAL")),
                "sob_min_ant_tot": limpiar_valor(registro.get("SOBREVIVIENTES_MINAS_TOTAL")),
                "sold_camp_tot": limpiar_valor(registro.get("SOLDADOS_CAMPESINOS_TOTAL")),
                "terc_edad_tot": limpiar_valor(registro.get("TERCERA_EDAD_TOTAL")),
                "camp_tot": limpiar_valor(registro.get("CAMPESINOS_TOTAL")),
                "ning_tot": limpiar_valor(registro.get("NINGUNA_TOTAL")),
                "artes_tot": limpiar_valor(registro.get("ARTESANOS_TOTAL")),
                "empr_tot": limpiar_valor(registro.get("EMPRENDEDORES_TOTAL")),
                "mic_emp_tot": limpiar_valor(registro.get("MICROEMPRESAS_TOTAL")),
                "rem_cie_tot": limpiar_valor(registro.get("REMITIDOS_CIE_TOTAL")),
                
                # Total general
                "gran_total": limpiar_valor(registro.get("GRAN_TOTAL_APRENDICES"))
            }

            # Verificar si ya existe el registro
            existe = db.execute(
                text("SELECT 1 FROM Indicadores_programa WHERE cod_programa = :cod_programa"),
                {"cod_programa": cod_programa}
            ).fetchone()

            if existe:
                # UPDATE con TODAS las columnas
                db.execute(text("""
                    UPDATE Indicadores_programa SET
                        indig_despl_viol_apr_tot = :indig_despl_viol_apr_tot,
                        indig_despl_viol_cab_fam_apr_tot = :indig_despl_viol_cab_fam_apr_tot,
                        afro_despl_viol_apr_tot = :afro_despl_viol_apr_tot,
                        afro_despl_viol_cab_fam_apr_tot = :afro_despl_viol_cab_fam_apr_tot,
                        despl_viol_apr_tot = :despl_viol_apr_tot,
                        despl_viol_cab_fam_apr_tot = :despl_viol_cab_fam_apr_tot,
                        despl_disc_apr_tot = :despl_disc_apr_tot,
                        despojo_apr_tot = :despojo_apr_tot,
                        act_grup_arm_apr_tot = :act_grup_arm_apr_tot,
                        amenaza_apr_tot = :amenaza_apr_tot,
                        del_sex_apr_tot = :del_sex_apr_tot,
                        desap_forz_apr_tot = :desap_forz_apr_tot,
                        homi_masac_apr_tot = :homi_masac_apr_tot,
                        minas_exp_apr_tot = :minas_exp_apr_tot,
                        secuestro_apr_tot = :secuestro_apr_tot,
                        tortura_apr_tot = :tortura_apr_tot,
                        uso_men_grup_arm_apr_tot = :uso_men_grup_arm_apr_tot,
                        herido_apr_tot = :herido_apr_tot,
                        reclut_forz_apr_tot = :reclut_forz_apr_tot,
                        negro_apr_tot = :negro_apr_tot,
                        afro_apr_tot = :afro_apr_tot,
                        palenq_apr_tot = :palenq_apr_tot,
                        raizal_apr_tot = :raizal_apr_tot,
                        discap_apr_tot = :discap_apr_tot,
                        discap_aud_apr_tot = :discap_aud_apr_tot,
                        discap_vis_apr_tot = :discap_vis_apr_tot,
                        discap_fis_apr_tot = :discap_fis_apr_tot,
                        discap_int_apr_tot = :discap_int_apr_tot,
                        discap_psico_apr_tot = :discap_psico_apr_tot,
                        discap_mult_apr_tot = :discap_mult_apr_tot,
                        sordoceg_apr_tot = :sordoceg_apr_tot,
                        despl_fen_nat_apr_tot = :despl_fen_nat_apr_tot,
                        despl_fen_nat_cab_fam_apr_tot = :despl_fen_nat_cab_fam_apr_tot,
                        adol_conf_ley_apr_tot = :adol_conf_ley_apr_tot,
                        adol_trab_apr_tot = :adol_trab_apr_tot,
                        indig_apr_tot = :indig_apr_tot,
                        inpec_apr_tot = :inpec_apr_tot,
                        jov_vuln_apr_tot = :jov_vuln_apr_tot,
                        muj_cabfam_apr_tot = :muj_cabfam_apr_tot,
                        proc_reint_apr_tot = :proc_reint_apr_tot,
                        ado_desv_gr_arm_tot = :ado_desv_gr_arm_tot,
                        rem_pal_tot = :rem_pal_tot,
                        sob_min_ant_tot = :sob_min_ant_tot,
                        sold_camp_tot = :sold_camp_tot,
                        terc_edad_tot = :terc_edad_tot,
                        rom_tot = :rom_tot,
                        camp_tot = :camp_tot,
                        ning_tot = :ning_tot,
                        artes_tot = :artes_tot,
                        empr_tot = :empr_tot,
                        mic_emp_tot = :mic_emp_tot,
                        rem_cie_tot = :rem_cie_tot,
                        gran_total = :gran_total
                    WHERE cod_programa = :cod_programa
                """), datos)
                actualizados += 1
            else:
                # INSERT con TODAS las columnas
                db.execute(text("""
                    INSERT INTO Indicadores_programa (
                        cod_programa, indig_despl_viol_apr_tot, indig_despl_viol_cab_fam_apr_tot,
                        afro_despl_viol_apr_tot, afro_despl_viol_cab_fam_apr_tot, despl_viol_apr_tot,
                        despl_viol_cab_fam_apr_tot, despl_disc_apr_tot, despojo_apr_tot, act_grup_arm_apr_tot,
                        amenaza_apr_tot, del_sex_apr_tot, desap_forz_apr_tot, homi_masac_apr_tot,
                        minas_exp_apr_tot, secuestro_apr_tot, tortura_apr_tot, uso_men_grup_arm_apr_tot,
                        herido_apr_tot, reclut_forz_apr_tot, negro_apr_tot, afro_apr_tot, palenq_apr_tot,
                        raizal_apr_tot, discap_apr_tot, discap_aud_apr_tot, discap_vis_apr_tot,
                        discap_fis_apr_tot, discap_int_apr_tot, discap_psico_apr_tot, discap_mult_apr_tot,
                        sordoceg_apr_tot, despl_fen_nat_apr_tot, despl_fen_nat_cab_fam_apr_tot,
                        adol_conf_ley_apr_tot, adol_trab_apr_tot, indig_apr_tot, inpec_apr_tot,
                        jov_vuln_apr_tot, muj_cabfam_apr_tot, proc_reint_apr_tot, ado_desv_gr_arm_tot,
                        rem_pal_tot, sob_min_ant_tot, sold_camp_tot, terc_edad_tot, rom_tot, camp_tot,
                        ning_tot, artes_tot, empr_tot, mic_emp_tot, rem_cie_tot, gran_total
                    ) VALUES (
                        :cod_programa, :indig_despl_viol_apr_tot, :indig_despl_viol_cab_fam_apr_tot,
                        :afro_despl_viol_apr_tot, :afro_despl_viol_cab_fam_apr_tot, :despl_viol_apr_tot,
                        :despl_viol_cab_fam_apr_tot, :despl_disc_apr_tot, :despojo_apr_tot, :act_grup_arm_apr_tot,
                        :amenaza_apr_tot, :del_sex_apr_tot, :desap_forz_apr_tot, :homi_masac_apr_tot,
                        :minas_exp_apr_tot, :secuestro_apr_tot, :tortura_apr_tot, :uso_men_grup_arm_apr_tot,
                        :herido_apr_tot, :reclut_forz_apr_tot, :negro_apr_tot, :afro_apr_tot, :palenq_apr_tot,
                        :raizal_apr_tot, :discap_apr_tot, :discap_aud_apr_tot, :discap_vis_apr_tot,
                        :discap_fis_apr_tot, :discap_int_apr_tot, :discap_psico_apr_tot, :discap_mult_apr_tot,
                        :sordoceg_apr_tot, :despl_fen_nat_apr_tot, :despl_fen_nat_cab_fam_apr_tot,
                        :adol_conf_ley_apr_tot, :adol_trab_apr_tot, :indig_apr_tot, :inpec_apr_tot,
                        :jov_vuln_apr_tot, :muj_cabfam_apr_tot, :proc_reint_apr_tot, :ado_desv_gr_arm_tot,
                        :rem_pal_tot, :sob_min_ant_tot, :sold_camp_tot, :terc_edad_tot, :rom_tot, :camp_tot,
                        :ning_tot, :artes_tot, :empr_tot, :mic_emp_tot, :rem_cie_tot, :gran_total
                    )
                """), datos)
                insertados += 1

        except Exception as e:
            nombre_programa = registro.get("NOMBRE_PROGRAMA_FORMACION", "SIN NOMBRE")
            errores.append(f"Fila {i} - {nombre_programa}: {str(e)}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        errores.append(f"Error en commit: {str(e)}")

    return {
        "insertados": insertados,
        "actualizados": actualizados,
        "total_procesados": insertados + actualizados,
        "programas_no_encontrados": programas_no_encontrados,
        "errores": errores,
        "total_errores": len(errores)
    }




def get_programa_by_code(db: Session, cod_programa: int) -> Optional[dict]:
    """
    Obtiene un programa por su código
    """
    try:
        result = db.execute(
            text("SELECT * FROM Programas_formacion WHERE cod_programa = :cod_programa"),
            {"cod_programa": cod_programa}
        ).fetchone()
        
        if result:
            return dict(result._mapping)
        return None
    except SQLAlchemyError as e:
        logger.error(f"Error al buscar programa: {e}")
        raise Exception("Error de base de datos al buscar el programa")

def update_url_pdf(db: Session, cod_programa: int, url_pdf: str) -> bool:
    """
    Actualiza la URL del PDF de un programa
    """
    try:
        query = text("""
            UPDATE Programas_formacion 
            SET url_pdf = :url_pdf 
            WHERE cod_programa = :cod_programa
        """)
        db.execute(query, {"url_pdf": url_pdf, "cod_programa": cod_programa})
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar URL PDF: {e}")
        raise Exception("Error de base de datos al actualizar el programa")

