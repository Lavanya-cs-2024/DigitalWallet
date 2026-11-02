/*
  Warnings:

  - Added the required column `expense_id` to the `Settlement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `settlement` ADD COLUMN `expense_id` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `Settlement_expense_id_idx` ON `Settlement`(`expense_id`);

-- AddForeignKey
ALTER TABLE `Settlement` ADD CONSTRAINT `Settlement_expense_id_fkey` FOREIGN KEY (`expense_id`) REFERENCES `Expense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
