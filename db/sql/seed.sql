-- Datos de ejemplo para probar el flujo de pago end-to-end.
-- Ejecutar después de schema.sql.

INSERT INTO usuarios (id, nombre_completo, correo_electronico, telefono, tipo_documento, numero_documento)
VALUES ('11111111-1111-1111-1111-111111111111', 'Juan Pérez', 'juan.perez@example.com', '3001234567', 'CC', '1020304050')
ON CONFLICT (id) DO NOTHING;

INSERT INTO productos (id, nombre, descripcion, stock, precio_en_centavos)
VALUES ('22222222-2222-2222-2222-222222222222', 'Camiseta básica', 'Camiseta 100% algodón', 50, 5000000)
ON CONFLICT (id) DO NOTHING;
