
var express      = require('express');
var path         = require('path');
var favicon      = require('serve-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');

var routes = require('./lib/route/index'),
    dashboard_routes = require('./lib/route/dashboard.js');

var app = express();

// view engine setup
var handlebars = require('express-handlebars')
    .create({
        defaultLayout: 'main',
        extname: '.hbs',
    });
app.engine('.hbs', handlebars.engine);
app.set('view engine', '.hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));





var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy(
    function(username, password, done) {
        console.log('>>>> ' + username);
        if (username === 'Pavlo') {
            return done( null, { id : 12, username : 'Pavlo' });
        }
        return done(null, false, { message : 'Incorrect user name!' });
    }
));
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    done(null, { name : "Pavlo", id : 12 });
});


app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());



// Here will be publicly accessible routes

// custom routes
app.get('/login', function(req, res){
    res.render('login');
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
    })
);


// Here will be a call to midleware that authentificate user
//app.use(function(req, res, next){
//    passport.authenticate('local', function(err, user, info) {
//        if (err) { return next(err); }
//        if (!user) {
//            var err = new Error('Not Found');
//            err.status = 404;
//            next(err);
//        }
//        req.logIn(user, function(err) {
//            if (err) { return next(err); }
//            return res.redirect('/');
//        });
//    })(req, res, next);
//});

// All rotes bellow are only for authentificated users
app.use('/', routes);
app.use('/dashboard/', dashboard_routes);


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
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
