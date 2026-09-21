-- Modo tenant por subdominio:
-- 1. Cedula unica por tenant (antes global) para reusar identificaciones entre empresas.
-- 2. customDomain para clientes con dominio propio.
-- 3. tenant_id en chat_sesiones para aislar el bot de WhatsApp por empresa.

ALTER TABLE `usuarios` DROP KEY `usuarios_cedula_key`;
ALTER TABLE `usuarios` ADD UNIQUE KEY `usuarios_tenant_cedula_key` (`tenant_id`, `cedula`);

ALTER TABLE `tenants` ADD COLUMN `custom_domain` VARCHAR(255) NULL;
ALTER TABLE `tenants` ADD UNIQUE KEY `tenants_custom_domain_key` (`custom_domain`);

ALTER TABLE `chat_sesiones` ADD COLUMN `tenant_id` INT NULL;
ALTER TABLE `chat_sesiones` ADD INDEX `chat_sesiones_tenant_id_idx` (`tenant_id`);
ALTER TABLE `chat_sesiones` ADD CONSTRAINT `chat_sesiones_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
