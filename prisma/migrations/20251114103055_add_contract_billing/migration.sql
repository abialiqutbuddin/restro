-- AlterTable
ALTER TABLE `events` ADD COLUMN `billing_status` ENUM('unbilled', 'invoiced', 'paid', 'written_off') NOT NULL DEFAULT 'unbilled',
    ADD COLUMN `billing_type` ENUM('per_event', 'contract') NOT NULL DEFAULT 'per_event',
    ADD COLUMN `contract_id` BIGINT NULL;

-- CreateTable
CREATE TABLE `contracts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `billing_cycle` VARCHAR(50) NOT NULL DEFAULT 'monthly',
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contracts_code_key`(`code`),
    INDEX `contracts_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceEvent` (
    `invoiceId` INTEGER NOT NULL,
    `eventId` BIGINT NOT NULL,
    `lineTotal` DECIMAL(12, 2) NOT NULL,

    INDEX `InvoiceEvent_eventId_idx`(`eventId`),
    PRIMARY KEY (`invoiceId`, `eventId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `events_contract_id_idx` ON `events`(`contract_id`);

-- CreateIndex
CREATE INDEX `events_billing_type_billing_status_event_datetime_idx` ON `events`(`billing_type`, `billing_status`, `event_datetime`);

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceEvent` ADD CONSTRAINT `InvoiceEvent_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceEvent` ADD CONSTRAINT `InvoiceEvent_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
