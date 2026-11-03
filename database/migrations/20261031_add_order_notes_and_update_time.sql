ALTER TABLE ordenes_reparacion
  ADD COLUMN notas TEXT NULL,
  ADD COLUMN actualizado_en TIMESTAMP NULL DEFAULT NULL;

UPDATE ordenes_reparacion
SET actualizado_en = fecha_ingreso
WHERE actualizado_en IS NULL;

ALTER TABLE ordenes_reparacion
  MODIFY COLUMN actualizado_en TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP;
