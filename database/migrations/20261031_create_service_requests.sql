CREATE TABLE solicitudes_servicio (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  email VARCHAR(150) NULL,
  servicio VARCHAR(80) NOT NULL,
  mensaje TEXT NOT NULL,
  estado ENUM('Pendiente', 'Aceptada') NOT NULL DEFAULT 'Pendiente',
  cliente_id INT NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  aceptada_en TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_solicitudes_estado_fecha (estado, creada_en),
  KEY idx_solicitudes_cliente (cliente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO solicitudes_servicio
  (nombre, telefono, email, servicio, mensaje, cliente_id, creada_en)
SELECT
  nombre,
  telefono,
  email,
  TRIM(SUBSTRING_INDEX(SUBSTRING(notas, LENGTH('Solicitud web - ') + 1), '\n', 1)),
  TRIM(SUBSTRING(
    notas,
    LOCATE('\n', notas, LENGTH('Solicitud web - ') + 1) + 1
  )),
  id,
  creado_en
FROM clientes
WHERE notas LIKE 'Solicitud web - %';
