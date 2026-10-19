-- Project Manager database setup (MySQL 8.0+)
-- Run this script with a MySQL account that can create databases and tables.

CREATE DATABASE IF NOT EXISTS `ss181301_tamitools`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `ss181301_tamitools`;

CREATE TABLE IF NOT EXISTS `project_manager_app_state` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(64) NOT NULL,
    `value` JSON NOT NULL,
    `updated_at` TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_project_manager_app_state_key` (`key`)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
