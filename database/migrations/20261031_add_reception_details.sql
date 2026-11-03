ALTER TABLE ordenes_reparacion
  ADD COLUMN tipo_equipo VARCHAR(50) NULL,
  ADD COLUMN condicion_recepcion TEXT NULL,
  ADD COLUMN accesorios_recepcion TEXT NULL,
  ADD COLUMN observaciones_recepcion TEXT NULL;
