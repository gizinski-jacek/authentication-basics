const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcryptjs = require('bcryptjs');

const mongoDb =
	'mongodb+srv://MAIN:GcNrNANs3X5Nbr3@cluster0.rkvi8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongo connection error'));

const User = mongoose.model(
	'User',
	new Schema({
		username: { type: String, required: true },
		password: { type: String, required: true },
	})
);

const app = express();
app.set('views', __dirname);
app.set('view engine', 'ejs');

passport.use(
	new LocalStrategy((username, password, done) => {
		User.findOne({ username: username }, (err, user) => {
			if (err) {
				return done(err);
			}
			if (!user) {
				return done(null, false, { message: 'Incorrect username' });
			}
			if (
				bcryptjs.compare(password, user.password, (err, res) => {
					if (res) {
						// passwords match! log user in
						return done(null, user);
					} else {
						// passwords do not match!
						return done(null, false, {
							message: 'Incorrect password',
						});
					}
				})
			) {
				return done(null, false, { message: 'Incorrect password' });
			}
			return done(null, user);
		});
	})
);

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	User.findById(id, (err, user) => {
		done(err, user);
	});
});

app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
	res.locals.currentUser = req.user;
	next();
});

app.get('/', (req, res) => {
	res.render('index', { user: req.user });
});

app.get('/sign-up', (req, res) => res.render('sign_up_form'));

app.post('/sign-up', (req, res, next) => {
	const user = new User({
		username: req.body.username,
		password: req.body.password,
	});
	bcryptjs.hash(req.body.password, 10, (err, hashedPassword) => {
		if (err) {
			return next(err);
		}
		user.password = hashedPassword;
		user.save((err) => {
			if (err) {
				return next(err);
			}
			res.redirect('/');
		});
	});
});

app.get('/log-out', (req, res) => {
	req.logout();
	res.redirect('/');
});

app.post(
	'/log-in',
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/',
	})
);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error', { title: 'Oops... There was an error.' });
});

module.exports = app;
