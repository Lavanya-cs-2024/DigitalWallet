/*
  Warnings:

  - You are about to drop the column `exchangeRate` on the `paymentorder` table. All the data in the column will be lost.
  - You are about to drop the column `paypalAmount` on the `paymentorder` table. All the data in the column will be lost.
  - You are about to drop the column `paypalCurrency` on the `paymentorder` table. All the data in the column will be lost.
  - You are about to drop the column `paypal_order_id` on the `paymentorder` table. All the data in the column will be lost.
  - You are about to drop the column `provider_capture_id` on the `paymenttransaction` table. All the data in the column will be lost.
  - You are about to drop the column `signature` on the `paymenttransaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paytm_order_id]` on the table `PaymentOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paytm_txn_id]` on the table `PaymentTransaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `paytm_order_id` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paytm_txn_id` to the `PaymentTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `PaymentOrder_paypal_order_id_key` ON `paymentorder`;

-- DropIndex
DROP INDEX `PaymentTransaction_provider_capture_id_key` ON `paymenttransaction`;

-- AlterTable
ALTER TABLE `paymentorder` DROP COLUMN `exchangeRate`,
    DROP COLUMN `paypalAmount`,
    DROP COLUMN `paypalCurrency`,
    DROP COLUMN `paypal_order_id`,
    ADD COLUMN `paytm_bank_txn_id` VARCHAR(191) NULL,
    ADD COLUMN `paytm_order_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `paytm_response_code` VARCHAR(191) NULL,
    ADD COLUMN `paytm_response_msg` VARCHAR(191) NULL,
    ADD COLUMN `paytm_txn_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `paymenttransaction` DROP COLUMN `provider_capture_id`,
    DROP COLUMN `signature`,
    ADD COLUMN `checksum` VARCHAR(191) NULL,
    ADD COLUMN `paytm_bank_name` VARCHAR(191) NULL,
    ADD COLUMN `paytm_bank_txn_id` VARCHAR(191) NULL,
    ADD COLUMN `paytm_payment_mode` VARCHAR(191) NULL,
    ADD COLUMN `paytm_txn_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `webhookevent` MODIFY `provider` VARCHAR(191) NOT NULL DEFAULT 'paytm';

-- CreateIndex
CREATE UNIQUE INDEX `PaymentOrder_paytm_order_id_key` ON `PaymentOrder`(`paytm_order_id`);

-- CreateIndex
CREATE INDEX `PaymentOrder_paytm_order_id_idx` ON `PaymentOrder`(`paytm_order_id`);

-- CreateIndex
CREATE UNIQUE INDEX `PaymentTransaction_paytm_txn_id_key` ON `PaymentTransaction`(`paytm_txn_id`);
