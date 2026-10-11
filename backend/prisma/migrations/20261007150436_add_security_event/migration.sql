-- AlterTable
ALTER TABLE `webhookevent` MODIFY `provider` VARCHAR(191) NOT NULL DEFAULT 'phonepe';

-- CreateTable
CREATE TABLE `SecurityEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SecurityEvent_user_id_idx`(`user_id`),
    INDEX `SecurityEvent_event_type_idx`(`event_type`),
    INDEX `SecurityEvent_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
