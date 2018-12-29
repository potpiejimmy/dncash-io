# Welcome to dncash-io
dncash-io is a secure and lightweight value token service that offers end-to-end-encryption, a tamper-proof token storage and manageable API security. Its set of clean and well-documented APIs allows for fast integration in a single- or multi-customer setup including cash token handling, journalization and clearing.

## Live Demo

Go to https://dncash.dn-sol.net, use dncash/nixdorf as landing page credentials.

## Development Setup

dncash-io is based on Node.js and Express. It is written in Typescript. It uses a MySQL-compatible database as its main data storage.

### Database - MySQL 5.7.8 or later, MySQL 8 recommended

Create a UTF8 database named 'dncashio' with credentials 'dncashio'/'dncashio':

    mysql -uroot [-p]
    mysql> create database dncashio default charset utf8;
    mysql> create user 'dncashio'@'localhost' identified with mysql_native_password by 'dncashio';
    mysql> grant all on dncashio.* to 'dncashio'@'localhost';
    mysql> exit
    
Initial DB setup (DDL):
    
    mysql -udncashio -p dncashio < db/scripts/create.sql

Alternatively, execute

    npm run createDB

to drop and recreate all database tables (make sure the mysql executable is in your PATH). This will also execute populate.sql which creates an admin user admin@dncash.io with the initial password admin123.

### Redis (optional)

Redis is used to support trigger and websocket notifications in a load-balancing environment with multiple server instances. It is also used to support atomic single executions of scheduled jobs in the cluster. In a single instance or development environment, installation of Redis is optional. Set the environment variable USE\_REDIS=true if you want to enable cluster support. Optionally set the variable REDIS\_URL=redis://host:port if Redis is not running locally.

### MQTT (optional)

In scenarios where the cash device is triggered by the token device (scanning / receiving of trigger codes by the token device), dncash.io can optionally publish a message to a given MQTT queue endpoint instead of only responding to a waiting GET request on the trigger endpoint /dnapi/cash/v1/trigger/{triggercode}. Set the environment variable USE\_MQTT=true if you want to enable MQTT. Also set MQTT\_URL to a valid broker endpoint address (defaults to mqtt://localhost:1883, the endpoint is checked on startup). dncash.io will then publish the token to the topic named 'dncash-io/trigger/v1/{triggercode}'.

To test MQTT locally, you can install 'mosca' as a broker and 'mqtt' as a client globally ('npm i -g mosca mqtt'). Then start the mosca server with 'mosca -v', connect a test client with 'mqtt sub -t dncash-io/trigger/v1/+ -v' and run the test suite ('npm t'). You should receive the MQTT triggered token with a server signature.

### Install / Build

Enter

    npm install
    
to install all dependencies and to compile the Typescript code. To manually build, run

    npm run build

### Test

dncash-io uses Mocha and Chai as testing frameworks. Run a complete set of test cases by calling

    npm test

Note that running the tests will erase all data in the database before the tests are executed.

### Start

Start the server using

    npm start

All Swagger API specs and documentation are created on-the-fly on server startup, check that the server is running on

    http://localhost:3000
    
and check the API docs at

    http://localhost:3000/dnapi/docs/
    
### Develop

For development with auto-restart on save (using nodemon), start the server using

    npm run develop

### Logging

dncash-io uses Winston for logging. The main server log file is server.log. Check ./util/logging.ts to see how the logging is configured.

### DevOps / Deploy on AWS

To deploy to an Elastic Beanstalk instance from the command line, install the AWS EB CLI. Create an IAM user for API access credentials on AWS. Type "eb init" to set up your API credentials. Create a Node.js environment in EB with the name "dncash-io-dev" and an "application load balancer (ALB)" via

    eb create dncash-io-dev --elb-type application

This will create a load-balanced auto-scaling EB environment for Node.js. The ALB is needed for websockets and SSL support. Increase the load balancer's Idle Timeout attribute to a higher value to avoid closing websockets every 60 seconds (you can do that in the AWS web console).

In AWS RDS, create a new database (recommended: mysql 8) with parameter sql_mode=STRICT_TRANS_TABLES (create a new parameter group for that first), then open the security group's inbound rule temporarily to execute the database setup remotely. To run the mysql commands given above against the remote DB, add "-h hostname" to the mysql commands:

    mysql -h aws-rds-endpoint-host ...

Set the DB_HOST environment property in the EB environment configuration to point to the database endpoint.

For SSL, set up a Route 53 domain name and request a wildcard certificate in Certificate Manager. Connect the Hosted Zone to the EB's load balancer via an Alias entry in the Hosted Zone. Next, setup an HTTPS listener on the load balancer using the certificate.

For notification support with multiple instances, set up a simple single Redis engine (e.g t2, micro) in ElastiCache. Then add an Inbound rule to the Redis cluster security group to allow TCP 6379 from the EB's security group. Set the following environment properties in EB:

    USE_REDIS=true
    REDIS_URL=redis://<elasticache-endpoint-host>:6379

For deployment from the console, simply run:

    npm run deploy

Important note about websockets support: As of the time of this writing, the default Nginx configuration in EB is not configured for websockets. Thus, the commands in file .ebextensions/enable-websocket.config modify the Nginx configuration to enable HTTP Upgrade for websockets (and increases the socket idle timeout to 3600s). This configuration, however, is performed during deployment. If you modify the EB configuration in the Web console, this modified configuration may be lost and websocket connections will report HTTP 500. Re-deploy to fix.

### Production settings

For production, make sure to set at least the following environment properties:

    NODE_ENV=production
    DB_HOST=<database host name>
    DB_PASSWORD=<database password>
    JWT_SECRET=<a JWT server secret>

For MQTT and/or Redis, set:

    USE_MQTT=true
    MQTT_URL=<mqtt broker URL>
    MQTT_PASSWORD=<broker password>
    MQTT_SIGNATURE_KEY=<a private key PEM, use '\n' between lines>
    USE_REDIS=true
    REDIS_URL=<redis host URL>

Optionally, set:

    MAX_HISTORY_DAYS=<number of history days>
    JWT_VALID_HOURS=<number of hours>
    DB_POOL_SIZE=<number of connections>

### User Interface / Portal App

The frontend for dncash-io can be found in the dnash-io-ui repository. The frontend (an Angular web app) can be statically deployed on any web server and communicates with dncash-io only through a specific frontend REST interface. Therefore, along with the other mentioned public APIs for Token, Cash and Clearing, dncash-io has an internal Admin API defined in ./routes/admin.v1.ts (not part of the public API docs).

### How To

Read the [How To](./HOWTO.md) document to learn more about the typical usage of dncash.io
