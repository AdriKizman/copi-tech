ALTER TABLE ordenes_reparacion
  ADD COLUMN tracking_token CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD UNIQUE KEY uq_ordenes_tracking_token (tracking_token);
