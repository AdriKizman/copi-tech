CREATE TABLE IF NOT EXISTS contratos_servicio (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(32) NOT NULL,
  cliente_id INT UNSIGNED NOT NULL,
  orden_id INT UNSIGNED NULL,
  proyecto_web_id INT NULL,
  solicitud_id INT NULL,
  tipo_trabajo ENUM('Reparación', 'Proyecto web', 'Servicio general') NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  alcance TEXT NOT NULL,
  condiciones TEXT NOT NULL,
  garantia_condiciones TEXT NULL,
  fecha_entrega DATE NULL,
  monto_total_usd DECIMAL(12,2) NOT NULL,
  prestador_nombre VARCHAR(150) NOT NULL,
  prestador_identificacion VARCHAR(80) NULL,
  prestador_direccion VARCHAR(255) NULL,
  prestador_telefono VARCHAR(30) NULL,
  prestador_email VARCHAR(150) NULL,
  estado ENUM('Borrador', 'Enviado', 'Aceptado', 'Cancelado') NOT NULL DEFAULT 'Borrador',
  token_publico CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  enviado_en DATETIME NULL,
  aceptado_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contratos_servicio_codigo (codigo),
  UNIQUE KEY uq_contratos_servicio_token (token_publico),
  KEY idx_contratos_cliente (cliente_id, creado_en),
  KEY idx_contratos_orden (orden_id),
  KEY idx_contratos_proyecto (proyecto_web_id),
  KEY idx_contratos_solicitud (solicitud_id),
  CONSTRAINT chk_contratos_servicio_monto CHECK (monto_total_usd > 0),
  CONSTRAINT fk_contratos_servicio_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contratos_servicio_orden
    FOREIGN KEY (orden_id) REFERENCES ordenes_reparacion(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contratos_servicio_proyecto
    FOREIGN KEY (proyecto_web_id) REFERENCES proyectos_web(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contratos_servicio_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_servicio(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pagos_contrato (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  contrato_id INT UNSIGNED NOT NULL,
  monto DECIMAL(14,2) NOT NULL,
  moneda ENUM('USD', 'VES') NOT NULL,
  tasa_usd_ves DECIMAL(18,6) NULL,
  equivalente_usd DECIMAL(14,4) NOT NULL,
  metodo VARCHAR(60) NOT NULL,
  referencia VARCHAR(120) NULL,
  fecha_pago DATE NOT NULL,
  registrado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pagos_contrato_fecha (contrato_id, fecha_pago),
  CONSTRAINT chk_pagos_contrato_monto CHECK (monto > 0 AND equivalente_usd > 0),
  CONSTRAINT chk_pagos_contrato_tasa CHECK (
    (moneda = 'USD' AND (tasa_usd_ves IS NULL OR tasa_usd_ves > 0))
    OR (moneda = 'VES' AND tasa_usd_ves > 0)
  ),
  CONSTRAINT fk_pagos_contrato_contrato
    FOREIGN KEY (contrato_id) REFERENCES contratos_servicio(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
