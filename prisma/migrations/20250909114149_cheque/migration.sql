/*
  Warnings:

  - The values [cheque] on the enum `event_payments_method` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `event_payments` MODIFY `method` ENUM('cash', 'check', 'credit', 'others') NOT NULL;
