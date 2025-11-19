/*
  Warnings:

  - You are about to drop the column `billing_type` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `contract_id` on the `events` table. All the data in the column will be lost.
  - You are about to drop the `contracts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `contracts` DROP FOREIGN KEY `contracts_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `events` DROP FOREIGN KEY `events_contract_id_fkey`;

-- DropIndex
DROP INDEX `events_billing_type_billing_status_event_datetime_idx` ON `events`;

-- DropIndex
DROP INDEX `events_contract_id_idx` ON `events`;

-- AlterTable
ALTER TABLE `events` DROP COLUMN `billing_type`,
    DROP COLUMN `contract_id`;

-- DropTable
DROP TABLE `contracts`;

-- CreateIndex
CREATE INDEX `events_billing_status_event_datetime_idx` ON `events`(`billing_status`, `event_datetime`);
