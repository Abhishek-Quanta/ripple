const express=require('express')
const http=require('http')
const debug=require('debug')('ripple:server')
var logger=require('morgan')
var createError=require('http-errors')
var mongoose=require('mongoose');
var session=require('express-session')
var MongoDBStore=require('connect-mongodb-session')(session)

var indexRouter=require('./routes/index')
var usersRouter = require('./routes/users')

const app=express()
const server=http.createServer(app)
const port=3000

var mongoDB='mongodb+srv://Abhishek:Qu4ntaBho0@cluster0.bx2hb.mongodb.net/ripple?retryWrites=true&w=majority'
mongoose.connect(mongoDB,{useNewUrlParser:true,useUnifiedTopology:true});
var db=mongoose.connection;
db.on('error',console.error.bind(console,'MongoDB connection error:'));
var store=new MongoDBStore({
		uri:mongoDB,
		collection:'mySessions'
	})
store.on('error',err=>{
	console.log(err)
})

// view engine setup
app.set('views','./views');
app.set('view engine', 'pug');
app.set('port',port)

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('./public'))
app.use(session({
			secret:'I should change this',
			resave:false,
			saveUninitialized:false,
			store:store
		}))

app.use('/', indexRouter);
app.use('/users', usersRouter);

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

server.listen(port)
server.on('error',onError)
server.on('listening',onListening)
function onError(error){
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
		? 'Pipe ' + port
		: 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(bind + ' requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			console.error(bind + ' is already in use');
			process.exit(1);
			break;
		default:
			throw error;
	}
}
function onListening() {
	var addr = server.address()
	var bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr.port
	debug('Listening on ' + bind)
}
