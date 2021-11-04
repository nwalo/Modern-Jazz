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

mongoose.connect(process.env.MONGO_URL, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

// mongoose.connect('mongodb://localhost:27017/modernJazzDB', { useUnifiedTopology: true });

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

// GLOBAL SERIALIZATION

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
	res.render('contact');
});

app.post('/contact', function(req, res) {
	let name = req.body.name;
	let email = req.body.email;
	let phone = req.body.phone;
	let subject = req.body.subject;
	let message = req.body.message;

	console.log(name, email, phone, subject, message);

	// NODEMAILER AUTHENTICATION

	var transporter = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: '465',
		secure: true,
		auth: {
			user: process.env.GMAIL_ID,
			pass: process.env.GMAIL_PASS
		}
	});

	var options = {
		from: 'Admin <modernjazzwithnoels@gmail.com>',
		to: email, // Email from web
		bcc: process.env.GMAIL_T0, // used as RCPT TO: address for SMTP
		subject: subject,
		html: message
	};

	transporter.sendMail(options, function(err, info) {
		if (err) {
			console.log(err);
			res.send('Error! Restore unsuccessful, please check your network and try again...');
		} else {
			res.send('Message sent successfully, Thank you for contacting us !');
			console.log('Email status: ' + info.response);
		}
	});
});

app.get('/course', function(req, res) {
	res.render('our-courses-list');
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

app.post('/newsletter', function(req, res) {
	const email = req.body.email;

	const data = {
		members: [
			{
				email_address: email,
				status: 'subscribed'
			}
		]
	};

	const jsonData = JSON.stringify(data);

	let url = 'https://us10.api.mailchimp.com/3.0/lists/eaa3903e59';
	let options = {
		method: 'POST',
		auth: 'nob:46969607b2e3dfc293dfd5ca618f8d85-us10'
	};

	const request = https.request(url, options, function(response) {
		if (response.statusCode === 200) {
			console.log('success');
		} else {
			console.log('error');
		}

		console.log(response.statusCode);
		// response.on('data', function (data) {
		//   console.log(JSON.parse(data));
		// })
	});

	request.write(jsonData);
	request.end();

	res.redirect('/');
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

let port = process.env.PORT;
if (port == null || port == '') {
	port = 3000;
}

app.listen(port, function() {
	console.log('server running at port ' + port);
});
