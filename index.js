// NPM PACKAGES
const express = require('express');
const bodyParser = require('body-parser');
const passport = require("passport");
const session = require("express-session");
const cookieParser = require('cookie-parser');
const async = require('async');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
const {Strategy: LocalStrategy} = require("passport-local");
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');

//INITIALIZE EXPRESS
const app = express();

//PORT
const PORT = 3000;

//SALT ROUNDS
const saltRounds = 10;

//DB CONTROLLER
const mongoose = require('./controllers/mongodb.js');

//PASSPORT CONTROLLER
const auth = require('./controllers/passport.js')

// NODEMAILER CONTROLLER
const transporter = require('./controllers/nodemailer.js');

// SCHEMA
const User = require('./models/user.js');

// INITIALIZING OTHER NPM PACKAGES
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'userisinthebuilding',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 15,
      },
    store: MongoStore.create({
        mongoUrl: "mongodb://" + process.env.LOCATION + ":27017/" + process.env.DB_NAME,
        ttl: 60 * 30
    })
}));
app.use(passport.initialize());
app.use(passport.authenticate('session'));
app.use(flash());
app.use(function(req, res, next) {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// INITIALIZING CONTROLLERS

app.use('/', auth);

// LOGIC

// SITE PAGES

app.get('/', (req,res) => {
    res.render('site/index')
})

app.get('/about', (req,res) => {
    res.render('site/about')
})

app.get('/service', (req,res) => {
    res.render('site/service')
})

app.get('/team', (req,res) => {
    res.render('site/team')
})

app.get('/why', (req,res) => {
    res.render('site/why')
})

// HOME ROUTES
app.get('/home', async (req, res) => {
    if(req.isAuthenticated()){
        let user = await User.findOne({_id:req.user._id.toString()});
        res.render('home', {
            title:'Home',
            state: user.isVerified,
            alerts: req.flash()
        })
    } else {
        req.flash('error', 'Please Log In or Create An Account To Continue')
        res.redirect('/login')
    }
});

//REGISTER ROUTES
app.get('/register', async(req,res)=>{
    res.render('register', {
        title: "Register"
    })
});

app.post("/register", async function (req, res) {
    
    const username = req.body.username;
    const identifier = req.body.identifier;
    const password = req.body.password;
    
    try{
        const existingUser = await User.findOne({username:username});
        if(existingUser){
            req.flash('error', 'Email Account Already Exists');
            res.redirect('/register')
        } else {
            const hash = await bcrypt.hash(password, saltRounds);
            
            let user = new User({
                username: username,
                identifier: identifier,
                password: hash
            })

            const results = await user.save();
            if(results){
                req.login(user, (err)=>{
                    req.flash("error", "Please finish setting up your KYC for effective service")
                    res.redirect('/home')
                })
            }
        }
    }catch(err){
        console.log(err)
    }
}); 

// LOGIN ROUTES

app.get('/login', async(req,res)=>{
    res.render('login',{
        user:req.user, 
        alerts: req.flash(), 
        title:'Login'
    })
})

app.post("/login",
    passport.authenticate("local", { 
        failureRedirect: "/login", 
    }), (req,res)=>{
        req.flash('success', "Welcome Back. Pick Up Where You Left Off");
        res.redirect("/home");  
    }
);

// LOGOUT ROUTE

app.post('/logout', (req, res, next)=>{
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success', "See you next time.");
        res.redirect('/login');
    });
});

// FORGOT ROUTES

app.get('/forgot', (req, res)=>{
    if(req.isAuthenticated()){
        res.redirect("/home");
    } else {
        res.render("forgot", {
            user: req.user,
            token: req.params.token,
            alerts:req.flash(),
            title: 'Forgot Password'
        });
    }
});

app.post('/forgot', async (req, res, next) => {
    try {
        // Step 1: Generate a random token
        const token = (await crypto.randomBytes(20)).toString('hex');

        // Step 2: Find the user by username
        const user = await User.findOne({ username: req.body.forgot });

        if (!user) {
            req.flash('error', "That Account doesn't exist. Try Again");
            return res.redirect("/forgot");
        }

        // Step 3: Set the reset token and expiry time on the user
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration

        await user.save();

        // Step 4: Send reset email
        const reset_url = `http://${req.headers.host}/reset/${token}`;
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: user.username,
            subject: "RESET YOUR PASSWORD.",
            text: `Your request for a password reset has been received.\n\n` +
                `If you requested to change your password, please click on the following link within one hour-\n\n${reset_url}\n\n` +
                `If you did not seek to change your password, you can ignore this email.`
        };
        

        await transporter.sendMail(mailOptions);

        req.flash('success', "A link has been sent to your email with a reset token.");
        return res.redirect('/forgot')
    } catch (err) {
        req.flash('error', 'An error has occurred. Please try again');
        return next(err);
    }
});

// RESET ROUTES

app.get('/reset/:token', async (req, res) => {
    let user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now()}})
    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/login');
    }
    res.render('reset', {
        user: req.user,
        token: req.params.token,
        alerts:req.flash(),
        title: 'Reset Password'
    });
});

app.post('/reset/:token', async (req, res) => {

    // Find the user with the reset token that is still valid
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    try {

        if (!user) {
            req.flash('error', 'This token is invalid or has expired. Try Again');
            return res.redirect('/forgot');
        }

        // Check if the passwords match
        if (req.body.newPassword === req.body.confirm) {

            const newHash = await bcrypt.hash(req.body.newPassword, saltRounds);
            // Set the new password
            user.password = newHash;

            // Clear the reset token and expiration
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            // Save the user with the new password
            await user.save();

            // Log the user in

            req.login(user, function(err) {
                if (err) { return next(err); }
                req.flash('success', 'Your Password has been changed successfully. Welcome Back.');
                res.redirect('/home');
            });
            try {
                const successMail = {
                    to: user.username,
                    from: process.env.AUTH_EMAIL,
                    subject: "YOUR PASSWORD HAS BEEN CHANGED",
                    text: 'Hello,\n\n' +
                        'This is a confirmation that the password for your account ' + user.username + ' has just been changed.\n'
                };
                await transporter.sendMail(successMail);
            } catch (mailError) {
                console.error('Error sending email:', mailError);
            }
            return res.redirect('/dashboard');
        } else {
            req.flash('error', "Passwords Don't Match. Try Again");
            return res.redirect('/reset/' + req.params.token);
        }
    } catch (err) {
        req.flash('error', 'An error occurred. Please try again later.');
        return res.redirect('/login');
    }

    // Send a success email after password reset (not in the waterfall)
    
});


app.listen(PORT || 3000, () => {
    console.log(`Server started on ${PORT}`)
})

