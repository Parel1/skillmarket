/*
  Warnings:

  - A unique constraint covering the columns `[paymentReference]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `order` ADD COLUMN `paymentReference` VARCHAR(191) NULL,
    ADD COLUMN `paymentStatus` ENUM('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE UNIQUE INDEX `Order_paymentReference_key` ON `Order`(`paymentReference`);
