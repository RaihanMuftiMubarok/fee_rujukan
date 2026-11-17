var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var flash = require('express-flash');
var session = require('express-session');
const MemoryStore = require('session-memory-store')(session);


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var superusersRouter = require('./routes/superusers');

var perujukRouter = require('./routes/perujuk'); 
var petugasRouter = require('./routes/petugas'); 
var ruangRouter = require('./routes/ruang'); 
var dxRouter = require('./routes/dx'); 
var periodeRouter = require('./routes/periode'); 
var transaksi_fee_rujukanRouter = require('./routes/transaksi_fee_rujukan'); 

var resetRouter = require('./routes/reset'); 






//var pemesananRouter = require('./routes/pemesanan');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.locals.moment = require('moment');


app.use(session({
  cookie: {
    maxAge: 6000000000,
    secure: false,
    httpOnly: true,
    sameSite: 'strict',
  },
  store: new MemoryStore,
  saveUninitialized: true,
  resave: 'false',
  secret: 'secret'
}))

app.use(flash())

// Middleware untuk set currentPath
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.user = {
    nama: req.session.nama,
    role: req.session.role,
    foto: req.session.foto || 'default.jpg',
  };
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/superusers', superusersRouter);

app.use('/perujuk', perujukRouter);
app.use('/petugas', petugasRouter);
app.use('/ruang', ruangRouter);
app.use('/dx', dxRouter);
app.use('/periode', periodeRouter);
app.use('/transaksi_fee_rujukan', transaksi_fee_rujukanRouter);
app.use('/', resetRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
