const express = require('express');
const {Strategy: LocalStrategy} = require("passport-local");
const bcrypt = require('bcryptjs');
const passport = require('passport');

const router = express.Router();

let User;
User = require('../models/user')

passport.use(
  new LocalStrategy(async function verify(username,password,cb){
      try{
          const user = await User.findOne({username:username})
          if (user) {
              const storedHashedPassword = user.password;
              bcrypt.compare(password, storedHashedPassword, (err, valid) => {
                if (err) {
                  console.error("Error comparing passwords:", err);
                  return cb(err);
                } else {
                  if (valid) {
                    return cb(null, user);
                  } else {
                    return cb(null, false);
                  }
                }
              });
          } else {
              return cb('User does not exist. Create An Account To Proceed')
          }
      } catch (err){
          console.log(err, null)
      }
  })
)

passport.serializeUser((user, done)=>{
  done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
  try {
      const user = await User.findById(id);
      done(null, user);
  } catch (err) {
      done(err, null);
  }
});

module.exports = router;