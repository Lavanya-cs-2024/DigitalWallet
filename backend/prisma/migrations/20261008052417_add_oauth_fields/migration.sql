/*
  Warnings:

  - A unique constraint covering the columns `[google_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `auth_provider` VARCHAR(191) NOT NULL DEFAULT 'local',
    ADD COLUMN `google_id` VARCHAR(191) NULL,
    MODIFY `mobile` VARCHAR(191) NULL,
    MODIFY `password_hash` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_google_id_key` ON `User`(`google_id`);
