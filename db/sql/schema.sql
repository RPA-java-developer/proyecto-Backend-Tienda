-- ============================================================
-- Esquema de base de datos - tienda-backend
-- usuarios y productos: se administran con INSERT/UPDATE manuales.
-- ordenes y transacciones_pago: las escribe el backend (NestJS).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- para gen_random_uuid()

CREATE TABLE IF NOT EXISTS usuarios (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo     VARCHAR(150)     NOT NULL,
    correo_electronico  VARCHAR(150)     NOT NULL UNIQUE,
    telefono            VARCHAR(20)      NOT NULL,
    tipo_documento      VARCHAR(5)       NOT NULL,
    numero_documento    VARCHAR(20)      NOT NULL,
    creado_en           TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre               VARCHAR(150)    NOT NULL,
    descripcion          TEXT,
    stock                INTEGER         NOT NULL CHECK (stock >= 0),
    precio_en_centavos   BIGINT          NOT NULL CHECK (precio_en_centavos > 0),
    creado_en            TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ordenes (
    id                       UUID PRIMARY KEY,
    usuario_id               UUID         NOT NULL REFERENCES usuarios(id),
    producto_id               UUID        NOT NULL REFERENCES productos(id),
    cantidad                  INTEGER     NOT NULL CHECK (cantidad > 0),
    monto_total_en_centavos   BIGINT      NOT NULL CHECK (monto_total_en_centavos > 0),
    moneda                    VARCHAR(5)  NOT NULL,
    estado                     VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',
    creado_en                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transacciones_pago (
    id                        UUID PRIMARY KEY,
    orden_id                   UUID        NOT NULL REFERENCES ordenes(id),
    referencia_pasarela        VARCHAR(100) NOT NULL,
    estado                      VARCHAR(15) NOT NULL,
    ultimos_cuatro_digitos     VARCHAR(4)  NOT NULL,
    numero_cuotas               INTEGER    NOT NULL,
    respuesta_cruda             JSONB,
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ordenes_usuario_id ON ordenes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_orden_id ON transacciones_pago(orden_id);
