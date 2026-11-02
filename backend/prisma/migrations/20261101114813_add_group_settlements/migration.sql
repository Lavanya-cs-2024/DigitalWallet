/*
  Warnings:

  - You are about to drop the column `expense_id` on the `settlement` table. All the data in the column will be lost.
  - Added the required column `group_id` to the `Settlement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `settlement` DROP FOREIGN KEY `Settlement_expense_id_fkey`;

-- DropIndex
DROP INDEX `Settlement_expense_id_idx` ON `settlement`;

-- AlterTable
ALTER TABLE `settlement` DROP COLUMN `expense_id`,
    ADD COLUMN `group_id` INTEGER NOT NULL,
    ADD COLUMN `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('PENDING', 'PARTIALLY_PAID', 'COMPLETED', 'PENDING_CONFIRMATION', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX `Settlement_group_id_idx` ON `Settlement`(`group_id`);

-- AddForeignKey
ALTER TABLE `Settlement` ADD CONSTRAINT `Settlement_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
