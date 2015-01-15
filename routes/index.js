var express = require('express');
var models  = require('../models');
var sellViewModel  = require('../view_models/sell');
var router = express.Router();

// passport
var passport = require('passport');

// hashing
var pass = require('pwd');

// working with files
var fs = require('fs');

// get app root path
var appRoot = require('app-root-path');

// folder creator
var mkdirp = require('mkdirp');

// for show all files in fir
var walk = require('walk');

// support for enctype="multipart/form-data"
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

/* GET home page. */
router.get('/', function(req, res) {
  models.Category.findAll().then(function(categories) {
    console.log(res.locals.success);
    res.render('index', { title: 'Tablica Ogloszen', user: req.user, categories: categories});
  });
});

router.get('/api/index/', function(req, res) {
  var limit = 8;

  var params = {};

  params.where = [];
  if(req.query.search) {
    params.where.push("title like '%" + req.query.search + "%'");
  }
  if(req.query.onlyFree) {
    params.where.push("price = 'free'");
  }
  if(req.query.categoryId) {
    params.where.push("CategoryId = " + req.query.categoryId);
  }

  if(params.where.length == 0)
  {
    delete params.where;
  }

  params.limit = limit;
  params.offset = req.query.offset;
  params.order = 'id DESC';
  params.include = [models.Category];

  models.Sell.findAll(params)
  .then(function(sells) {
    var sellsViewModel = [];
    for (var i = 0; i < sells.length; ++i) {
      sellsViewModel.push(sellViewModel(sells[i]));
    }

    res.json({sells: sellsViewModel});
  });
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
      req.session.error = info.message;
      return res.redirect('/login');
    }

    // if everything's OK
    req.logIn(user, function(err) {
      if (err) {
        req.session.error = "Error";
        return next(err);
      }
      console.log(user);
      // set the message
      req.session.success = "Zostałes zalogowany jako " + user.username;
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
    req.session.notice = "Pomyślnie zostałeś wylogowany z konta " + name + "!";
  }

  res.redirect('/');
}

router.get('/nowe-ogloszenie', ensureAuthenticated("Aby dodać nowe ogloszenie, musisz być zalogowany!"), function(req, res) {
  models.Category.findAll()
  .success(function(categories) {
    res.render('ad/add', {title: 'Nowe Ogloszenie', user: req.user, categories: categories });
  });
});

router.post('/nowe-ogloszenie', ensureAuthenticated("Aby dodać nowe ogloszenie, musisz być zalogowany!"), multipartMiddleware, newAdPost);
function newAdPost(req, res, next) {
  var price, tonegotiate;
  if(req.body.forfree) {
    price = "free";
    tonegotiate = false;
  }
  else {
    price = req.body.price;
    if(req.body.tonegotiate === "on") {
      tonegotiate = true;
    }
    else {
      tonegotiate = false;
    }
  }

  var sell = models.Sell.build({
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    CategoryId: req.body.category,
    UserId: req.user.id,
    date: new Date(req.body.date),
    price: price,
    tonegotiate: tonegotiate
  })

  sell
  .save()
  .complete(function(err, sell) {
    if (err) {
      console.log('The instance has not been saved:', err)
      req.session.error = "Wystąpił bląd podczas dodawania ogloszenie. Przepraszamy za możliwe niedogodnosci.";

    } else {
      //appRoot determine an app's root path from anywhere inside the app
      var uploadDir = appRoot + '/public/uploads/ad/' + sell.id + '/';
      var uploadMainDir = uploadDir + 'main/'

      // Create needed directory before save images
      mkdirp(uploadDir, function (err) {
        if (err) console.error(err)
      });

      mkdirp(uploadMainDir, function (err) {
        if (err) console.error(err)
      });
      // end

      var fileKeys = Object.keys(req.files);
      fileKeys.forEach(function(key) {
        var file = req.files[key];
        if(file.originalFilename) {
          if(file.fieldName == 'imgmain')
          {
            fs.createReadStream(file.path).pipe(fs.createWriteStream(uploadMainDir + file.originalFilename));
          }
          else
          {
            fs.createReadStream(file.path).pipe(fs.createWriteStream(uploadDir + file.originalFilename));
          }
        }
      });

      req.session.success = "Twoje ogloszenie zostało dodane.";
    }
    res.redirect('/');
  })
}

router.get('/nowa-kategoria', ensureAuthenticated("Aby dodać nową kategorie, musisz być zalogowany!"), function(req, res) {
  res.render('category/add', {title: "Dodaj nową kategorie", user: req.user });
});

router.post('/nowa-kategoria', ensureAuthenticated("Aby dodać nową kategorie, musisz być zalogowany!"), newCategory);
function newCategory(req, res, next) {
  var category = models.Category.build({
    name: req.body.categoryname
  })

  category
  .save()
  .complete(function(err) {
    if (err) {
      console.log('The instance has not been saved:', err)
      req.session.error = "Wystapil blad podczas dodawania nowej kategorii.";
    }
    req.session.success = "Kateria została pomyslnie dodana.";
    res.redirect('/');
  });
}

router.post('/category/check/name', function(req, res) {
  var categoryname = req.body.categoryname;
  // check if email is already taken
  return models.Category.find( { where: {name: categoryname}} )
  .success(function(category) {
    if (!category) {
      console.log('No category with the name ' + categoryname + ' has been found.');
      return res.send(200);
    } else {
      console.log('Category with name ' + categoryname + ' exist.');
      return res.json(403, {
        isTaken: true
      });
    }
  })
});

router.param('sell_id', function(req, res, next, id){
  models.Sell.find({
    where: {id: id},
    include: [ models.Category ]
  }).complete(function(err, sell) {
    if (err) {
      return next(err);
    }

    req.sell = sellViewModel(sell);
    next();
  });
});

router.get('/sprzedam/:sell_id', function(req, res) {
  res.render('sell/index', { title: req.sell.title, user: req.user, sell: req.sell});
});

function ensureAuthenticated(message) {
  return function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    if(message) {
      req.session.error = message;
    } else {
      req.session.error = 'Aby odwiedzić daną strone musisz się najpierw zalogować!';
    }
    res.redirect('/login');
  };
}

module.exports = router;
