const express = require('express');
const logger = require('../logger');
const mysql = require('../db-config');
const auth = require('../authentication');
const router = express.Router();
const validator = require('express-validator');
const rUtil = require('./routingUtil');

const orgdesc = {
  "Demo Client Organization": "The Client Organization is the owner of the file share portal. The purpose of the file share system is to exchange data with this main organization. Only the Client Organization can have Super Admin users.",
  "Demo Organization_1": "This organization is managed by someone who wants to share files with the Client Organization."
}

const userdesc = {
  "Super Admin": "This role can create and manage organizations",
  "Admin": "This role can create and manage users within their organization",
  "User": "This role cannot manage users or organizations. They have normal access to files within their organization.",
}
userdesc.Admin_1 = userdesc["Admin"];
userdesc.User_1 = userdesc["User"];
const democolors = ['#007bff', '#6610f2', '#dc3545'];

/* User Select Page */
router.get('/select', auth.forceNotAuthenticated, function (req, res, next) {
  const response = { title: 'User Select', styles: ['demo_select'], scripts: ['animations'] };
  response.demousers = {};
  response.organizations = [];
  rUtil.gatherSessionVariables(response, req);
  mysql.query('SELECT User.id as id, fname, lname, email, orgid, User.status, Organization.name as orgname FROM User LEFT JOIN Organization on User.orgid=Organization.id WHERE User.status <> 2', [],
  function (error, results, fields) {
    if(error) throw error;
    var color = 0;
    for( user of results ){
      if(!response.demousers[user.orgname]){
        response.demousers[user.orgname] = [];
        response.organizations.push(user.orgname);
      }
      response.demousers[user.orgname].push({
        role: user.lname,
        organization: user.orgname,
        email: user.email,
        description: userdesc[user.lname],
        orgdesc: orgdesc[user.orgname],
        icon: '<svg class="usericon" height="100" width="100"><circle cx="50" cy="50" r="50" fill="'+democolors[color]+'"/><text x="50" y="75" text-anchor="middle" stroke="white" fill="white" font-size="4em">'+user.lname[0]+'</text></svg>'
      });
      color = (color + 1) % democolors.length;
    }
    res.render('demo_select', response);
  });
});

router.post('/login',
  auth.checkNotAuthenticated,
  rUtil.captureUserInput,
  validator.check('email', 'Please enter a valid email address').isEmail().normalizeEmail(),
  rUtil.collectValidationErrors('/select'),
  auth.authenticate()
);
module.exports = router;
