# Migraciones de base de datos

Las migraciones de esta carpeta se ejecutan manualmente; el servidor no las aplica
al iniciar. Antes de ejecutarlas, crea una copia de seguridad de la base de datos
seleccionada en tu entorno de MySQL.

Aplica los archivos `.sql` en orden por nombre desde phpMyAdmin, MySQL Workbench
o la consola de MySQL. Ejecuta estos archivos en el orden indicado:

1. `20261031_add_bcv_exchange_rates.sql`
2. `20261031_add_order_notes_and_update_time.sql`
3. `20261031_add_reception_details.sql`
4. `20261031_add_secure_tracking_tokens.sql`
5. `20261031_create_service_requests.sql`
6. `20261031_create_web_projects.sql`
7. `20261031_create_contracts_and_payments.sql`

La migración de solicitudes crea la tabla `solicitudes_servicio` e importa las
solicitudes web guardadas en las notas de clientes. La migración de proyectos
crea el espacio web y sus tareas; cada proyecto recibe un enlace privado para
compartir su avance. La migración de seguimiento agrega tokens aleatorios a las
órdenes. Las órdenes existentes recibirán un enlace nuevo cuando el equipo lo
genere desde su detalle; los QR antiguos basados en códigos secuenciales deben
reemplazarse.
La última migración agrega contratos de servicios y el registro de pagos por
contrato. Las condiciones del documento son editables y deben revisarse antes de
usarlas como acuerdo legal.

La migración de recepción guarda por separado el tipo de equipo, la condición,
los accesorios y las observaciones para emitir comprobantes sin incluir notas
internas.
