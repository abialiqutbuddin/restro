/*
  Warnings:

  - You are about to drop the column `customer_email` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `customer_name` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `customer_phone` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `events` DROP COLUMN `customer_email`,
    DROP COLUMN `customer_name`,
    DROP COLUMN `customer_phone`,
    ADD COLUMN `customer_id` BIGINT NULL;

-- CreateTable
CREATE TABLE `customers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(40) NULL,
    `default_venue` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customers_email_key`(`email`),
    UNIQUE INDEX `customers_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(150) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(150) NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'user',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `events_customer_id_idx` ON `events`(`customer_id`);

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
