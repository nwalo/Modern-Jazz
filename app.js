require('dotenv').config();
const bodyParser = require('body-parser');
const ejs = require('ejs');
const express = require('express');
const findOrCreate = require('mongoose-findorcreate');
const https = require('https');
const mongoose = require('mongoose');
const moment = require('moment');
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

const notificationSchema = new mongoose.Schema({
	message: String
});

const courseSchema = new mongoose.Schema({
	type: String,
	series: String,
	title: String,
	fulltitle: String,
	overview: String,
	benefits: [],
	link: String,
	status: String,
	img: String,
	duration: String,
	lesson: String,
	tutor: String,
	rating: String,
	ratingNumber: String,
	fee_$: String,
	fee_N: String,
	modules: [ {} ]
});

const reviewSchema = new mongoose.Schema({
	name: String,
	email: String,
	phone: String,
	title: String,
	reviewMsg: String
});

const blogSchema = new mongoose.Schema({
	title: String,
	image: {
		type: {
			name: String,
			originalName: String,
			data: Buffer,
			contentType: String
		},
		required: false
	},
	content: String,
	category: String,
	tags: [],
	author: String,
	date: Date,
	timestamp: {
		type: String,
		default: () => moment().format('DD MMM, YYYY')
	}
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
	type: String,
	theme: String,
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

const Blog = mongoose.model('Blog', blogSchema);
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

// DEFAULT NOTIFICATION ITEMS FOR ALL USERS

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

// var text = {
// 	message:
// 		'The <strong> Modern Jazz Blog </strong> is near-complete and due to launch in 3 days. It is for your personal growth, kindly ensure to read at least once daily. <button class="mybg-alt"><a href="/blog" style="color: #f0f8ff; font-weight: 600;">Go To Blog </a> </button>'
// };

// User.find({}, function(err, found) {
// 	if (err) {
// 		console.log('err');
// 	} else {
// 		found.forEach(function(user) {
// 			user.notification.push(text);
// 			user.save(function(err) {
// 				if (err) {
// 					console.log('err');
// 				} else {
// 					console.log('added new notif');
// 				}
// 			});
// 		});
// 	}
// });

// ROUTES

app.get('/', function(req, res) {
	var myCourse = courses.courses;
	res.render('index', { title: 'Home', courses: myCourse });
});

app.get('/about', function(req, res) {
	res.render('about-us', { title: 'About' });
});

app.get('/admin', function(req, res) {
	if (req.isAuthenticated()) {
		if (req.user.username === 'nwalobright@gmail.com') {
			res.render('admin', { title: 'Dashboard-Admin' });
		} else {
			res.render('403', {
				title: '403 Error - Access Forbidden'
			});
		}
	} else {
		res.redirect('/login');
	}
});

app.post('/admin', upload.single('file'), function(req, res) {
	var tags = req.body.tags.split(';').map(function(i) {
		return _.capitalize(i);
	});

	const blogPost = {
		title: _.capitalize(req.body.title),
		image: {
			name: req.file.filename,
			originalName: req.file.originalname,
			data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
			contentType: req.file.mimetype
		},
		content: req.body.content,
		category: _.capitalize(req.body.category),
		tags: tags,
		date: moment().format('DD MMM, YYYY'),
		author: _.capitalize(req.body.author)
	};

	Blog.findOne({ title: req.body.title }, function(err, found) {
		if (err) {
			console.log('err');
		} else {
			if (found) {
				console.log('found');
			} else {
				Blog.create(blogPost, function(err, blog) {
					if (!err) {
						blog.save(function(err) {
							if (!err) {
								console.log('new blog added');
							}
						});
					}
				});
			}
		}
	});
	res.redirect('/blog');
});

app.get('/blog', function(req, res) {
	Blog.find({}, function(err, found) {
		res.render('blog', { title: 'Blog', posts: found });
	});
});

app.get('/blog/post/:postId', function(req, res) {
	const categoryName = [];
	const categoryNumber = [];
	Blog.findOne({ _id: req.params.postId }, function(err, found) {
		Blog.find({}, function(err, foundPosts) {
			for (var i = 0; i < foundPosts.length; i++) {
				if (!categoryName.includes(foundPosts[i].category)) {
					let num = foundPosts.filter(function(j) {
						return j.category == foundPosts[i].category;
					});
					// console.log(foundPosts[i].category, num.length);
					categoryName.push(foundPosts[i].category);
					categoryNumber.push(num.length);
				}
			}

			// console.log(found.content);

			if (found) {
				res.render('blog-details', {
					title: `Blog | ${found.title}`,
					post: found,
					posts: foundPosts.slice(0, 5),
					categoryName,
					categoryNumber
				});
			} else {
				res.render('404', { title: '404 Error - Page Not Found' });
			}
		});
	});
});

app.get('/blog/category/:categoryLink', function(req, res) {
	const categoryName = [];
	const categoryNumber = [];
	const authors = [];
	const categoryLink = _.capitalize(req.params.categoryLink);

	Blog.find({ category: categoryLink }, function(error, found) {
		// To find the posts that match the category
		Blog.find({}, function(err, foundPosts) {
			//To find all post so that i can extract all their ctegories
			for (var i = 0; i < foundPosts.length; i++) {
				if (!categoryName.includes(foundPosts[i].category)) {
					let num = foundPosts.filter(function(j) {
						// To filter the results of a the found category so we can find how many of that category exist.
						return j.category == foundPosts[i].category;
					});
					categoryName.push(foundPosts[i].category);
					categoryNumber.push(num.length);
				}
			}

			for (var i = 0; i < foundPosts.length; i++) {
				if (!authors.includes(foundPosts[i].author)) {
					authors.push(foundPosts[i].author);
				}
			}

			if (foundPosts) {
				res.render('blog-left-sidebar', {
					title: `Blog | Category | ${categoryLink}`,
					postByCategory: found,
					posts: foundPosts.slice(0, 5),
					categoryLink,
					categoryName,
					authors,
					categoryNumber
				});
			} else {
				res.render('404', { title: '404 Error - Page Not Found' });
			}
		});
	});
});

app.post('/blog/category', function(req, res) {
	const categoryLink = req.body.categoryRadio;
	res.redirect('/blog/category/' + categoryLink);
});

app.get('/blog/tags/:tagName', function(req, res) {
	const categoryName = [];
	const categoryNumber = [];
	const authors = [];
	Blog.find({ tags: _.capitalize(req.params.tagName) }, function(err, tagFound) {
		// Searching the query tags array directly using the string value

		Blog.find({}, function(err, foundPosts) {
			for (var i = 0; i < foundPosts.length; i++) {
				if (!categoryName.includes(foundPosts[i].category)) {
					let num = foundPosts.filter(function(j) {
						return j.category == foundPosts[i].category;
					});
					categoryName.push(foundPosts[i].category);
					categoryNumber.push(num.length);
				}
			}

			for (var i = 0; i < foundPosts.length; i++) {
				if (!authors.includes(foundPosts[i].author)) {
					authors.push(foundPosts[i].author);
				}
			}

			if (tagFound) {
				res.render('blog-right-sidebar', {
					title: `Blog | Category | ${tagFound}`,
					postByTag: tagFound,
					tagLink: _.capitalize(req.params.tagName),
					posts: foundPosts.slice(0, 5),
					categoryName,
					authors,
					categoryNumber
				});
			} else {
				res.render('404', { title: '404 Error - Page Not Found' });
			}
		});
	});
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
		bcc: process.env.GMAIL_TO, // used as RCPT TO: address for SMTP
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

app.get('/courses/:page', function(req, res) {
	var page = req.params.page.slice(4);
	var myCourse = courses.courses;
	var length = [];

	for (let i = 0; i < myCourse.length; i++) {
		if (i % 8 == 0) {
			length.push(i);
		}
	}

	res.render('our-courses-list', { title: 'All Courses', courses: myCourse, n: page, length });
});

app.get('/course/:courseLink', function(req, res) {
	let course = courses.courses.find((element) => {
		return element.link == req.params.courseLink;
	});

	let allTutors = tutors.tutors;

	let tutor = tutors.tutors.find(function(i) {
		return i.name == _.capitalize(req.params.name);
	});

	if (typeof course === 'undefined') {
		res.redirect('/courses/page1');
	} else {
		res.render('courses-details', { course, allTutors, tutor, title: 'Course - ' + course.title });
	}
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
							bcc: process.env.GMAIL_TO, // used as RCPT TO: address for SMTP
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
				res.redirect('/login');
			} else {
				console.log(newCourseLink, lesson, number, next, currentLesson, req.session.link, req.session.url);
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
								console.log('pk');
							} else {
								var modules = currentCourse.modules.slice(0, 4);
								req.session.url = number;
								res.render('module', {
									title: 'Learn',
									module: modules,
									lessonNumber: lesson,
									currentCourse,
									currentCourseModule
								});
								console.log('pl');
							}
						} else {
							res.redirect('/course/' + newCourseLink);
							console.log('nope');
						}
					} else {
						res.redirect('/enroll/' + newCourseLink);
						console.log('pp');
					}
				} else {
					res.redirect('/course/' + newCourseLink + '/lesson/1.1');
					console.log('p');
				}
			}
		}
	});
});

app.get('/dashboard', function(req, res) {
	// console.log(req.user);
	if (req.isAuthenticated()) {
		User.findById(req.user, function(err, foundUser) {
			let userInitials = foundUser.fname.slice(0, 1) + foundUser.lname.slice(0, 1);

			if (err) {
				res.redirect('/login');
			} else {
				res.render('dashboard', { foundUser, userInitials, title: 'Dashboard', theme: foundUser.theme });
			}
		});
	} else {
		res.redirect('/login');
	}
});

app.post('/dashboard-notification', function(req, res) {
	var checkedId = req.body.checkbox;

	User.findOneAndUpdate(
		{
			_id: req.user
		},
		{
			$pull: {
				notification: {
					_id: checkedId
				}
			}
		},
		{
			useFindAndModify: false
		},
		function(err, found) {
			if (err) {
				console.log(err);
			} else {
				console.log('item has been deleted');
				res.redirect('/dashboard-notification');
			}
		}
	);
});

app.get('/dashboard-notification', function(req, res) {
	if (req.isAuthenticated()) {
		User.findById(req.user, function(err, foundUser) {
			let userInitials = foundUser.fname.slice(0, 1) + foundUser.lname.slice(0, 1);

			if (err) {
				res.redirect('/login');
			} else {
				res.render('dashboard-notification', {
					foundUser,
					userInitials,
					title: 'Dashboard Notification',
					theme: foundUser.theme
				});
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
				res.render('dashboard-mycourse', {
					foundUser,
					userInitials,
					title: 'Dashboard - My Courses',
					theme: foundUser.theme
				});
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
				res.render('dashboard-user', { foundUser, userInitials, theme: foundUser.theme });
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
				res.redirect('/payment/' + req.params.courseLink);
			} else {
				console.log('course already exist');
				res.redirect('/course/' + req.params.courseLink + '/lesson/1.1');
			}
		});
	} else {
		res.redirect('/login');
	}
});

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
				if (req.user.username == 'nwalobright@gmail.com') {
					res.redirect('/admin');
				} else if (req.user.type == 'teacher') {
					res.redirect('/teacher/dashboard');
				} else {
					res.redirect('/dashboard');
				}
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

app.get('/faq', function(req, res) {
	res.render('faq', { title: 'Frequently Asked Questions' });
});

app.get('/legal', function(req, res) {
	res.render('legal', { title: 'Terms & Condition ' });
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

app.get('/payment/:courseLink', function(req, res) {
	if (req.isAuthenticated()) {
		let myCourse = courses.courses.find(function(course) {
			return course.link == req.params.courseLink;
		});
		req.session.confirmPayment = 'paid';

		req.session.TitleOfCourse = myCourse.title;

		res.render('payment', { title: 'Modern Jazz Course Checkout', course: myCourse });
	} else {
		res.redirect('/login');
	}
});

app.get('/payment-confirmation', function(req, res) {
	if (req.session.confirmPayment === 'paid') {
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

							res.redirect('welcome');
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
							nick: _.capitalize(req.body.nick),
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

app.get('/teacher/dashboard', function(req, res) {
	if (req.isAuthenticated()) {
		if (req.user.type === 'teacher') {
			let coursesByTeacher = courses.courses.filter((element) => {
				return element.tutor == req.user.nick;
			});

			res.render('admin-teacher', { title: 'Teacher dashboard', coursesByTeacher, teacher: req.user });
		} else {
			res.render('403', {
				title: '403 Error - Access Forbidden'
			});
		}
	} else {
		res.redirect('/login');
	}
});

app.get('/teacher/dashboard/student-list/:courseLink', function(req, res) {
	User.find({ 'course.link': req.params.courseLink }, function(err, found) {
		if (err) {
			res.redirect('/teacher/dashboard');
		} else {
			res.render('admin-teacher-list', { title: 'List of students offering this course', found });
		}
	});
});

app.get('/teacher/register', function(req, res) {
	res.render('register-teacher', {
		errorMsg: '',
		title: 'Register as a teacher'
	});
});

app.post('/teacher/register', function(req, res) {
	User.register(
		{
			username: req.body.username
		},
		req.body.password,
		function(err) {
			if (err) {
				console.log('err');
				res.render('/teacher/register', {
					errorMsg: 'Error ! User registration failed.',
					title: 'Register as a teacher'
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
							nick: _.capitalize(req.body.nick),
							type: 'teacher',
							notification: welcomeNotification
						},
						function(err) {
							if (!err) {
								console.log('teacher registered');

								// // LOG IN USER AFTER REGISTRATION
								const user = new User({
									username: req.body.username,
									password: req.body.password
								});

								passport.authenticate('local', function(err, user, info) {
									if (err) {
										console.log(err);
										res.redirect('/teacher/register');
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
											res.redirect('/teacher/dashboard');
										}
									});
								})(req, res);
							}
						}
					);
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

app.get('/welcome', function(req, res) {
	if (req.session.confirmPayment === 'paid') {
		if (req.isAuthenticated()) {
			res.render('welcome', { title: 'Welcome', courseTitle: req.session.TitleOfCourse });
		} else {
			res.redirect('/login');
		}
	} else {
		res.redirect('/dashboard');
	}
});

app.post('/theme', function(req, res) {
	console.log(req.body.theme);

	User.updateOne(
		{
			_id: req.user.id
		},
		{
			theme: req.body.theme
		},
		function(err) {
			if (!err) {
				res.redirect('/dashboard-user');
			} else {
				res.redirect('/dashboard');
			}
		}
	);
});

// var title = '80 Solo Techniques in 4 Weeks';

// User.updateMany(
// 	{
// 		'course.title': title
// 	},
// 	{
// 		$set: {
// 			'course.$[outer].modules.$[lower].video': 'https://player.vimeo.com/video/666425936?h=dddbbc07b2'
// 		}
// 	},
// 	{
// 		arrayFilters: [
// 			{ 'outer.title': title },
// 			{
// 				lower: {
// 					name: 'Jazz Chords',
// 					lesson: '1.2',
// 					status: 'lock',
// 					video: 'myj'
// 				}
// 			}
// 		]
// 	},
// 	function(err, status) {
// 		console.log(err, status);
// 	}
// );

// User.find(
// 	{
// 		'course.title': title,
// 		'course.modules.lesson': lesson
// 	},
// 	function(err, foundUser) {
// 		if (err) {
// 			console.log(err);
// 		} else {
// 			foundUser.forEach(function(user) {
// 				// console.log(user.fname);
// 				let foundCourse = user.course.filter(function(i) {
// 					return i.title == title;
// 				});
// 				foundCourse.forEach((course) => {
// 					let modu = course.modules.filter(function(mod) {
// 						return mod.lesson == lesson;
// 					});

// 					user.save(function(err) {
// 						if (err) {
// 							log(err);
// 						} else {
// 							modu['video'] = 'this is the video link';

// 							console.log('saved vid');
// 						}
// 					});
// 				});
// 				// user.course.forEach(function(course) {
// 				// 	course.modules.forEach(function(module) {
// 				// 		course.save(function(err) {
// 				// 			if (!err) {
// 				// 				module['video'] = 'vid';
// 				// 				console.log(module);
// 				// 			}
// 				// 		});
// 				// 	});
// 				// });
// 			});
// 		}
// 	}
// );

// User.updateMany({ 'course.title': '80 Solo Techniques in 4 Weeks' }, { course: courses.courses[0] }, function(err) {
// 	if (err) {
// 		console.log(err);
// 	} else {
// 		console.log('updated the course');
// 	}
// });

app.get('/403', function(req, res) {
	res.render('403', {
		title: '403 Error - Access Forbidden'
	});
});

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
