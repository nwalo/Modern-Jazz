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
const _ = require('lodash');
const GridFsStorage = require('multer-gridfs-storage');
var enforce = require('express-sslify');

// IMPORT LOCAL MODULES

const courses = require(__dirname + '/public/assets/js/courses.js');
const tutors = require(__dirname + '/public/assets/js/tutors.js');

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

app.use(enforce.HTTPS({ trustProtoHeader: true }));

// CONNECT DATABASE - MONGODB

mongoose.connect(process.env.MONGO_URL, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

// mongoose.connect('mongodb://localhost:27017/modernJazzDB', { useUnifiedTopology: true });

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

const notificationSchema = new mongoose.Schema({
	message: String
});

const courseSchema = new mongoose.Schema({
	series: String,
	title: String,
	overview: String,
	benefits: [],
	tutors: [],
	link: String,
	img: String,
	image: String,
	video: String,
	duration: String,
	lesson: String,
	rating: String,
	ratingNumber: String,
	fee: String,
	modules: [ {} ]
});

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
	nick: String,
	course: [ courseSchema ],
	review: [ reviewSchema ],
	notification: [ notificationSchema ],
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

const tutorSchema = new mongoose.Schema({
	title: String,
	reviewMsg: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// MODEL DEFINITIONS

const User = mongoose.model('User', userSchema);
const Review = mongoose.model('Review', reviewSchema);
const Tutor = mongoose.model('Tutor', tutorSchema);
const Notification = mongoose.model('Notification', notificationSchema);

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

// DEFAULT ITEMS FOR ALL USERS

const welcomeNotification = [
	{
		message: 'Welcome to the Advance Master Course, you are in for an awesome ride.'
	},
	{
		message: 'Follow us on Instagram to watch amazing Techniques, Tricks and Hacks.'
	},
	{
		message: 'Join the Private Modern Jazz Facebook Page'
	},
	{
		message: 'Subscribe to our newsletter to get latest update on all courses, events and news.'
	},
	{
		message: 'A live virtual class session takes place on the telegram channel on Mondays and Thursdays.'
	}
];

// ROUTES

app.get('/', function(req, res) {
	res.render('index', { title: 'Home' });
});

app.get('/about', function(req, res) {
	res.render('about-us', { title: 'About' });
});

app.get('/blog', function(req, res) {
	res.render('coming', { title: 'Blog' });
});

app.get('/coming', function(req, res) {
	res.render('coming', { title: 'Coming Soon' });
});

app.get('/contact', function(req, res) {
	res.render('contact', { title: 'Contact' });
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
	res.render('our-courses-list', { title: 'All Courses' });
});

app.get('/course-pg2', function(req, res) {
	res.render('our-courses-list-z2', { title: 'All Courses - Page 2' });
});

app.get('/course/:courseLink', function(req, res) {
	let course = courses.courses.find((element) => {
		return element.link == req.params.courseLink;
	});

	let allTutors = tutors.tutors;

	let tutor = tutors.tutors.find(function(i) {
		return i.name == _.capitalize(req.params.name);
	});

	res.render('courses-details', { course, allTutors, tutor, title: 'Course - ' + course.title });
});

app.post('/course', function(req, res) {
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

app.get('/course/:courseLink/lesson/:lesson', function(req, res) {
	var newCourseLink = req.params.courseLink;
	var lesson = req.params.lesson;
	let number = req.params.lesson.substring(2);
	let next = Number(number) + 1;
	let currentLesson = '1.' + number;
	req.session.link = req.params.courseLink;

	User.findById(req.user, function(err, foundUser) {
		if (err) {
			console.log(err);
		} else {
			if (!foundUser) {
				res.redirect('/course');
			} else {
				// console.log(newCourseLink, lesson, number, next, currentLesson, req.session.link);
				if (newCourseLink) {
					var currentCourse = foundUser.course.find(function(course) {
						return course.link == newCourseLink;
					});

					req.session.TitleOfCourse = currentCourse.title;

					if (currentCourse) {
						var currentCourseModule = currentCourse.modules.find(function(course) {
							return course.lesson == currentLesson;
						});

						if (number > 0 && number <= currentCourse.modules.length) {
							if (currentCourseModule.status == 'lock') {
								res.redirect('/course/' + newCourseLink + '/lesson/1.' + req.session.url);
							} else {
								var modules = currentCourse.modules.slice(0, 2);
								req.session.url = number;
								res.render('module', {
									title: 'Learn',
									module: modules,
									lessonNumber: lesson,
									currentCourse,
									currentCourseModule
								});
							}
						} else {
							res.redirect('/course/' + newCourseLink);
							console.log('nope');
						}
					} else {
						res.redirect('/enroll/' + newCourseLink);
					}
				} else {
					res.redirect('/course');
				}
			}
		}
	});
});

app.get('/dashboard', function(req, res) {
	if (req.isAuthenticated()) {
		User.findById(req.user, function(err, foundUser) {
			let userInitials = foundUser.fname.slice(0, 1) + foundUser.lname.slice(0, 1);

			if (err) {
				res.redirect('/login');
			} else {
				res.render('dashboard', { foundUser, userInitials, title: 'Dashboard' });
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
				res.render('dashboard-notification', { foundUser, userInitials, title: 'Dashboard Notification' });
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
				res.render('dashboard-mycourse', { foundUser, userInitials, title: 'Dashboard - My Courses' });
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
						res.redirect('/dashboard-user');
					}
				}
			);
		} else {
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
						res.redirect('/dashboard-user');
					}
				}
			);
		}
	} else {
		res.redirect('/login');
	}
});

app.get('/enroll/:courseLink', function(req, res) {
	req.session.link = req.params.courseLink;
	if (req.isAuthenticated()) {
		User.findById(req.user, function(err, foundUser) {
			let myCourse = courses.courses.find(function(course) {
				return course.link == req.params.courseLink;
			});

			const courseLinks = foundUser.course.map(function(i) {
				return i.link;
			});

			if (!courseLinks.includes(myCourse.link)) {
				res.redirect('/payment');
			} else {
				console.log('course already exist');
				res.redirect('/course/' + req.params.courseLink + '/lesson/1.1');
			}
		});
	} else {
		res.redirect('/login');
	}
});

// app.get('/learn/:courseLink', function(req, res) {
// 	req.session.link = req.params.courseLink;

// 	var courseLink = req.session.link;
// 	let number = 1;
// 	let currentLesson = '1.' + number;

// 	User.findById(req.user, function(err, foundUser) {
// 		if (err) {
// 			console.log(err);
// 		} else {
// 			if (!foundUser) {
// 				res.redirect('/course');
// 			} else {
// 				var currentCourse = foundUser.course.find(function(course) {
// 					return course.link == courseLink;
// 				});

// 				if (currentCourse) {
// 					var currentCourseModule = currentCourse.modules.find(function(course) {
// 						return course.lesson == currentLesson;
// 					});
// 					var modules = currentCourse.modules.slice(0 ,);
// 					res.render('module', {
// 						courseTitle: currentCourse.title,
// 						title: 'Learn',
// 						module: modules,
// 						lessonNumber: '1.1',
// 						currentCourse,
// 						currentCourseModule
// 					});
// 				} else {
// 					var dataType = typeof Number(courseLink);

// 					if (dataType == 'number') {
// 						var currentCourse = foundUser.course.find(function(course) {
// 							return course.link == courseLink;
// 						});
// 						console.log('num');
// 					} else {
// 						console.log('str');
// 					}
// 					res.render('404', { title: 'Page Not Found' });
// 				}
// 			}
// 		}
// 	});
// });

app.get('/login', function(req, res) {
	res.render('login', {
		errorMsg: '',
		title: 'Login'
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
				errorMsg: 'Invalid email address or password !',
				title: 'Login'
			});
		}

		req.logIn(user, function(err) {
			//This creates a log in session
			if (err) {
				console.log(err);
			} else {
				console.log('logged in');
				res.redirect('/dashboard');
			}
		});
	})(req, res);
});

app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/login');
});

app.post('/modules/:courseLink', function(req, res) {
	let number = req.body.lessonValue.substring(2);
	let next = Number(number) + 1;
	let courseLink = req.body.courseLink;
	let currentLesson = '1.' + number;
	let nextLesson = '1.' + next;
	let previousLesson = '1.' + (number - 1);

	// console.log(previousLesson, currentLesson, nextLesson, courseLink);

	User.findById(req.user, function(err, foundUser) {
		if (err) {
			console.log(err);
		} else {
			var currentCourse = foundUser.course.find(function(course) {
				return course.link == courseLink;
			});
			var module = currentCourse.modules.slice(0).find(function(course) {
				return course.lesson == currentLesson;
			});
			var previousModule = currentCourse.modules.slice(0).find(function(course) {
				return course.lesson == previousLesson;
			});
			var nextModule = currentCourse.modules.slice(0).find(function(course) {
				return course.lesson == nextLesson;
			});
			// console.log(previousModule);
			// console.log(module);
			// console.log(nextModule);

			req.session.TitleOfCourse = currentCourse.title;

			if (module.status == 'check-circle') {
				console.log('yes');
			} else {
				User.findOneAndUpdate(
					{
						username: req.user.username,
						'course.title': currentCourse.title,
						'course.$[outer].modules.$[inner].lesson': currentLesson,
						'course.$[outer].modules.$[inner].status': 'unlock'
					},
					{
						$set: {
							'course.$[outer].modules.$[inner].status': 'check-circle'
						}
					},
					{
						arrayFilters: [ { 'outer.title': currentCourse.title }, { 'inner.lesson': currentLesson } ]
					},
					function(err, found) {
						if (err) {
							console.log(err);
						} else {
							console.log('current course has updated');
						}
					}
				);
				User.findOneAndUpdate(
					{
						username: req.user.username,
						'course.title': currentCourse.title,
						'course.$[outer].modules.$[inner].lesson': nextLesson,
						'course.$[outer].modules.$[inner].status': 'lock'
					},
					{
						$set: {
							'course.$[outer].modules.$[inner].status': 'unlock'
						}
					},
					{
						arrayFilters: [ { 'outer.title': currentCourse.title }, { 'inner.lesson': nextLesson } ]
					},
					function(err, found) {
						if (err) {
							console.log(err);
						} else {
							console.log('next course has updated');
						}
					}
				);
			}
			if (!previousModule) {
				console.log('no previous');
				res.redirect('/course/' + courseLink + '/lesson/1.' + next);
			} else {
				if (!nextModule) {
					console.log('no next');
					res.redirect('/certificate');
				} else {
					if (
						previousModule.status == 'check-circle' &&
						module.status == 'check-circle' &&
						nextModule.status == 'check-circle'
					) {
						res.redirect('/course/' + courseLink + '/lesson/1.' + next);
					} else if (
						previousModule.status == 'check-circle' &&
						module.status == 'check-circle' &&
						nextModule.status == 'unlock'
					) {
						res.redirect('/course/' + courseLink + '/lesson/1.' + next);
					} else if (
						previousModule.status == 'check-circle' &&
						module.status == 'unlock' &&
						nextModule.status == 'lock'
					) {
						res.redirect('/course/' + courseLink + '/lesson/1.' + next);
					} else if (
						previousModule.status == 'check-circle' &&
						module.status == 'unlock' &&
						nextModule.status == 'check-circle'
					) {
						User.findOneAndUpdate(
							{
								username: req.user.username,
								'course.title': currentCourse.title,
								'course.$[outer].modules.$[inner].lesson': currentLesson,
								'course.$[outer].modules.$[inner].status': 'unlock'
							},
							{
								$set: {
									'course.$[outer].modules.$[inner].status': 'check-circle'
								}
							},
							{
								arrayFilters: [ { 'outer.title': currentCourse.title }, { 'inner.lesson': nextLesson } ]
							},
							function(err, found) {
								if (err) {
									console.log(err);
								} else {
									console.log('next course has updated');
								}
							}
						);
						res.redirect('/course/' + courseLink + '/lesson/1.' + next);
					} else {
						res.redirect('/course/' + courseLink + '/lesson/1.' + number);
						log('anything else?');
					}
					console.log('there is previous');
				}
			}
		}
	});
});

app.get('/certificate', function(req, res) {
	if (req.session.TitleOfCourse) {
		res.send('CONGRATULATIONS, PRINT YOUR CERTIFICATE FOR ' + req.session.TitleOfCourse + ' HERE!');
	} else {
		res.send('KINDLY FINISH ALL COURSES');
	}
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
				message: 'Thanks for subscribing to our newsletter',
				emoji: 'fas fa-thumbs-up',
				title: ' Success Page'
			});
		} else {
			console.log('error');
			res.render('success', {
				message: 'Sorry! unable to subscribe to our news letter',
				emoji: 'fa fa-thumbs-down',
				title: 'Error Page'
			});
		}

		console.log(response.statusCode);
	});

	request.write(jsonData);
	request.end();
});

app.get('/notice', function(req, res) {
	res.render('coming', { title: 'Notice' });
});

app.get('/payment', function(req, res) {
	req.session.confirmPayment = 'paid';
	if (req.isAuthenticated()) {
		res.render('payment', { title: 'Modern Jazz Course Checkout' });
	} else {
		res.redirect('/login');
	}
});

app.get('/payment-confirmation', function(req, res) {
	if (req.session.confirmPayment === 'paid') {
		console.log(req.session.id);
		if (req.isAuthenticated()) {
			User.findById(req.user, function(err, foundUser) {
				let myCourse = courses.courses.find(function(course) {
					return course.link == req.session.link;
				});

				const courseLinks = foundUser.course.map(function(i) {
					return i.link;
				});

				if (!courseLinks.includes(myCourse.link)) {
					foundUser.course.push(myCourse);
					foundUser.save(function(err) {
						if (!err) {
							console.log('new course added to ' + foundUser.fname);
							let notification = {
								message: `Thanks for your purchase. A new course - ${myCourse.title} - has been added to your learning inventory.`
							};
							foundUser.notification.push(notification);
							foundUser.save(function(err) {
								if (err) {
									res.resend('Error, Transaction failed. Unable to enroll to' + myCourse.title);
								} else {
									console.log('notification updated');
								}
							});

							res.redirect('/dashboard-mycourse');
						}
					});
				} else {
					console.log('course already exist');
					res.redirect('/dashboard-mycourse');
				}
			});
		} else {
			res.redirect('/login');
		}
	} else {
		console.log('not paid');
		res.render('403', { title: '403 Error - Access Forbidden' });
	}
});

app.get('/403', function(req, res) {
	res.render('403', {
		title: '403 Error - Access Forbidden'
	});
});

app.get('/register', function(req, res) {
	res.render('register', {
		errorMsg: '',
		title: 'Register'
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
					errorMsg: 'Error ! User registration failed.',
					title: 'Register'
				});
			} else {
				passport.authenticate('local')(req, res, function() {
					User.updateOne(
						{
							_id: req.user.id
						},
						{
							fname: _.capitalize(req.body.fname),
							lname: _.capitalize(req.body.lname),
							nick: req.body.nick,
							notification: welcomeNotification
						},
						function(err) {
							if (!err) {
								console.log('registered');

								// // LOG IN USER AFTER REGISTRATION
								const user = new User({
									username: req.body.username,
									password: req.body.password
								});

								passport.authenticate('local', function(err, user, info) {
									if (err) {
										console.log(err);
										res.redirect('/register');
									}
									if (!user) {
										return res.render('login', {
											errorMsg: 'Invalid username or password !',
											title: 'Login'
										});
									}

									req.logIn(user, function(err) {
										if (err) {
											console.log(err);
										} else {
											res.redirect('/dashboard');
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

app.get('/sitemap', function(req, res) {
	res.sendFile(__dirname + '/sitemap.xml');
});

app.get('/tutors', function(req, res) {
	let allTutors = tutors.tutors;
	// Tutor.findOne({ name: tutor }, function(err, foundTutor) {
	if (!allTutors) {
		res.render('404');
	} else {
		res.render('teachers', { title: 'Tutors', allTutors });
	}
	// });
});

app.get('/tutors/:name', function(req, res) {
	let tutor = tutors.tutors.find(function(i) {
		// console.log(i.name, _.capitalize(req.params.name));
		return i.name == _.capitalize(req.params.name);
	});
	// console.log(tutor);
	// Tutor.findOne({ name: tutor }, function(err, foundTutor) {
	if (!tutor) {
		res.render('404');
	} else {
		res.render('teacher-details', { title: 'Tutor Details', tutor });
	}
	// });
});

app.get('/testimonial', function(req, res) {
	res.render('testimonial', { title: 'Testimonial' });
});

// app.get('/welcome', function(req, res) {
// 	// if (req.isAuthenticated()) {
// 	res.render('welcome', { title: 'Welcome' });
// 	// } else {
// 	// 	res.redirect('/login');
// 	// }
// });

app.get('*', function(req, res) {
	res.render('404', { title: '404 Error - Page Not Found' });
});

let port = process.env.PORT;
if (port == null || port == '') {
	port = 3000;
}

app.listen(port, function() {
	console.log('server running at port ' + port);
});
