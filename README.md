# Welcome to dncash-io
dncash-io is a secure and lightweight cash token service that offers end-to-end-encryption, a tamper-proof token storage and manageable API security. Its set of clean and well-documented APIs allows for fast integration in a single- or multi-customer setup including cash token handling, journalization and clearing.

Each customer that registers with dncash-io typically uses one or more of the following APIs:
1. __Token API__: The Token API provides secure operations invoked by authorized entities such as banking backends or secure personal wallets. A bank may use the Token API to create pre-authorized cash value tokens for registered end-user devices (such as smartphones) on behalf of their customers that can later be redeemed at a cash point or an ATM.
2. __Cash API__: The Cash API is used by secure cash devices such as ATMs and cash registers. It provides methods to verify, lock and confirm cash tokens with the service.
3. __Clearing API__: The Clearing API provides access to account clearing information to be used for settlement processes.

## Development Setup

dncash-io is based on Node.js and Express. It is written in Typescript. It uses a MySQL-compatible database as its main data storage.

### Database - MySQL or compatible

Create a UTF8 database named 'dncashio' with credentials 'dncashio'/'dncashio':

    mysql -uroot [-p]
    mysql> create database dncashio default charset utf8;
    mysql> grant all on dncashio.* to 'dncashio'@'localhost' identified by 'dncashio';
    mysql> exit
    
Initial setup (DDL):
    
    mysql -udncashio -p dncashio < db/scripts/create.sql

### Install / Build

Enter

    npm install
    
to install all dependencies and to compile the Typescript code. To manually build, run

    npm run build

### Test

dncash-io used Mocha and Chai as testing frameworks. Run a complete set of test cases by calling

    npm test

### Start

Start the server using

    npm start

All Swagger API specs and documentation are created on-the-fly on server startup, check that the server is running on

    http://localhost:3000
    
and check the API docs at

    http://localhost:3000/dnapi/docs/
    
### Develop

For development with auto-restart on save (nodemon), start the server using

    npm run develop

### Logging

dncash-io uses Winston for logging. The main server log file is server.log. Check ./util/logging.ts to see how the logging is configured.

### User Interface / Portal App

The frontend for dncash-io can be found in the dnash-io-ui repository. The frontend (an Angular web app) can be statically deployed on any web server and communicates with dncash-io only through a specific frontend REST interface. Therefore, along with the other mentioned public APIs for Token, Cash and Clearing, dncash-io has an internal Admin API defined in ./routes/admin.v1.ts (not part of the public API docs).

## Typical usage, step-by-step

### 1. Register new dncash-io customers (bank, retailers)

Use the portal app to register new customers such as banks or merchants. Use the APIs page in the portal to create new API credentials for the needed APIs. For instance, for a bank, create Token API credentials. For customers that want to integrate cash devices such as ATMs (banks) or cash registers (merchants), create Cash API credentials

### 2. Register token devices (end-user smartphones)

When a pre-authorized token is created by the bank on behalf of a bank customer, the secure access code that is needed to redeem the cash token later is encrypted with the public key of a target device so that the cash token can only be redeemed with physical access to the end-user's smartphone. Therefore, each smartphone needs to create a secure public-private-key-pair and the public key then needs to be registered with dncash-io. The banking backend typically calls the 'register token device' API endpoint once when a bank user agrees to the Terms and Conditions of the cash service in the banking app or when the bank user uses the cash service for the first time.

Using the bank's Token API credentials, the bank sends the device's public key along with a custom reference name (and optional additional data in the info field):

    {
      "pubkey": "-----BEGIN RSA PUBLIC KEY-----↵MIIBCgKCAQEA6gsDEQ6Z188fEKzA1xVoQ.....",
      "refname": "Device reference name",
      "info": {
        "anyKey": "anyValue"
      }
    }

The service responds with a new, unique UUID that is used from then one as the device identification and for creating cash tokens for that device:

    {
      "uuid": "256fb6a1-23c6-41b0-8e59-1824d1342d1f"
    }

### 3. Create cash tokens

When the bank customer requests the creation of a new cashin or cashout cash token in his or her app, the banking backend performs the usual authorization and account pre-checks first and then calls dncash-io to create a new cash token. The returned token’s secure code can only be decrypted on the token device holding the corresponding private key. The token server does not store the unencrypted secure code, so that even a compromised database cannot be used by someone else without physical access to the target device. The request body must at least contain the information about the amount, currency symbol, type and the target device_uuid. Optional fields may hold the validity time, denomination data and a custom reference name or ID.

    {
      "device_uuid": "916eb12e-4e8a-4833-8e78-be40115829e7",
      "amount": 10000,
      "symbol": "EUR",
      "type": "CASHOUT",
      "expires": 1577829600000,
      "refname": "bookref_08154711",
      "info": {
        "denomData": [
          {
            "d": 5000,
            "c": 2
          }
        ],
        "whatever": "Any value"
      }
    }

The response contains a unique token UUID, a secure_code and, optionally, a plain_code. The plain_code (if configured) is not encrypted and can be used in scenarios where the claiming of a ticket involves a barcode or a manual input process.

    {
      "uuid": "256fb6a1-23c6-41b0-8e59-1824d1342d1f",
      "device_uuid": "c716c0ca-fc93-442b-a295-93f62e6e3a1f",
      "secure_code": "encoded string",
      "plain_code": "123456"
      "amount": 10000,
      "symbol": "EUR",
      "type": "CASHOUT",
      "state": "OPEN",
      "info": {
        "denomData": [
          {
            "d": 5000,
            "c": 2
          }
        ],
        "whatever": "Any value"
      }
    }

### 4. Display token in banking App

The returned token should be sent back to the target device app and the app may then display the cash token in one of the following ways:

1. Display the token UUID + the hex encoded decrypted secure_code as a QR code to be scanned by an ATM or cash device.
2. Display the plain_code as a barcode and/or number on the screen to be typed in at a cash point.
3. Display only the token information such as amount and/or ID, creation or expiration date without any barcode or QR code. This can be used in scenarios where the cash device does not scan or receive information from the app. Instead, identification data is scanned or received by the smartphone from the cash device using a trigger code. This can be done via a scannable QR-code on the cash device or via NFC.

### 5. Register cash devices (ATMs, cash registers)

tbd
