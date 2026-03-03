-- Migration: Add brute-force lockout fields to User table
-- Run this in phpMyAdmin against the u517833616_docusystem database

ALTER TABLE `User`
  ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN `lockedUntil`         DATETIME NULL;
