-- V. 1.0
-- Commands used to create the tables for the MySQL database
-- CREATE DATABASE hasfs;

USE hasfs;

CREATE TABLE User (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    password BINARY(60) NOT NULL,
    orgid INT UNSIGNED NOT NULL,
    fname VARCHAR(255) NOT NULL,
    lname VARCHAR(255) NOT NULL,
    regdate BIGINT NOT NULL,
    isadmin TINYINT(1) NOT NULL DEFAULT 0,
    loginattempts TINYINT,
    lastlogin INT UNSIGNED,
    PRIMARY KEY (id),
    FOREIGN KEY (orgid) REFERENCES Organization(id)
    --Must wait for Login Table creation:
    --FOREIGN KEY (lastlogin) REFERENCES Login(id)
);

CREATE TABLE Organization (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE Login (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userid INT UNSIGNED NOT NULL,
    attempttime BIGINT NOT NULL,
    status TINYINT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (userid) REFERENCES User(id)
);

ALTER TABLE User
ADD FOREIGN KEY (lastlogin) REFERENCES Login(id)