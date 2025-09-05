-- AlterTable
ALTER TABLE `events` ADD COLUMN `discount` DECIMAL(12, 2) NULL;

-- CreateTable
CREATE TABLE `event_payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `event_id` BIGINT NOT NULL,
    `method` ENUM('cash', 'cheque', 'credit', 'others') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `paid_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('pending', 'succeeded', 'failed', 'refunded') NOT NULL DEFAULT 'succeeded',
    `notes` TEXT NULL,
    `square_id` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `event_payments_event_id_idx`(`event_id`),
    INDEX `event_payments_method_idx`(`method`),
    INDEX `event_payments_status_idx`(`status`),
    INDEX `event_payments_square_id_idx`(`square_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_payments` ADD CONSTRAINT `event_payments_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
