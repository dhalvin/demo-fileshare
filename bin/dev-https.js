const https = require('https');
const fs = require('fs');
const app = require('../app');

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/dev.davidhorning.tech/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/dev.davidhorning.tech/cert.pem')
}

https.createServer(options, app).listen(process.env.PORT || 8080);
