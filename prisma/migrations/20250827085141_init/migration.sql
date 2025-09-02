-- CreateTable
CREATE TABLE `category` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `menu_items_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sizes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `description` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sizes_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricing_unit` (
    `code` VARCHAR(50) NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `qty_label` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_unit` (
    `category_id` BIGINT NOT NULL,
    `unit_code` VARCHAR(50) NOT NULL,
    `hint` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`category_id`, `unit_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_name` VARCHAR(150) NOT NULL,
    `customer_phone` VARCHAR(40) NULL,
    `customer_email` VARCHAR(150) NULL,
    `event_datetime` DATETIME(3) NOT NULL,
    `venue` VARCHAR(200) NULL,
    `delivery_charges` DECIMAL(12, 2) NULL,
    `is_delivery` BOOLEAN NULL DEFAULT false,
    `service_charges` DECIMAL(12, 2) NULL,
    `headcount_est` INTEGER NULL,
    `notes` TEXT NULL,
    `calender_text` TEXT NULL,
    `order_total` DECIMAL(12, 2) NULL,
    `status` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_caterings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `event_id` BIGINT NOT NULL,
    `category_id` BIGINT NOT NULL,
    `title_override` VARCHAR(150) NULL,
    `instructions` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `event_caterings_event_id_idx`(`event_id`),
    INDEX `event_caterings_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_catering_orders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `event_catering_id` BIGINT NOT NULL,
    `unit_code` VARCHAR(50) NOT NULL,
    `pricing_mode` VARCHAR(50) NOT NULL,
    `qty` DECIMAL(12, 2) NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `line_subtotal` DECIMAL(12, 2) NOT NULL,
    `calc_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `event_catering_orders_event_catering_id_idx`(`event_catering_id`),
    INDEX `event_catering_orders_unit_code_idx`(`unit_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_catering_menu_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `event_catering_order_id` BIGINT NOT NULL,
    `position_number` INTEGER NOT NULL,
    `size_id` BIGINT NULL,
    `item_id` BIGINT NOT NULL,
    `qty_per_unit` DECIMAL(12, 2) NOT NULL,
    `component_price` DECIMAL(12, 2) NULL,
    `component_subtotal_for_one_unit` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `event_catering_menu_items_event_catering_order_id_idx`(`event_catering_order_id`),
    INDEX `event_catering_menu_items_item_id_idx`(`item_id`),
    INDEX `event_catering_menu_items_size_id_idx`(`size_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `category_unit` ADD CONSTRAINT `category_unit_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_unit` ADD CONSTRAINT `category_unit_unit_code_fkey` FOREIGN KEY (`unit_code`) REFERENCES `pricing_unit`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_caterings` ADD CONSTRAINT `event_caterings_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_caterings` ADD CONSTRAINT `event_caterings_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_catering_orders` ADD CONSTRAINT `event_catering_orders_event_catering_id_fkey` FOREIGN KEY (`event_catering_id`) REFERENCES `event_caterings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_catering_orders` ADD CONSTRAINT `event_catering_orders_unit_code_fkey` FOREIGN KEY (`unit_code`) REFERENCES `pricing_unit`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_catering_menu_items` ADD CONSTRAINT `event_catering_menu_items_event_catering_order_id_fkey` FOREIGN KEY (`event_catering_order_id`) REFERENCES `event_catering_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_catering_menu_items` ADD CONSTRAINT `event_catering_menu_items_size_id_fkey` FOREIGN KEY (`size_id`) REFERENCES `sizes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_catering_menu_items` ADD CONSTRAINT `event_catering_menu_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
