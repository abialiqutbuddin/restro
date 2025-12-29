-- AlterTable
ALTER TABLE `events` ADD COLUMN `approved_at` DATETIME(3) NULL,
    ADD COLUMN `client_approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `order_change_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `changes_json` JSON NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_by` BIGINT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `review_notes` TEXT NULL,

    INDEX `order_change_requests_order_id_idx`(`order_id`),
    INDEX `order_change_requests_reviewed_by_idx`(`reviewed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_change_requests` ADD CONSTRAINT `order_change_requests_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_change_requests` ADD CONSTRAINT `order_change_requests_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
