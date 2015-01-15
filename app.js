var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var pass = require('pwd');

// Simple session middleware for Express
var session = require('express-session')

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var models  = require('./models');

//=============PASSPORT====================

passport.use(new LocalStrategy(function(username, password, done) {
  models.User.find( { where: {username: username}} )
  .success(function(user){
    if(!user)
      // if the user is not exist
      return done(null, false, {message: "The user is not exist"});
    else
      pass.hash(password, user.salt, function(err, hash){
        if (user.hash == hash) {
          return done(null, user);
        }
      })
  })
  .error(function(err){
  // if command executed with error
    return done(err);
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
      // query the current user from database
  models.User.find(id)
  .success(function(user){
    done(null, user);
  }).error(function(err){
  done(new Error('User ' + id + ' does not exist'));
});
});

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

//===============EXPRESS=================

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.disable('view cache');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(busboy());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))

// passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
  notice = req.session.notice,
  success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (notice) res.locals.notice = notice;
  if (success) res.locals.success = success;

  next();
});

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('Error', {
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('Error', {
    error: err
  });
});

module.exports = app;
