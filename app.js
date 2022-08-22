require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const https = require("https");
// Authentication
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const { stringify } = require('querystring');





const app = express();

app.use(express.static(__dirname + "/public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "This is my first web application.",
    resave: false,
    saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/memeUserDBTest");

const userSchema = new mongoose.Schema({

    id: {
        type: String,
        default: null,
    },
    username: {
        type: String,
        required: [true, "Email required"],
        unique: [true, "Email already registered"],
    },
    firstName: String,
    lastName: String,
    profilePhoto: String,
    password: String,
    source: { type: String, required: [true, "source not specified"] },
    lastVisited: { type: Date, default: new Date() }

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)


const User = new mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username, name: user.displayName });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/play",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},

    async (request, accessToken, refreshToken, profile, done) => {
        const id = profile.id;
        const username = profile.emails[0].value;
        const firstName = profile.name.givenName;
        const lastName = profile.name.familyName;
        const profilePhoto = profile.photos[0].value;
        const source = "google";




        const currentUser = await User.findOne({ username });
        console.log(currentUser);

        if (!currentUser) {

            const newUser = new User({
                id, username, firstName, lastName, profilePhoto, source: "google"
            });
            console.log(newUser);

            newUser.save()
            return done(null, newUser);
        }

        if (currentUser.source != "google") {
            //return error
            return done(null, false, { message: `You have previously signed up with a different signin method` });
        }

        currentUser.lastVisited = new Date();
        return done(null, currentUser);
    }
));


app.get("/", function (req, res) {
    res.render("home");
});

app.get("/register", function (req, res) {
    res.render("register")
});

app.get("/login", async (req, res) => {

    let Docs = [];
    var allDocs = await Contest.find().lean();
    allDocs.forEach(elem1 => {
        elem1.contests.forEach(elem2 => {
            if (elem2.date == contestDate && elem2.choice == 1) {
                console.log(elem2.captionOrUsername);
            }
        })
    });
    res.render("login");
});


var d = new Date();
//d.setDate(d.getDate() + 1);
var contestDate = d.toLocaleDateString('en-GB');
console.log(contestDate);

//Contest page model define.
const contestSchema = new mongoose.Schema({
    username: String,
    firstName: String,
    lastName: String,
    contests: [{
        date: String,
        choice: Number,
        votes: { type: Number, default: 0 },
        captionOrUsername: String,
        votedUsername: String
    }]
});

const Contest = new mongoose.model("Contest", contestSchema);


//Vote page get request
let captions = [];
var thisCaption = {};
app.get("/vote", async (req, res) => {
    if (req.isAuthenticated()) {

        const checkUsername = req.user.username;
        const currentUsername = await Contest.findOne({ username: checkUsername, });

        if (!currentUsername) {
            console.log("CURRENT USER DOES NOT EXIST");

            const newContest = new Contest({
                username: req.user.username,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                contests: [{ date: contestDate, choice: 2, votes: 0, votedUsername: "" }]
            });
            newContest.save();
            captions = [];
            var allDocs = await Contest.find().lean();
            allDocs.forEach(elem1 => {
                elem1.contests.forEach(elem2 => {
                    if (elem2.date == contestDate && elem2.choice == 1) {
                        thisCaption = {
                            usr: elem1.username,
                            cpt: elem2.captionOrUsername
                        }

                        captions.push(thisCaption);
                        thisCaption = {};
                    }
                })
                
            });
            res.render("vote", { allCaptions: captions });
            console.log("Captions: ", captions);

        } else {
            var currentChoice = -1;
            const checkCurrentDate = await Contest.findOne({ username: checkUsername });
            thisDate = checkCurrentDate.contests.at(-1).date;
            if (thisDate == contestDate) {
                currentChoice = checkCurrentDate.contests.at(-1).choice;
            }

            if (currentChoice == 1) {
                console.log("CURRENT CHOICE 1");
                res.send("You have already given the caption today.")
            }
            else if (currentChoice == 2) {
                console.log("CURRENT CHOICE 2");
                captions = [];
                //var i = 0;

                var allDocs = await Contest.find().lean();
                allDocs.forEach(elem1 => {
                    elem1.contests.forEach(elem2 => {
                        if (elem2.date == contestDate && elem2.choice == 1) {
                            console.log(elem1.username)
                            console.log(elem2.captionOrUsername)
                            thisCaption = {
                                usr: elem1.username,
                                cpt: elem2.captionOrUsername
                            }

                            captions.push(thisCaption);
                            thisCaption = {};
                        }
                    })
                });


                res.render("vote", { allCaptions: captions });
                console.log("Captions in 2nd choice: ", captions);
            }
            else if (currentChoice == 3) {
                console.log("CURRENT CHOICE 3");
                res.send("You have already voted today.")
            } else {
                console.log("THIS ONE");
                captions = [];
                var allDocs = await Contest.find().lean();
                allDocs.forEach(elem1 => {
                    elem1.contests.forEach(elem2 => {
                        if (elem2.date == contestDate && elem2.choice == 1) {
                            thisCaption = {
                                usr: elem1.username,
                                cpt: elem2.captionOrUsername
                            }
                        }
                    })
                    captions.push(thisCaption);
                    thisCaption = {};
                });


                const checkCurrentDate = await Contest.findOne({ username: checkUsername });
                const thisDate = checkCurrentDate.contests.at(-1).date;
                if (thisDate != contestDate) {
                    var updateContest = { $push: { contests: [{ date: contestDate, choice: 2, votes: 0, votedUser: "" }] } };
                    Contest.updateOne(
                        { username: req.user.username },
                        updateContest, function (err, cont) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("Updated items: ", cont);
                                res.render("vote", { allCaptions: captions });
                            }
                        }
                    );
                } else {
                    res.render("vote", { allCaptions: captions });
                }


            }
        }
    } else {
        res.redirect("/login");
    }
});

//Caption the image page and routes
app.get("/caption", async (req, res) => {
    if (req.isAuthenticated()) {


        const checkUsername = req.user.username;
        const checkCurrentDate = await Contest.findOne({ username: checkUsername });
        console.log("checkCurrentDate in app.get: ", checkCurrentDate);
        let thisDate;
        if(checkCurrentDate){
            thisDate = checkCurrentDate.contests.at(-1).date;
        } else{
            thisDate = -2;
        }
        



        if (thisDate != contestDate) {

            // res.render("caption", {imagevar: "https://indianmemetemplates.com/wp-content/uploads/all-the-things.jpg"})


            https.get("https://alpha-meme-maker.herokuapp.com/", function (response) {
                let chunks = [];

                response.on("data", function (data) {
                    chunks.push(data);
                }).on("end", function () {
                    let data = Buffer.concat(chunks);
                    const memeData = JSON.parse(data)
                    const imageLink = memeData.data[19].image;
                    console.log(imageLink);
                    res.render("caption", { imagevar: imageLink });
                })

            })

        } else {
            var currentChoice = checkCurrentDate.contests.at(-1).choice;
            if (currentChoice == 1) {
                res.send("You have already given the caption.");
            }
            if (currentChoice == 2) {
                res.send("You have chosen to vote other caption, you can't view this page.");
            }
            if (currentChoice == 3) {
                res.send("You have already voted today.")
            }
        }
    } else {
        res.redirect("/login");
    }
});


//Leaaderboard GET request
app.get("/leaderboard", async (req, res) => {

    if (req.isAuthenticated()) {
        const lastD = d;
        lastD.setDate(lastD.getDate() - 8);
        var lastDate = lastD.toLocaleDateString('en-GB');
        console.log(lastDate);

        const findDoc = Contest.findOne({
            [lastDate]: { choice: 3, votes: { $exists: true }, captionOrUsername: { $exists: true } }
        }, function (err, result) {
            if (result) {
                console.log(result[lastDate]);
            } else {
                console.log(err);
            }
        });
    } else {
        res.redirect("/login");
    }


})



app.get("/play", async (req, res) => {
    if (req.isAuthenticated()) {

        const checkUsername = req.user.username;
        const currentUsername = await Contest.findOne({ username: checkUsername });
        try {
            const checkPage = currentUsername.contests.at(-1).date;

            console.log("THIS ONE LINE");
            console.log(currentUsername);
            console.log(checkPage);

            if (checkPage != contestDate) {
                res.render("playWithWarning");

            } else {
                res.render("play");
            }
        }
        catch {
            res.render("playWithWarning");

        }



    } else {
        res.redirect("/login");
    }
});

app.get("/auth/google",
    passport.authenticate("google", {
        scope:
            ["email", "profile"]
    }
    ));

app.get("/auth/google/play",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        res.redirect("/play");
    });

// Register route
app.post("/register", function (req, res) {
    const newUser = new User({
        firstName: req.body.fname,
        lastName: req.body.lname,
        username: req.body.username,
        source: "local"
    });

    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
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

//Post request on Caption page
app.post("/caption", async (req, res) => {

    const checkUsername = req.user.username;
    const currentUsername = await Contest.findOne({ username: checkUsername });

    //checking if the user has already submittd the caption.
    if (!currentUsername) {
        const newContest = new Contest({
            username: req.user.username,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            contests: [{ date: contestDate, choice: 1, votes: 0, captionOrUsername: req.body.captionsub }]
            
        });
        newContest.save();
        res.send("Added caption sucessfully.");
    } else {
        
        const checkCurrentDate = await Contest.findOne({ username: checkUsername });
        const thisDate = checkCurrentDate.contests.at(-1).date;
        console.log(thisDate);
        if (thisDate != contestDate) {
            var updateContest = { $push: { contests: [{ date: contestDate, choice: 1, votes: 0, captionOrUsername: req.body.captionsub }] } };
            Contest.updateOne(
                { username: req.user.username },
                updateContest, function (err, cont) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Updated items: ", cont);
                        res.send("Added caption successfully.")
                    }
                }
            );


        } else {
            res.send("You have already submitted today's caption.")
        }


    }
});


//POST request on Vote page
app.post("/vote", async (req, res) => {
    const votingUser = req.user.username;
    const votedUser = captions[parseInt(req.body.captionID)].usr;
    console.log("votingUser: ", votingUser);
    console.log("votedUser: ", votedUser);

    //Updating details of voting user.

    const checkUsername = req.user.username;
    const currentUsername = await Contest.findOne({ username: checkUsername });
    console.log("currentUsername in VOTE POST: \n", currentUsername);

    //Updating details of votingUser
    Contest.updateOne({username: votingUser}, { contests: {date: contestDate, choice: 3, votes: 0, votedUsername: votedUser}}, function(err, doc){
        if (err) {
            console.log(err);
        } else {
            console.log("Details of votingUser updated. \n", doc);
        }
    });

    // Getting initial votes of the votedUser and assigning to new variables

    const beingVotedUser = await Contest.findOne({ username: votedUser });
    let currentVotes = beingVotedUser.contests.at(-1).votes;
    console.log("Initial votes: ", currentVotes);
    const currentCaption = beingVotedUser.contests.at(-1).captionOrUsername;
    console.log("Initial votes: ", currentCaption);
    let previousVotes = currentVotes;
    currentVotes++;

    // Removing previousVotes value

    let popVotesQuery = { $pop: { contests: 1}};
    Contest.updateOne(
        { username: votedUser },
        popVotesQuery, function(err, cont) {
            if (err) {
                console.log(err);
            } else {
                console.log("Popped previous details now");
            }
        }
    )

    // Adding newVote value

    let addVoteQuery = { $push: { contests: [{ date: contestDate, choice: 1, votes: currentVotes, captionOrUsername: currentCaption }]} };
    Contest.updateOne(
        { username: votedUser },
        addVoteQuery, function (err, cont) {
            if (err) {
                console.log(err);
            } else {
                console.log("Added new voting values");
            }
        }
    )
    res.send("Voted successsfully.")
})


app.listen(3000, function (req, res) {
    console.log("Server is running on port 3000.")
})
