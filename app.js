const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

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

app.get('/login', function(req, res) {
	res.render('login');
});

app.get('/notice', function(req, res) {
	res.render('notice');
});

app.get('/register', function(req, res) {
	res.render('register');
});

app.get('/testimonial', function(req, res) {
	res.render('testimonial');
});

app.listen('3000', function() {
	console.log('Server is running at port 3000!');
});
