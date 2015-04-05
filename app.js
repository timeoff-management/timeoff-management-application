
var express      = require('express');
var path         = require('path');
var favicon      = require('serve-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');

var app = express();

// View engine setup
var handlebars = require('express-handlebars')
    .create({
        defaultLayout : 'main',
        extname       : '.hbs',
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



// Setup authentication mechanism
var passport = require('./lib/passport')();

app.use(require('express-session')({
    secret            : 'my dirty secret ;khjsdkjahsdajhasdam,nnsnad,',
    resave            : false,
    saveUninitialized : false
}));
app.use(passport.initialize());
app.use(passport.session());

var dashboard_routes = require('./lib/route/dashboard.js');


// Custom middlewares
//
// Make sure session object is available in templates
app.use(function(req,res,next){
    res.locals.session = req.session;

    next();
});

// Move flash object out of session and place it in to locals
// so template is aware of it
app.use(function(req, res, next){
    res.locals.flash = req.session.flash;
    delete req.session.flash;

    var install_flash_array = function(key) {

        return function(error_message){
            if ( ! this._flash  ) {
                this._flash = {};
            } 
            if ( ! this._flash[key] ) {
                this._flash[key] = [];
            }

            if (Array.isArray(error_message)) {
                this._flash[key].concat( error_message );
            } else {
                this._flash[key].push( error_message );
            }
        };
    };

//    req.session.flash_error = install_flash_array('errors'); 
//    req.session.flash_error = install_flash_array('messages'); 

    next();
});


// Here will be publicly accessible routes


// All rotes bellow are only for authenticated users
app.use(
    '/',
    require('./lib/route/index'),
    require('./lib/route/login')(passport)
);
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
