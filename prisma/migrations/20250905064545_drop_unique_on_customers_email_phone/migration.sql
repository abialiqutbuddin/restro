/*
  Warnings:

  - You are about to alter the column `phone` on the `customers` table. The data in that column could be lost. The data in that column will be cast from `VarChar(40)` to `VarChar(30)`.

*/
-- DropIndex
DROP INDEX `customers_email_key` ON `customers`;

-- DropIndex
DROP INDEX `customers_phone_key` ON `customers`;

-- AlterTable
ALTER TABLE `customers` MODIFY `email` VARCHAR(255) NULL,
    MODIFY `phone` VARCHAR(30) NULL;

-- CreateIndex
CREATE INDEX `customers_email_idx` ON `customers`(`email`);

-- CreateIndex
CREATE INDEX `customers_phone_idx` ON `customers`(`phone`);
