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
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const GridFsStorage = require('multer-gridfs-storage');
var enforce = require('express-sslify');

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

// EXPRESS-SSLIFY

// app.use(enforce.HTTPS({ trustProtoHeader: true }));

// CONNECT DATABASE - MONGODB

// mongoose.connect(process.env.MONGO_URL, {
// 	useNewUrlParser: true,
// 	useUnifiedTopology: true
// });

mongoose.connect('mongodb://localhost:27017/modernJazzDB', { useUnifiedTopology: true });

// MULTER CONFIG

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads');
	},
	filename: (req, file, cb) => {
		cb(null, file.fieldname + ' - ' + Date.now());
	}
});

const upload = multer({ storage });

// SCHEMA DEFINITIONS

const reviewSchema = new mongoose.Schema({
	title: String,
	reviewMsg: String
});

const userReviewSchema = new mongoose.Schema({
	name: String,
	email: String,
	phone: String,
	title: String,
	reviewMsg: String
});

const courseReviewSchema = new mongoose.Schema({
	name: String,
	email: String,
	phone: String,
	title: String,
	reviewMsg: String
});

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: false
	},
	fname: String,
	lname: String,
	name: String,
	review: [ reviewSchema ],
	address: String,
	city: String,
	country: String,
	zipCode: String,
	details: String,
	image: {
		type: {
			name: String,
			originalName: String,
			data: Buffer,
			contentType: String
		},
		required: false
	}
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// MODEL DEFINITIONS

const User = mongoose.model('User', userSchema);
const Review = mongoose.model('Review', reviewSchema);

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

// EJS CODING

Object.assign(app.locals, {
	meta: {
		title: 'My Blog',
		description: 'A blog about something awesome!'
	},
	header: {
		title: 'Something Awesome'
	},
	footer: {
		year: new Date().getFullYear()
	},
	nav: {
		links: [ { text: 'Home', path: '/' }, { text: 'About', path: '/about' }, { text: 'Contact', path: '/contact' } ]
	}
});

// ROUTES

app.get('/', function(req, res) {
	res.render('index');
});

app.get('/about', function(req, res) {
	res.render('about-us');
});

app.get('/blog', function(req, res) {
	res.render('coming');
});

app.get('/coming', function(req, res) {
	res.render('coming');
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
			res.send("Oops! Something went wrong and we couldn't send your message.");
		} else {
			res.send('Message sent successfully, Thank you for contacting us !');
			console.log('Email status: ' + info.response);
		}
	});
});

app.get('/course', function(req, res) {
	res.render('our-courses-list');
});

app.get('/course-details', function(req, res) {
	res.render('courses-details');
});

app.post('/course-details', function(req, res) {
	review = new Review({
		title: req.body.title,
		reviewMsg: req.body.review
	});
	var message = `<p> Hi ${req.body.name}, </p>
						<p>Thank you for your review on <b style="color:#F23F00">${req.body.title}</b>,
						 we appreciate our customers feedbacks.</p>						
						<h4>REVIEW</h4>
						<p> ${req.body.review}</p>
						
						<p><b>Emmanuel Umoh</b></p>
						<i>Customer Support, Modern Jazz<i> 
						`;

	console.log(message);

	if (req.isAuthenticated()) {
		Review.create(review, function(err, item) {
			if (err) {
				console.log('err');
			} else {
				item.save(function(err) {
					if (!err) {
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
							to: req.body.email, // Email from web
							bcc: process.env.GMAIL_T0, // used as RCPT TO: address for SMTP
							subject: 'Course Review - ' + req.body.title,
							html: message
						};

						transporter.sendMail(options, function(err, info) {
							if (err) {
								console.log(err);
								res.send("Oops! Something went wrong and we couldn't send your message.");
							} else {
								res.send('Review sent successfully !');
								console.log('Email status: ' + info.response);
							}
						});
					}
				});
			}
		});
	} else {
		res.redirect('/login');
	}
});

app.get('/dashboard', function(req, res) {
	if (req.isAuthenticated()) {
		User.findById(req.user, function(err, foundUser) {
			let userInitials = foundUser.fname.slice(0, 1) + foundUser.lname.slice(0, 1);

			if (err) {
				res.redirect('/login');
			} else {
				res.render('dashboard', { foundUser, userInitials });
			}
		});
	} else {
		res.redirect('/login');
	}
});

app.get('/dashboard-notification', function(req, res) {
	if (req.isAuthenticated()) {
		User.findById(req.user, function(err, foundUser) {
			let userInitials = foundUser.fname.slice(0, 1) + foundUser.lname.slice(0, 1);

			if (err) {
				res.redirect('/login');
			} else {
				res.render('dashboard-notification', { foundUser, userInitials });
			}
		});
	} else {
		res.redirect('/login');
	}
});

app.get('/dashboard-mycourse', function(req, res) {
	if (req.isAuthenticated()) {
		User.findById(req.user, function(err, foundUser) {
			let userInitials = foundUser.fname.slice(0, 1) + foundUser.lname.slice(0, 1);

			if (err) {
				res.redirect('/login');
			} else {
				res.render('dashboard-mycourse', { foundUser, userInitials });
			}
		});
	} else {
		res.redirect('/login');
	}
});

app.get('/dashboard-user', function(req, res) {
	if (req.isAuthenticated()) {
		User.findById(req.user, function(err, foundUser) {
			let userInitials = foundUser.fname.slice(0, 1) + foundUser.lname.slice(0, 1);

			// console.log(foundUser.details);

			if (err) {
				res.redirect('/login');
			} else {
				res.render('dashboard-user', { foundUser, userInitials });
			}
		});
	} else {
		res.redirect('/login');
	}
});

app.post('/dashboard-user', upload.single('file'), function(req, res) {
	if (req.isAuthenticated()) {
		if (req.file) {
			User.updateOne(
				{ username: req.body.email },
				{
					address: req.body.address,
					city: req.body.city,
					country: req.body.country,
					zipCode: req.body.zipCode,
					details: req.body.details,
					image: {
						name: req.file.filename,
						originalName: req.file.originalname,
						data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
						contentType: req.file.mimetype
					}
				},
				{ multi: true },
				function(err) {
					if (err) {
						console.log('error');
					} else {
						console.log('yes-image');
						res.redirect('dashboard-user');
					}
				}
			);
		} else {
			// User.findOne(req.user, function(err, found) {
			// 	if (!err) {
			// 		User.updateOne(
			// 			{ username: found.username },
			// 			{
			// 				$set: {
			// 					address: req.body.address,
			// 					city: req.body.city,
			// 					country: req.body.country,
			// 					zipCode: req.body.zipCode,
			// 					details: req.body.details
			// 				}
			// 			},
			// 			{ multi: true },
			// 			function(err) {
			// 				if (err) {
			// 					console.log('error');
			// 				} else {
			// 					console.log('yes');
			// 					res.redirect('dashboard-user');
			// 				}
			// 			}
			// 		);
			// 	}
			// });
			User.findOneAndUpdate(
				{ username: req.body.email },
				{
					address: req.body.address,
					city: req.body.city,
					country: req.body.country,
					zipCode: req.body.zipCode,
					details: req.body.details
				},
				{ multi: true },
				function(err) {
					if (err) {
						console.log('error');
					} else {
						console.log('yes');
						res.redirect('dashboard-user');
					}
				}
			);
		}
	} else {
		res.redirect('/login');
	}
});

app.get('/learn', function(req, res) {
	res.render('learn');
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
				errorMsg: 'Invalid email address or password !'
			});
		}

		req.logIn(user, function(err) {
			//This creates a log in session
			if (err) {
				console.log(err);
			} else {
				console.log('logged in');
				res.redirect('/welcome');
			}
		});
	})(req, res);
});

app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
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

	let url = process.env.MAILCHIMP_KEY;
	let options = {
		method: 'POST',
		auth: process.env.MAILCHIMP_API
	};

	console.log(email);

	const request = https.request(url, options, function(response) {
		if (response.statusCode === 200) {
			console.log('success');

			res.render('success', {
				message: 'Thanks for subscribing to our news letter',
				emoji: 'fa fa-thumbs-up'
			});
		} else {
			console.log('error');
			res.render('success', {
				message: 'Sorry! unable to subscribe to our news letter',
				emoji: 'fa fa-thumbs-down'
			});
		}

		console.log(response.statusCode);
	});

	request.write(jsonData);
	request.end();
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
								console.log('registered');
								// res.redirect('/');

								// // LOG IN USER AFTER REGISTRATION
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
											console.log('logged in');
											res.redirect('/welcome');
										}
									});
								})(req, res);
							}
						}
					);

					// res.redirect('/login');
				});
			}
		}
	);
});

app.get('/testimonial', function(req, res) {
	res.render('testimonial');
});

app.get('/welcome', function(req, res) {
	// if (req.isAuthenticated()) {
	res.render('welcome');
	// } else {
	// 	res.redirect('/login');
	// }
});

app.get('/sitemap', function(req, res) {
	res.sendFile('sitemap.xml');
});

// app.get('*', function(req, res) {
// 	res.render('404');
// });

let port = process.env.PORT;
if (port == null || port == '') {
	port = 3000;
}

app.listen(port, function() {
	console.log('server running at port ' + port);
});
