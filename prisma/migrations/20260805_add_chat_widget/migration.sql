-- CreateTable
CREATE TABLE `chat_sesiones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `telefono` VARCHAR(20) NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'abierta',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `chat_sesiones_telefono_key`(`telefono`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_mensajes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sesion_id` INTEGER NOT NULL,
    `direccion` VARCHAR(10) NOT NULL,
    `texto` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_mensajes_sesion_id_idx`(`sesion_id`),
    INDEX `chat_mensajes_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chat_mensajes` ADD CONSTRAINT `chat_mensajes_sesion_id_fkey` FOREIGN KEY (`sesion_id`) REFERENCES `chat_sesiones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
