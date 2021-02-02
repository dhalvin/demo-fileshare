const logger = require('../logger');
const mysql = require('../db-config');
const auth = require('../authentication');
const validator = require('express-validator');
const nodemail = require('../email-config');
const jwt = require('jsonwebtoken');

module.exports = {
  renderPartial: async function (view, options, res, req) {
    return new Promise(function (resolve, reject) {
      options.layout = false;
      res.render(view, options, function (error, html) {
        if (error) {
          reject();
          throw error;
        }
        else {
          resolve(html);
        }
      });
    });
  },

  sendConfirmation: function (id, email, fname, lname, regdate, success, res, req) {
    jwt.sign({ data: id }, email + '-' + regdate, function (sign_error, token) {
      if (sign_error) throw sign_error;
      nodemail.sendMail(res, 'email_confirm', { title: 'Confirm your email', subject: 'Confirm your email', user: { fname: fname, lname: lname, email: email }, token: 'https://files.hanessassociates.com/confirm/' + token }, email);
      req.session.successalert = { strong: 'Success!', msg: success };
      res.redirect('/login');
    });
  },

  sendInvite: function (template, options, res, callback) {
    jwt.sign({ data: options.id, exp: Math.floor(options.regexpire / 1000) }, options.email + '-' + options.regcode + '-2', function (sign_error, token) {
      if (sign_error) throw sign_error;
      nodemail.sendMail(res, template, { title: 'Register Your Account', subject: 'Register Your Account', invite: { org: options.org, email: options.email, sender: options.sender }, user: { org: options.org }, token: 'https://files.hanessassociates.com/invite/' + token }, options.email);
      callback();
    });
  },

  /*Save user input to session so forms can be repopulated in the event of an error*/
  captureUserInput: function (req, res, next) {
    var fields = {};
    for (field in req.body) {
      fields[field] = req.body[field];
    }
    if (req.session.fields) {
      Object.assign(req.session.fields, fields);
    }
    else {
      req.session.fields = fields;
    }
    next();
  },

  collectValidationErrors: function (redirect, options = {}) {
    return function (req, res, next) {
      const errors = validator.validationResult(req);
      if (!errors.isEmpty()) {
        if (!redirect) {
          res.json({ data: null, errors: errors.array() });
        }
        else {
          req.session.errors = JSON.stringify(errors.array());
          res.redirect(redirect + (options.param ? '/' + req.params[options.param] : ''));
        }
      }
      else {
        next();
      }
    }
  },

  //email location example: 'body' 'org_email'
  checkEmailNotUsedAjax: function (varLoc = 'body', varName = 'email') {
    return function (req, res, next) {
      try {
        mysql.query('SELECT email, status FROM User WHERE email = ?', [req[varLoc][varName]],
          function (error, results, fields) {
            if (!error) {
              if (results.length > 0) {
                return res.json({ data: null, errors: [{ msg: "There is already an account registered with that email address." }] });
              }
              else {
                return next();
              }
            }
            else {
              logger.error(error);
              return res.json({ data: null, errors: [{ msg: "Something went wrong." }] });
            }
          });
      } catch { }
    }
  },

  //email location example: 'body' 'org_email'
  checkOrgNotUsedAjax: function (varLoc = 'body', varName = 'name') {
    return function (req, res, next) {
      try {
        mysql.query('SELECT name, status FROM Organization WHERE name = ?', [req[varLoc][varName]],
          function (error, results, fields) {
            if (!error) {
              if (results.length > 0) {
                return res.json({ data: null, errors: [{ msg: "There is already an organization registered with that name." }] });
              }
              else {
                return next();
              }
            }
            else {
              logger.error(error);
              return res.json({ data: null, errors: [{ msg: "Something went wrong." }] });
            }
          });
      } catch { }
    }
  },

  checkEmailNotUsed: function (req, res, next) {
    try {
      mysql.query('SELECT email, status FROM User WHERE email = ?', [req.body.email],
        function (error, results, fields) {
          if (!error) {
            if (results.length > 0) {
              if (results[0].status == 2) {
                res.locals.invite = true;
                return next();
              }
              else {
                req.session.messages = ["There is already an account registered with that email address."];
                return res.redirect('/register');
              }
            }
            else {
              return next();
            }
          }
          else {
            logger.error(error);
            req.session.messages = ["Something went wrong, please try again."];
            res.redirect('/register');
          }
        });
    } catch { }
  },

  gatherSessionVariables: function (responseObject, req) {
    if ('messages' in req.session) {
      responseObject.messages = req.session.messages;
      delete req.session.messages;
    }
    if ('errors' in req.session) {
      responseObject.errors = JSON.parse(req.session.errors);
      delete req.session.errors;
    }
    if ('fields' in req.session) {
      Object.assign(responseObject, req.session.fields);
      delete req.session.fields;
    }
    if ('successalert' in req.session) {
      responseObject.successalert = req.session.successalert;
      delete req.session.successalert;
    }
  },

  validateFieldMatch: function (otherField, msg) {
    return function (value, { req }) {
      if (value !== req.body[otherField]) {
        throw new Error(msg);
      }
      return true;
    };
  },

  //Secret sauce [{source: user, value: regdate}]
  verifyToken: function (redirect, secretSauce) {
    return async function (req, res, next) {
      try {
        var token = req.params.token;
        var decodedId = jwt.decode(token).data;
        var verifData = {};
        verifData.user = await auth.getUserFromId(decodedId);
        verifData.org = await auth.getOrgFromId(verifData.user.orgid);
        res.locals.user = verifData.user;
        res.locals.org = verifData.org;
        var secrets = [];
        for (piece of secretSauce) {
          secrets.push(verifData[piece.source][piece.value]);
        }
        jwt.verify(token, secrets.join('-'), function (error, decoded) {
          if (!error) {
            return next();
          }
          else {
            req.session.messages = ['Bad URL. Something is wrong.']
            res.redirect(redirect);
          }
        });
      } catch (err) {
        logger.error(err);
        req.session.messages = ['Bad URL. Something is wrong.']
        res.redirect(redirect);
      }
    }
  }
};