-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL,ALLOW_INVALID_DATES';

-- -----------------------------------------------------
-- Schema dncashio
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Table `customer`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'auto-generated ID',
  `created` TIMESTAMP(3) NOT NULL DEFAULT NOW(3) COMMENT 'time of creation',
  `email` VARCHAR(128) NOT NULL COMMENT 'email address, used as log-on name',
  `password` VARCHAR(128) NOT NULL COMMENT 'hex-encoded SHA256 password hash',
  `display_name` VARCHAR(128) NULL COMMENT 'optional display name / full name',
  `roles` VARCHAR(255) NOT NULL DEFAULT 'user' COMMENT 'comma-separated list of role names',
  `twofasecret` VARCHAR(32) NULL COMMENT 'if this 2FA secret code is set, 2FA is enabled',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT 'customer status, 0 = password change required, 1 = ok',
  `info` JSON NULL COMMENT 'additional info data, JSON encoded',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE)
ENGINE = InnoDB
COMMENT = 'holds all customers';


-- -----------------------------------------------------
-- Table `customer_access`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_access` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'auto-generated ID',
  `customer_id` INT NOT NULL COMMENT 'the customer this API access belongs to',
  `created` TIMESTAMP(3) NOT NULL DEFAULT NOW(3) COMMENT 'time of creation',
  `scope` VARCHAR(45) NOT NULL COMMENT 'API scope, for instance api-token or api-cash',
  `apikey` VARCHAR(64) NOT NULL COMMENT 'API key random code',
  `apisecret` VARCHAR(64) NOT NULL COMMENT 'API secret random code',
  `refname` VARCHAR(36) NULL COMMENT 'a custom reference name, currently not used',
  `info` JSON NULL COMMENT 'additional info data, JSON encoded',
  PRIMARY KEY (`id`),
  INDEX `fk_customer_access_customer_idx` (`customer_id` ASC) VISIBLE,
  UNIQUE INDEX `apikey_UNIQUE` (`apikey` ASC) VISIBLE,
  CONSTRAINT `fk_customer_access_customer`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
COMMENT = 'holds all API access credentials for customers';


-- -----------------------------------------------------
-- Table `customer_device`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_device` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'auto-generated ID',
  `customer_id` INT NOT NULL COMMENT 'the customer this device belongs to',
  `uuid` VARCHAR(36) NOT NULL COMMENT 'the device’s UUID',
  `created` TIMESTAMP(3) NOT NULL DEFAULT NOW(3) COMMENT 'time of device registration',
  `type` ENUM('MOBILE', 'ATM', 'CASH_REGISTER', 'OTHER') NOT NULL DEFAULT 'MOBILE' COMMENT 'device type',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT 'device status value, reserved for future use',
  `pubkey` VARCHAR(1024) NULL COMMENT 'the device’s public key, usually only set for token devices (smartphones), PEM-encoded RSA public key',
  `algorithm` VARCHAR(45) NULL COMMENT 'public key algorithm, currently not used',
  `lat` DECIMAL(10,8) NULL COMMENT 'geo coordinates latitude',
  `lon` DECIMAL(11,8) NULL COMMENT 'geo coordinates longitude',
  `refname` VARCHAR(36) NULL COMMENT 'customer device reference name, set by the customer during registration',
  `info` JSON NULL COMMENT 'additional custom data, JSON-encoded',
  PRIMARY KEY (`id`),
  INDEX `fk_customer_device_customer1_idx` (`customer_id` ASC) VISIBLE,
  UNIQUE INDEX `uuid_UNIQUE` (`uuid` ASC) VISIBLE,
  CONSTRAINT `fk_customer_device_customer1`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
COMMENT = 'holds all customer devices, such as end-user smartphones (token devices) for banks and cash devices for banks and retail stores';


-- -----------------------------------------------------
-- Table `token`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `token` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'auto-generated ID',
  `owner_id` INT NOT NULL COMMENT 'the token’s owner is the customer that created the token',
  `owner_device_id` INT NOT NULL COMMENT 'the customer device that the token was created for - the secure_code of the token will be encrypted using that device’s public key',
  `lock_device_id` INT NULL COMMENT 'the cash device that locked the token. this field will be set as soon as a token is claimed by a cash device and will not change from then on.',
  `uuid` VARCHAR(36) NOT NULL COMMENT 'the unique token UUID used for all-time token identification',
  `created` TIMESTAMP(3) NOT NULL DEFAULT NOW(3) COMMENT 'time of creation',
  `updated` TIMESTAMP(3) NULL COMMENT 'timestamp of last token update',
  `type` ENUM('CASHOUT', 'CASHIN', 'TRANSFER', 'PAYMENT', 'OTHER') NOT NULL DEFAULT 'CASHOUT' COMMENT 'token type',
  `code_type` TINYINT NOT NULL DEFAULT 0 COMMENT 'type of code, currently always 0, not used.',
  `plain_code` VARCHAR(32) NULL COMMENT 'the optional system-wide unique plain code (used as short identification codes). will only be set if USE_PLAIN_CODES is configured and only during the OPEN phase of a token, otherwise this field is NULL.',
  `secure_code` VARCHAR(1024) NOT NULL COMMENT 'random data encoded with the owner device’s public key, Base64-encoded',
  `amount` INT NOT NULL COMMENT 'the amount in whole integer units, e.g. cents.',
  `symbol` VARCHAR(5) NOT NULL COMMENT 'the currency symbol, e.g. EUR',
  `state` ENUM('OPEN', 'DELETED', 'LOCKED', 'COMPLETED', 'FAILED', 'EXPIRED', 'CLEARED', 'CANCELED', 'REJECTED', 'RETRACTED') NOT NULL DEFAULT 'OPEN' COMMENT 'the token state',
  `clearstate` TINYINT NOT NULL DEFAULT 0 COMMENT 'a custom token clearing state, may be updated by the token owner through the Token API',
  `expires` TIMESTAMP(3) NULL COMMENT 'optional time of expiration',
  `refname` VARCHAR(36) NULL COMMENT 'a custom reference name, usually set by the token owner on creation to hold a custom booking or transaction reference',
  `lockrefname` VARCHAR(36) NULL COMMENT 'a custom reference name set by the locking device (the cash device) on token confirmation, usually used to hold a cash-side transaction reference',
  `info` JSON NULL COMMENT 'custom additional data, JSON-encoded. also holds the optional denomination data. managed by token creator/owner.',
  `processing_info` JSON NULL COMMENT 'custom additional processing data, JSON-encoded. may be updated by server processes and by the cash processing side.',
  PRIMARY KEY (`id`),
  INDEX `fk_token_customer1_idx` (`owner_id` ASC) VISIBLE,
  INDEX `fk_token_customer_device1_idx` (`owner_device_id` ASC) VISIBLE,
  UNIQUE INDEX `plain_code_UNIQUE` (`plain_code` ASC) VISIBLE,
  UNIQUE INDEX `uuid_UNIQUE` (`uuid` ASC) VISIBLE,
  INDEX `fk_token_customer_device2_idx` (`lock_device_id` ASC) VISIBLE,
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
ENGINE = InnoDB
COMMENT = 'the central cash token table';


-- -----------------------------------------------------
-- Table `journal`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `journal` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'auto-generated ID',
  `customer_id` INT NOT NULL COMMENT 'the customer the action is associated with',
  `created` TIMESTAMP(3) NOT NULL DEFAULT NOW(3) COMMENT 'time of creation',
  `entity` VARCHAR(45) NOT NULL COMMENT 'the entity this journal entry is referring to, e.g. token',
  `action` VARCHAR(45) NOT NULL COMMENT 'action type identifier',
  `data` JSON NULL COMMENT 'JSON-encoded journal data',
  PRIMARY KEY (`id`),
  INDEX `fk_journal_customer1_idx` (`customer_id` ASC) VISIBLE,
  CONSTRAINT `fk_journal_customer1`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
COMMENT = 'system journal';


-- -----------------------------------------------------
-- Table `customer_param`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_param` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'auto-generated ID',
  `customer_id` INT NOT NULL COMMENT 'the customer this param belongs to',
  `pkey` VARCHAR(45) NOT NULL COMMENT 'parameter key',
  `pvalue` JSON NULL COMMENT 'parameter value',
  `updated` TIMESTAMP(3) NOT NULL DEFAULT NOW(3) COMMENT 'timestamp of last update or creation',
  PRIMARY KEY (`id`),
  INDEX `fk_customer_param_customer1_idx` (`customer_id` ASC) VISIBLE,
  UNIQUE INDEX `pkey_customer_UNIQUE` (`customer_id` ASC, `pkey` ASC) VISIBLE,
  CONSTRAINT `fk_customer_param_customer1`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
COMMENT = 'holds customer specific parameters';


-- -----------------------------------------------------
-- Table `clearing`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clearing` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'auto-generated ID',
  `token_id` INT NOT NULL COMMENT 'the token this clearing is for',
  `debitor_id` INT NOT NULL COMMENT 'the debitor, i.e. the customer that owes to the creditor customer',
  `creditor_id` INT NOT NULL COMMENT 'the creditor customer',
  `debitor_account` JSON NULL COMMENT 'debitor account information, arbitrary\nJSON data',
  `creditor_account` JSON NULL COMMENT 'creditor account information, arbitrary\nJSON data',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT 'clearing status, updatable through clearing API',
  `created` TIMESTAMP(3) NOT NULL DEFAULT NOW(3) COMMENT 'time of creation (token completion)',
  `updated` TIMESTAMP(3) NULL COMMENT 'time of last modification',
  PRIMARY KEY (`id`),
  INDEX `fk_clearing_token1_idx` (`token_id` ASC) VISIBLE,
  INDEX `fk_clearing_customer1_idx` (`debitor_id` ASC) VISIBLE,
  INDEX `fk_clearing_customer2_idx` (`creditor_id` ASC) VISIBLE,
  UNIQUE INDEX `token_id_UNIQUE` (`token_id` ASC) VISIBLE,
  CONSTRAINT `fk_clearing_token1`
    FOREIGN KEY (`token_id`)
    REFERENCES `token` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_clearing_customer1`
    FOREIGN KEY (`debitor_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_clearing_customer2`
    FOREIGN KEY (`creditor_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
COMMENT = 'holds clearing data for completed tokens that need to be settled';


-- -----------------------------------------------------
-- Table `customer_account`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_account` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT 'auto-generated ID',
  `customer_id` INT NOT NULL,
  `value` VARCHAR(80) NOT NULL COMMENT 'the account\'s address (Walletaddress or IBAN)',
  `type` ENUM('BANKACCOUNT', 'CREDITCARD', 'CRYPTOWALLET') NOT NULL DEFAULT 'BANKACCOUNT' COMMENT 'the account\'s type (Bankaccount, Creditcard or Cryptowallet)',
  `default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'determines if the account is the default account for clearing',
  `symbol` VARCHAR(40) NULL COMMENT 'the account\'s symbol, e.g. EUR, USD, XRP, BTC, mastercard, visa',
  `refname` VARCHAR(80) NULL COMMENT 'a custom reference name set by the user',
  PRIMARY KEY (`id`),
  INDEX `fk_customer_account_customer1_idx` (`customer_id` ASC) VISIBLE,
  CONSTRAINT `fk_customer_account_customer1`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customer` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
