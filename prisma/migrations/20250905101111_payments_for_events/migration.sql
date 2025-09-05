/*
  Warnings:

  - You are about to drop the column `event_id` on the `event_payments` table. All the data in the column will be lost.
  - Added the required column `event_gcal_id` to the `event_payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `event_payments` DROP FOREIGN KEY `event_payments_event_id_fkey`;

-- DropIndex
DROP INDEX `event_payments_event_id_idx` ON `event_payments`;

-- DropIndex
DROP INDEX `event_payments_method_idx` ON `event_payments`;

-- DropIndex
DROP INDEX `event_payments_square_id_idx` ON `event_payments`;

-- DropIndex
DROP INDEX `event_payments_status_idx` ON `event_payments`;

-- AlterTable
ALTER TABLE `event_payments` DROP COLUMN `event_id`,
    ADD COLUMN `event_gcal_id` VARCHAR(191) NOT NULL,
    MODIFY `notes` VARCHAR(191) NULL,
    MODIFY `square_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `event_payments_event_gcal_id_idx` ON `event_payments`(`event_gcal_id`);

-- AddForeignKey
ALTER TABLE `event_payments` ADD CONSTRAINT `event_payments_event_gcal_id_fkey` FOREIGN KEY (`event_gcal_id`) REFERENCES `events`(`gcalEventId`) ON DELETE CASCADE ON UPDATE CASCADE;
