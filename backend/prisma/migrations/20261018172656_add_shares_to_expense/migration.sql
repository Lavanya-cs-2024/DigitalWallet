-- AlterTable
ALTER TABLE `expense` MODIFY `split_method` ENUM('EQUAL', 'PERCENT', 'EXACT', 'SHARES') NOT NULL;

-- AlterTable
ALTER TABLE `expensesplit` ADD COLUMN `shares` INTEGER NULL;
