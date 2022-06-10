require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
// Authentication
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static(__dirname + "/public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "This is my first web application.",
    resave: false,
    saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/memeUserDB");

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res){
    res.render("home");
});

app.get("/register", function(req, res){
    res.render("register")
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/play", function(req, res){
    if (req.isAuthenticated()){
        res.render("play");
    } else {
        res.redirect("/login");
    }
});

// Register route
app.post("/register", function(req, res){
    const newUser = new User({
        firstName: req.body.fname,
        lastName: req.body.lname,
        username: req.body.username
    });

    User.register(newUser, req.body.password, function(err, user) {
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                console.log("User has been registerd.");
                console.log(user);
                res.redirect("/play")
            });
        }
    });
});

// Login route
app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/play");
            });
        }
    });
});



app.listen(3000, function(req, res){
    console.log("Server is running on port 3000.")
})
