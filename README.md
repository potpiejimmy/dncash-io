# dncash-io
The world's first truely digital and cloud-native cash solution.

## Local Setup

### DB - MySQL 5.7

Create UTF8 database:

    mysql -uroot [-p]
    mysql> create database dncashio default charset utf8;
    mysql> grant all on dncashio.* to 'dncashio'@'localhost' identified by 'dncashio';
    mysql> exit
    
Initial setup (DDL):
    
    mysql -udncashio -p dncashio < db/scripts/create.sql
