var express = require('express');
var passport = require('passport');
var models  = require('../models');
var pass = require('pwd');
var fs = require('fs');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Tablica Ogloszen', user: req.user});
});

/* GET register page. */
router.get('/register', function(req, res) {
  res.render('register', { title: 'Register new user' });
});

router.post('/register', registerPost);
function registerPost(req, res){
  if(req.user){
    // already logged in
    res.redirect('/');
  } else {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var verification = req.body.verification;

    var error = null;

    var EMAIL_REGEXP = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;

    if (!username || !email || !password || !verification) {
      error = 'All fields are required';
    } else if (username !== encodeURIComponent(username)) {
      error = 'Username may not contain any non-url-safe characters';
    } else if (!email.match(EMAIL_REGEXP)) {
      error = 'Email is invalid';
    } else if (password !== verification) {
      error = 'Passwords don\'t match';
    }

    if (error) {
      res.status(403);
      res.render('register', {
        error: error
      });
      return
    }

    pass.hash(password, function(err, salt, hash){
      var user = models.User.build({
        username: username,
        salt: salt,
        hash: hash,
        email: email
      })

      user
      .save()
      .complete(function(err) {
        if (!!err) {
          console.log('The instance has not been saved:', err)
        } else {
          console.log('We have a persisted instance now')
        }
      })
    })

    res.redirect('/');
  }
}

router.post('/register/check/username', function(req, res) {
  var username = req.body.username;
  // check if username contains non-url-safe characters
  if (username !== encodeURIComponent(username)) {
    res.json(403, {
      invalidChars: true
    });
    return;
  }

  // check if username is already taken
  return models.User.find( { where: {username: username}} )
  .success(function(user) {
    if (!user) {
      console.log('No user with the username ' + username + ' has been found.')
      return res.send(200);
    } else {
      console.log('User with the username ' + username + ' exist.')
      return res.json(403, {
        isTaken: true
      });
    }
  })
});

router.post('/register/check/email', function(req, res) {
  var email = req.body.email;
  // check if email is already taken
  return models.User.find( { where: {email: email}} )
  .success(function(user) {
    if (!user) {
      console.log('No user with the email ' + email + ' has been found.')
      return res.send(200);
    } else {
      console.log('User with the email ' + email + ' exist.')
      return res.json(403, {
        isTaken: true
      });
    }
  })
});

router.get('/login', loginGet);
function loginGet(req, res){
  if(req.user){
    // already logged in
    res.redirect('/');
  } else {
    // not logged in, show the login form, remember to pass the message
    // for displaying when error happens
    res.render('login', { title: 'Login', message: req.session.messages });
    // and then remember to clear the message
    req.session.messages = null;
  }
}

router.post('/login', loginPost);
function loginPost(req, res, next) {
  // ask passport to authenticate
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      // if error happens
      return next(err);
    }

    if (!user) {
      // if authentication fail, get the error message that we set
      // from previous (info.message) step, assign it into to
      // req.session and redirect to the login page again to display
      req.session.messages = info.message;
      return res.redirect('/login');
    }

    // if everything's OK
    req.logIn(user, function(err) {
      if (err) {
        req.session.messages = "Error";
        return next(err);
      }

      // set the message
      req.session.messages = "Login successfully";
      return res.redirect('/');
    });

  })(req, res, next);
}

router.get('/logout', logout);
function logout(req, res){

  if(req.isAuthenticated()){
    var name = req.user.username;
    console.log("LOGGIN OUT " + name)
    req.logout();
    req.session.notice = "You have successfully been logged out " + name + "!";
  }

  res.redirect('/');
}

router.get('/new-ad', function(req, res) {
  res.render('new-ad', {title: 'Nowe Ogloszenie', user: req.user });
});

router.post('/new-ad', newAdPost);
function newAdPost(req, res, next) {
  var fstream;
  req.pipe(req.busboy);
  req.busboy.on('file', function (fieldname, file, filename) {
    if(fieldname == 'imgmain')
    {
      console.log("Uploading: " + filename);
      fstream = fs.createWriteStream(__dirname + '/uploads/' + filename);
      file.pipe(fstream);
      fstream.on('close', function () {
        res.redirect('/');
      });
    }
  });
}

module.exports = router;
