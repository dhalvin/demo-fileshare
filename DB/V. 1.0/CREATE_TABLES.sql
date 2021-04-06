-- V. 1.0
-- Commands used to create the tables for the MySQL database
-- CREATE DATABASE demo_fileshare;

USE demo_fileshare;

CREATE TABLE IF NOT EXISTS Organization (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    dirkey VARCHAR(255) NOT NULL,
    regcode VARCHAR(10),
    regexpire BIGINT,
    -- 0 disabled, 1 enabled
    status TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS User (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    emailverified TINYINT(1) NOT NULL DEFAULT 0,
    password BINARY(60),
    orgid INT UNSIGNED NOT NULL,
    fname VARCHAR(255) NOT NULL,
    lname VARCHAR(255) NOT NULL,
    -- 0 disabled, 1 enabled, 2 unregistered
    status TINYINT NOT NULL DEFAULT 2,
    regdate BIGINT,
    isadmin TINYINT(1) NOT NULL DEFAULT 0,
    issuperadmin TINYINT(1) NOT NULL DEFAULT 0,
    loginattempts TINYINT NOT NULL DEFAULT 0,
    lastlogin INT UNSIGNED,
    PRIMARY KEY (id),
    FOREIGN KEY (orgid) REFERENCES Organization(id),
    UNIQUE KEY unique_email (email)
    -- Must wait for Login Table creation:
    -- FOREIGN KEY (lastlogin) REFERENCES Login(id)
);

CREATE TABLE IF NOT EXISTS Login (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    userid INT UNSIGNED NOT NULL,
    attempttime BIGINT NOT NULL,
    -- 0 = FAIL, 1 = SUCCESS
    status TINYINT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (userid) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS DeletedUser (
    -- id taken from user table
    id INT UNSIGNED NOT NULL,
    email VARCHAR(254) NOT NULL,
    orgid INT UNSIGNED NOT NULL,
    fname VARCHAR(255) NOT NULL,
    lname VARCHAR(255) NOT NULL,
    regdate BIGINT,
    deletedate BIGINT,
    PRIMARY KEY (id),
    FOREIGN KEY (orgid) REFERENCES Organization(id)
);

ALTER TABLE User
ADD FOREIGN KEY (lastlogin) REFERENCES Login(id);
INSERT INTO Organization (name, dirkey) VALUES ("Demo Client Organization", "Demo Client Organization");
INSERT INTO Organization (name, dirkey) VALUES ("Demo Organization_1", "Demo Organization_1");
INSERT INTO User (fname, lname, email, orgid, status, isadmin, issuperadmin) VALUES ("Demo", "Super Admin", "superadmin@files.davidhorning.tech", 1, 1, 1, 1);
INSERT INTO User (fname, lname, email, orgid, status, isadmin) VALUES ("Demo", "Admin", "admin@files.davidhorning.tech", 1, 1, 1);
INSERT INTO User (fname, lname, email, orgid, status) VALUES ("Demo", "User", "user@files.davidhorning.tech", 1, 1);
INSERT INTO User (fname, lname, email, orgid, status) VALUES ("Demo", "Invited_User", "invited_user@files.davidhorning.tech", 1, 2);
INSERT INTO User (fname, lname, email, orgid, status, isadmin) VALUES ("Demo", "Admin_1", "admin_1@files.davidhorning.tech", 2, 1, 1);
INSERT INTO User (fname, lname, email, orgid, status) VALUES ("Demo", "User_1", "user_1@files.davidhorning.tech", 2, 1);
INSERT INTO User (fname, lname, email, orgid, status) VALUES ("Demo", "Invited_User_1", "invited_user@files.davidhorning.tech", 2, 2);