-- CreateTable
CREATE TABLE `order_audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `actor_type` ENUM('CLIENT', 'STAFF', 'SYSTEM') NOT NULL,
    `actor_id` BIGINT NULL,
    `action` VARCHAR(100) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NULL,

    INDEX `order_audit_logs_order_id_idx`(`order_id`),
    INDEX `order_audit_logs_actor_id_idx`(`actor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_audit_logs` ADD CONSTRAINT `order_audit_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_audit_logs` ADD CONSTRAINT `order_audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
