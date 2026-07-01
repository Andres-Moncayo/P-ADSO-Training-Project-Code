/* DRAWDB https://www.drawdb.app/editor?shareId=9f04e7ff5b67e7debca661d0b4791426 */ 

-- Primero crear las tablas sin dependencias
CREATE TABLE IF NOT EXISTS rol (
    id_rol SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS Redes_conocimiento (
    id_red INTEGER AUTO_INCREMENT,
    nombre VARCHAR(80) NOT NULL,
    PRIMARY KEY (id_red)
);

-- Ahora crear Programas_formacion con clave primaria compuesta
CREATE TABLE IF NOT EXISTS Programas_formacion (
    cod_programa MEDIUMINT NOT NULL,
    version CHAR(4) NOT NULL,
    nombre VARCHAR(180) NOT NULL,
    nivel VARCHAR(50),
    id_red INTEGER,
    tiempo_dur SMALLINT,
    unidad_dur VARCHAR(20),
    estado VARCHAR(50),
    url_pdf VARCHAR(180),
    PRIMARY KEY (cod_programa, version),  -- Clave primaria compuesta

    FOREIGN KEY (id_red)
        REFERENCES Redes_conocimiento(id_red)
        ON UPDATE NO ACTION 
        ON DELETE NO ACTION
);

-- Crear usuario después de rol
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(80),
    num_documento CHAR(12),
    correo VARCHAR(100) UNIQUE,
    contra_encript VARCHAR(140),
    id_rol SMALLINT UNSIGNED,
    estado BOOLEAN NOT NULL DEFAULT 1,
    
    FOREIGN KEY (id_rol) 
        REFERENCES rol(id_rol)
);

-- Ahora crear Registro_calificado con clave foránea compuesta
CREATE TABLE IF NOT EXISTS Registro_calificado (
    cod_programa MEDIUMINT NOT NULL,
    version CHAR(4) NOT NULL,
    tipo_tramite VARCHAR(50),
    fecha_radicado DATE,
    numero_resolucion MEDIUMINT,
    fecha_resolucion DATE,
    fecha_vencimiento DATE,
    vigencia VARCHAR(25),
    modalidad VARCHAR(25),
    clasificacion VARCHAR(15),
    estado_catalogo VARCHAR(50),
    PRIMARY KEY (cod_programa, version),  -- Clave primaria compuesta

    FOREIGN KEY (cod_programa, version)
        REFERENCES Programas_formacion(cod_programa, version)
        ON UPDATE NO ACTION 
        ON DELETE NO ACTION
);

-- Finalmente crear Indicadores_programa con número_ficha
CREATE TABLE IF NOT EXISTS Indicadores_programa (
    numero_ficha INT UNSIGNED NOT NULL,  -- Nuevo campo único
    cod_programa MEDIUMINT NOT NULL,
    version CHAR(4) NOT NULL,
    indig_despl_viol_apr_tot SMALLINT,
    indig_despl_viol_cab_fam_apr_tot SMALLINT,
    afro_despl_viol_apr_tot SMALLINT,
    afro_despl_viol_cab_fam_apr_tot SMALLINT,
    despl_viol_apr_tot SMALLINT,
    despl_viol_cab_fam_apr_tot SMALLINT,
    despl_disc_apr_tot SMALLINT,
    despojo_apr_tot SMALLINT,
    act_grup_arm_apr_tot SMALLINT,
    amenaza_apr_tot SMALLINT,
    del_sex_apr_tot SMALLINT,
    desap_forz_apr_tot SMALLINT,
    homi_masac_apr_tot SMALLINT,
    minas_exp_apr_tot SMALLINT,
    secuestro_apr_tot SMALLINT,
    tortura_apr_tot SMALLINT,
    uso_men_grup_arm_apr_tot SMALLINT,
    herido_apr_tot SMALLINT,
    reclut_forz_apr_tot SMALLINT,
    negro_apr_tot SMALLINT,
    afro_apr_tot SMALLINT,
    palenq_apr_tot SMALLINT,
    raizal_apr_tot SMALLINT,
    discap_apr_tot SMALLINT,
    discap_aud_apr_tot SMALLINT,
    discap_vis_apr_tot SMALLINT,
    discap_fis_apr_tot SMALLINT,
    discap_int_apr_tot SMALLINT,
    discap_psico_apr_tot SMALLINT,
    discap_mult_apr_tot SMALLINT,
    sordoceg_apr_tot SMALLINT,
    despl_fen_nat_apr_tot SMALLINT,
    despl_fen_nat_cab_fam_apr_tot SMALLINT,
    adol_conf_ley_apr_tot SMALLINT,
    adol_trab_apr_tot SMALLINT,
    indig_apr_tot SMALLINT,
    inpec_apr_tot SMALLINT,
    jov_vuln_apr_tot SMALLINT,
    muj_cabfam_apr_tot SMALLINT,
    proc_reint_apr_tot SMALLINT,
    ado_desv_gr_arm_tot SMALLINT,
    rem_pal_tot SMALLINT,
    sob_min_ant_tot SMALLINT,
    sold_camp_tot SMALLINT,
    terc_edad_tot SMALLINT,
    rom_tot SMALLINT,
    camp_tot SMALLINT,
    ning_tot SMALLINT,
    artes_tot SMALLINT,
    empr_tot SMALLINT,
    mic_emp_tot SMALLINT,
    rem_cie_tot SMALLINT,
    gran_total SMALLINT,
    
    PRIMARY KEY (numero_ficha, cod_programa),  -- Clave primaria compuesta con número_ficha
    
    -- Clave foránea compuesta hacia Programas_formacion
    FOREIGN KEY (cod_programa, version)
        REFERENCES Programas_formacion(cod_programa, version)
        ON UPDATE NO ACTION 
        ON DELETE NO ACTION,
    
    -- Restricción única para numero_ficha (opcional, ya que es AUTO_INCREMENT)
    UNIQUE (numero_ficha)
);