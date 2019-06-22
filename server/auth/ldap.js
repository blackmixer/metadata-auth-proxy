/**
 * ### Провайдер авторизации ldap
 *
 * @module ldap
 *
 * Created by Evgeniy Malyarov on 21.06.2019.
 */

const passport = require('passport');
const LdapStrategy = require('passport-ldapauth');
const {ldap} = require('../../config/auth.settings');


passport.use(new LdapStrategy(
  {server: ldap.server},
  function(profile, done) {
    // asynchronous verification, for effect...
    return done(null, profile);
  }
));

module.exports = function (req, res) {
  return new Promise((resolve, reject) => {
    req.query.username = this.username;
    req.query.password = this.password;
    passport.authenticate('ldapauth', {session: false}, (err, user, info) => {
      if(err) {
        reject(err);
      }
      if(!user) {
        reject(new TypeError(info.message));
      }
      resolve(user.dn);
    })(req, res);
  });
}