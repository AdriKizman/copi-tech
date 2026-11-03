CREATE TABLE proyectos_web (
  id INT NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion_cliente TEXT NULL,
  estado ENUM('Planificación', 'En desarrollo', 'En revisión', 'Completado', 'Pausado')
    NOT NULL DEFAULT 'Planificación',
  fecha_entrega DATE NULL,
  token_acceso CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_proyectos_web_token (token_acceso),
  KEY idx_proyectos_web_cliente (cliente_id),
  CONSTRAINT fk_proyectos_web_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tareas_proyecto_web (
  id INT NOT NULL AUTO_INCREMENT,
  proyecto_id INT NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  estado ENUM('Pendiente', 'En progreso', 'Completada') NOT NULL DEFAULT 'Pendiente',
  visible_cliente TINYINT(1) NOT NULL DEFAULT 1,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tareas_proyecto_web (proyecto_id, creada_en),
  CONSTRAINT fk_tareas_proyecto_web
    FOREIGN KEY (proyecto_id) REFERENCES proyectos_web(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
