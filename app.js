require('dotenv').config();
const bodyParser = require('body-parser');
const ejs = require('ejs');
const express = require('express');
const findOrCreate = require('mongoose-findorcreate');
const https = require('https');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const session = require('express-session');
// CONNECT DATABASE - MONGODB

mongoose.connect('mongodb://localhost:27017/modernJazzDB', { useUnifiedTopology: true });

// MALWARES

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(
	session({
		secret: process.env.SECRET,
		resave: false,
		saveUninitialized: false
	})
);
app.use(passport.initialize());
app.use(passport.session());

// SCHEMA DEFINITIONS

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: false
	},
	fname: String,
	lname: String,
	name: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// MODEL DEFINITIONS

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

//GLOBAL SERIALIZATION

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

// ROUTES

app.get('/', function(req, res) {
	res.render('index');
});

app.get('/about', function(req, res) {
	res.render('about-us');
});

app.get('/blog', function(req, res) {
	res.render('blog');
});

app.get('/contact', function(req, res) {
	res.render('login', {
		errorMsg: ' '
	});
});

app.get('/login', function(req, res) {
	res.render('login', {
		errorMsg: ''
	});
});

app.post('/login', function(req, res) {
	const user = new User({
		username: req.body.username,
		password: req.body.password
	});

	passport.authenticate('local', function(err, user, info) {
		if (err) {
			console.log(err);
		}
		if (!user) {
			return res.render('login', {
				errorMsg: 'Invalid username or password !'
			});
		}

		req.logIn(user, function(err) {
			//This creates a log in session
			if (err) {
				console.log(err);
			} else {
				res.redirect('/');
			}
		});
	})(req, res);
});

app.get('/notice', function(req, res) {
	res.render('notice');
});

app.get('/register', function(req, res) {
	res.render('register', {
		errorMsg: ''
	});
});

app.post('/register', function(req, res) {
	console.log(req.body.username, req.body.lname, req.body.fname);
	User.register(
		{
			username: req.body.username
		},
		req.body.password,
		function(err) {
			if (err) {
				console.log('err');
				res.render('register', {
					errorMsg: 'Error ! User registration failed.'
				});
			} else {
				passport.authenticate('local')(req, res, function() {
					User.updateOne(
						{
							_id: req.user.id
						},
						{
							fname: req.body.fname,
							lname: req.body.lname,
							name: req.body.name
						},
						function(err) {
							if (!err) {
								console.log('logged in');
							}
						}
					);

					res.redirect('/login');
				});
			}
		}
	);
});

app.get('/testimonial', function(req, res) {
	res.render('testimonial');
});

app.listen('3000', function() {
	console.log('Server is running at port 3000!');
});
