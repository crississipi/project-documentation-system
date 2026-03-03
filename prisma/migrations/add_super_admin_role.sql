-- ============================================================
-- Migration: Add SUPER_ADMIN to User.role enum
-- Run this in phpMyAdmin or Hostinger's MySQL panel
-- Database: u517833616_docusystem
-- ============================================================

-- Step 1: Extend the enum to include SUPER_ADMIN
ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('USER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER';

-- Step 2: Promote your account to SUPER_ADMIN
--         Replace the email below with your actual email address
UPDATE `User`
  SET `role` = 'SUPER_ADMIN'
  WHERE `email` = 'your@email.com';

-- Step 3 (optional): Verify the change
SELECT `id`, `email`, `name`, `role` FROM `User` WHERE `role` IN ('ADMIN', 'SUPER_ADMIN');
