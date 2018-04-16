# Welcome to dncash-io

dncash-io is a secure, lightweight cash token service that offers end-to-end-encryption, a tamper-proof token storage and manageable API security. Its set of clean and well-documented APIs allows for fast integration in a multi-customer setup including cash token handling, journalization and clearing.

## Scenario

Each customer that registers with dncash-io may use one of the following APIs:
1. Token API: The Token API provides secure operations invoked by authorized entities such as banking backends or secure personal wallets. A bank may use the Token API to create pre-authorized cash value tokens for registered end-user devices (such as smartphones) on behalf of their customers that can later be redeemed at a cash point or an ATM.
2. Cash API: The Cash API is used by secure cash devices such as ATMs and cash registers. It provides methods for verify, lock and confirm cash tokens with the service.
3. Clearing API: The Clearing API provides access to account clearing information to be used for settlement processes.

## Dev Setup

dncash-io is based on Node.js and Express. It is written in Typescript. It uses a MySQL-compatible database as its main data storage.

### DB - MySQL or compatible

Create a UTF8 database with the name 'dncashio' and 'dncashio'/'dncashio' as credentials:

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
    
### Logging

dncash-io uses Winston for logging. The main server log file is server.log. Check ./util/logging.ts to see how the logging is configured.

## User Interface / Portal App

The frontend for dncash-io can be found in the dnash-io-ui repository. The frontend (an Angular web app) can be statically deployed on any web server and communicates with dncash-io only through a specific frontend REST interface. Therefore, along with the other mentioned public APIs for Token, Cash and Clearing, dncash-io has an internal Admin API defined in ./routes/admin.v1.ts (not part of the public API docs).
