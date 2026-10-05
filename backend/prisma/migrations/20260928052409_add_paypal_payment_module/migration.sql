/*
  Warnings:

  - You are about to drop the column `resendCount` on the `otp` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_order_id` on the `paymentorder` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_payment_id` on the `paymenttransaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paypal_order_id]` on the table `PaymentOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,idempotency_key]` on the table `PaymentOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[provider_capture_id]` on the table `PaymentTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[alias]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `exchangeRate` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idempotency_key` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paypalAmount` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_capture_id` to the `PaymentTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `PaymentOrder_razorpay_order_id_key` ON `paymentorder`;

-- DropIndex
DROP INDEX `PaymentTransaction_razorpay_payment_id_key` ON `paymenttransaction`;

-- AlterTable
ALTER TABLE `otp` DROP COLUMN `resendCount`,
    ADD COLUMN `resend_count` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `paymentorder` DROP COLUMN `razorpay_order_id`,
    ADD COLUMN `exchangeRate` DECIMAL(10, 4) NOT NULL,
    ADD COLUMN `idempotency_key` VARCHAR(191) NOT NULL,
    ADD COLUMN `paid_at` DATETIME(3) NULL,
    ADD COLUMN `paypalAmount` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `paypalCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    ADD COLUMN `paypal_order_id` VARCHAR(191) NULL,
    ADD COLUMN `provider_paid_at` DATETIME(3) NULL,
    MODIFY `status` ENUM('INITIATED', 'CREATED', 'PENDING_VERIFICATION', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REVIEW_REQUIRED') NOT NULL DEFAULT 'INITIATED';

-- AlterTable
ALTER TABLE `paymenttransaction` DROP COLUMN `razorpay_payment_id`,
    ADD COLUMN `provider_capture_id` VARCHAR(191) NOT NULL,
    MODIFY `signature` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `alias` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `WebhookEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'paypal',
    `event_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookEvent_event_type_idx`(`event_type`),
    UNIQUE INDEX `WebhookEvent_provider_event_id_key`(`provider`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `PaymentOrder_paypal_order_id_key` ON `PaymentOrder`(`paypal_order_id`);

-- CreateIndex
CREATE INDEX `PaymentOrder_status_idx` ON `PaymentOrder`(`status`);

-- CreateIndex
CREATE UNIQUE INDEX `PaymentOrder_user_id_idempotency_key_key` ON `PaymentOrder`(`user_id`, `idempotency_key`);

-- CreateIndex
CREATE UNIQUE INDEX `PaymentTransaction_provider_capture_id_key` ON `PaymentTransaction`(`provider_capture_id`);

-- CreateIndex
CREATE UNIQUE INDEX `User_alias_key` ON `User`(`alias`);

-- CreateIndex
CREATE INDEX `User_alias_idx` ON `User`(`alias`);
