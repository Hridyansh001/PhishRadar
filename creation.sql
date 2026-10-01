CREATE TABLE users
(
    userid INTEGER PRIMARY KEY AUTO_INCREMENT,
    uname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    upassword VARCHAR(255) NOT NULL,
    ustatus VARCHAR(255) DEFAULT 'active',
    createdat DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE website
(
    wid INTEGER PRIMARY KEY AUTO_INCREMENT,
    url VARCHAR(2048) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    ip VARCHAR(255),
    protocol VARCHAR(255),
    firstseen DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastchecked DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE detection
(
    did INTEGER PRIMARY KEY AUTO_INCREMENT,
    userid INT NOT NULL,
    wid INT NOT NULL,
    detectedat DATETIME DEFAULT CURRENT_TIMESTAMP,
    rresult VARCHAR(255),
    mlresult VARCHAR(255),
    fresult VARCHAR(255),
    riskscore DECIMAL(5,2),
    actiontaken VARCHAR(255),

    FOREIGN KEY (userid) REFERENCES users(userid),
    FOREIGN KEY (wid) REFERENCES website(wid)
);


CREATE TABLE mlmodel
(
    mid INT PRIMARY KEY AUTO_INCREMENT,
    mname VARCHAR(255) NOT NULL,
    algo VARCHAR(100) NOT NULL,
    version VARCHAR(50),
    accuracy DECIMAL(5,2),
    status VARCHAR(50)
);


CREATE TABLE threat
(
    tid INT PRIMARY KEY AUTO_INCREMENT,
    wid INT NOT NULL,
    threattype VARCHAR(100) NOT NULL,
    severity VARCHAR(50),
    status VARCHAR(50),
    description TEXT,
    detectedat DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (wid) REFERENCES website(wid)
);