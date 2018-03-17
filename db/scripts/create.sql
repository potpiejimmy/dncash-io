SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL,ALLOW_INVALID_DATES';


-- -----------------------------------------------------
-- Table `customer`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created` TIMESTAMP NOT NULL DEFAULT NOW(),
  `email` VARCHAR(128) NOT NULL,
  `password` VARCHAR(128) NOT NULL,
  `display_name` VARCHAR(128) NULL,
  `roles` VARCHAR(255) NOT NULL DEFAULT 'user',
  `status` TINYINT NOT NULL DEFAULT 0,
  `info` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `customer_access`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_access` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `created` TIMESTAMP NOT NULL DEFAULT NOW(),
  `scope` VARCHAR(45) NOT NULL,
  `apikey` VARCHAR(64) NOT NULL,
  `apisecret` VARCHAR(64) NOT NULL,
  `refname` VARCHAR(36) NULL,
  `info` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_customer_access_customer_idx` (`customer_id` ASC),
  UNIQUE INDEX `apikey_UNIQUE` (`apikey` ASC),
  CONSTRAINT `fk_customer_access_customer`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `customer_device`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_device` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `uuid` VARCHAR(36) NOT NULL,
  `created` TIMESTAMP NOT NULL DEFAULT NOW(),
  `type` ENUM('MOBILE', 'ATM', 'CASH_REGISTER', 'OTHER') NOT NULL DEFAULT 'MOBILE',
  `pubkey` VARCHAR(1024) NULL,
  `algorithm` VARCHAR(45) NULL,
  `lat` DECIMAL(10,8) NULL,
  `lon` DECIMAL(11,8) NULL,
  `refname` VARCHAR(36) NULL,
  `info` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_customer_device_customer1_idx` (`customer_id` ASC),
  UNIQUE INDEX `uuid_UNIQUE` (`uuid` ASC),
  CONSTRAINT `fk_customer_device_customer1`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `token`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `token` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `owner_id` INT NOT NULL,
  `owner_device_id` INT NOT NULL,
  `lock_device_id` INT NULL,
  `uuid` VARCHAR(36) NOT NULL,
  `created` TIMESTAMP NOT NULL DEFAULT NOW(),
  `updated` TIMESTAMP NULL,
  `type` ENUM('CASHOUT', 'CASHIN', 'PAYMENT', 'OTHER') NOT NULL DEFAULT 'CASHOUT',
  `code_type` TINYINT NOT NULL DEFAULT 0,
  `plain_code` VARCHAR(32) NULL,
  `secure_code` VARCHAR(1024) NOT NULL,
  `amount` DECIMAL(13,4) NOT NULL,
  `symbol` VARCHAR(5) NOT NULL,
  `state` ENUM('OPEN', 'DELETED', 'LOCKED', 'COMPLETED', 'FAILED', 'EXPIRED', 'CLEARED', 'CANCELED', 'REJECTED', 'RETRACTED') NOT NULL DEFAULT 'OPEN',
  `clearstate` TINYINT NOT NULL DEFAULT 0,
  `expires` TIMESTAMP NULL,
  `refname` VARCHAR(36) NULL,
  `info` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_token_customer1_idx` (`owner_id` ASC),
  INDEX `fk_token_customer_device1_idx` (`owner_device_id` ASC),
  UNIQUE INDEX `plain_code_UNIQUE` (`plain_code` ASC),
  UNIQUE INDEX `uuid_UNIQUE` (`uuid` ASC),
  INDEX `fk_token_customer_device2_idx` (`lock_device_id` ASC),
  CONSTRAINT `fk_token_customer1`
    FOREIGN KEY (`owner_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_token_customer_device1`
    FOREIGN KEY (`owner_device_id`)
    REFERENCES `customer_device` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_token_customer_device2`
    FOREIGN KEY (`lock_device_id`)
    REFERENCES `customer_device` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `journal`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `journal` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `created` TIMESTAMP NOT NULL DEFAULT NOW(),
  `entity` VARCHAR(45) NOT NULL,
  `action` VARCHAR(45) NOT NULL,
  `data` TEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_journal_customer1_idx` (`customer_id` ASC),
  CONSTRAINT `fk_journal_customer1`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
