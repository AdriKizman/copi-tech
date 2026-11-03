CREATE TABLE tasas_cambio_bcv (
  fecha DATE NOT NULL,
  usd_ves DECIMAL(18, 6) NOT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (fecha),
  CONSTRAINT chk_tasas_cambio_bcv_usd_ves CHECK (usd_ves > 0)
);
