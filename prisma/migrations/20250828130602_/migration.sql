/*
  Warnings:

  - A unique constraint covering the columns `[gcalEventId]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `events` ADD COLUMN `gcalEventId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `uniq_events_gcal_event_id` ON `events`(`gcalEventId`);
