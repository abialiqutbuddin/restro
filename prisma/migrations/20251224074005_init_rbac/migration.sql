/*
  Warnings:

  - You are about to alter the column `role` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `event_payments` MODIFY `event_gcal_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `events` ADD COLUMN `event_type` VARCHAR(50) NULL,
    ADD COLUMN `is_locked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sales_tax_amount` DECIMAL(12, 2) NULL,
    ADD COLUMN `sales_tax_pct` DECIMAL(5, 2) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'USER') NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE `order_magic_links` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_by_user_id` BIGINT NULL,
    `last_accessed_at` DATETIME(3) NULL,
    `access_count` INTEGER NOT NULL DEFAULT 0,

    INDEX `order_magic_links_order_id_idx`(`order_id`),
    INDEX `order_magic_links_token_hash_idx`(`token_hash`),
    INDEX `order_magic_links_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_magic_links` ADD CONSTRAINT `order_magic_links_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_magic_links` ADD CONSTRAINT `order_magic_links_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
