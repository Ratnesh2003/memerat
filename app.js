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

mongoose.connect("mongodb://localhost:27017/memeUserDB");

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

app.get("/login", function (req, res) {
    res.render("login");
});


var d = new Date();
//d.setDate(d.getDate() + 3);
var contestDate = d.toLocaleDateString('en-GB');
console.log(contestDate);

//Contest page model define.
const contestSchema = new mongoose.Schema({
    username: String,
    firstName: String,
    lastName: String,
    [contestDate]: {
        choice: Number,
        votes: { type: Number, default: 0 },
        captionOrUsername: String,
        votedUsername: String
    }
});

const Contest = new mongoose.model("Contest", contestSchema);


//Vote page get request
let captions = [];
app.get("/vote", async (req, res) => {
    if (req.isAuthenticated()) {

        const checkUsername = req.user.username;
        const currentUsername = await Contest.findOne({ username: checkUsername });

        if(!currentUsername) {

            const newContest = new Contest({
                username: req.user.username,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                [contestDate]: { choice: 2, votes: 0, votedUsername: "" }
            });
            newContest.save();

            captions = [];

            const Docs = await Contest.find({ [contestDate]: { $exists: true }, "[contestDate].choice": 1 }, { [contestDate]: { captionOrUsername: 1 }, _id: 0, username: 1 });
            const lengthOfDocs = Docs.length;
            
    
            for (let i = 0; i < lengthOfDocs; i++) {
                const checkCurrentDate = await Contest.find(
                    { [contestDate]: { $exists: true }, choice: 1 },
                    { [contestDate]: { captionOrUsername: 1 }, _id: 0, username: 1 }
                );
                var singleCaption = checkCurrentDate[i][contestDate].captionOrUsername;
                var thisCaption = {
                    usr: checkCurrentDate[i].username,
                    cpt: checkCurrentDate[i][contestDate].captionOrUsername
                }
    
                if (singleCaption != undefined) {
                    captions.push(thisCaption);
                }
            }

            res.render("vote", {allCaptions: captions});
            console.log(captions);
            
        } else {
            var currentChoice = currentUsername[contestDate].choice;
            if(currentChoice == 1){
                res.send("You have already given the caption today.")
            }
            if(currentChoice == 2){
                captions = [];

                const Docs = await Contest.find({ [contestDate]: { $exists: true }, "[contestDate].choice": 1 }, { [contestDate]: { captionOrUsername: 1 }, _id: 0, username: 1 });
                const lengthOfDocs = Docs.length;
                
        
                for (let i = 0; i < lengthOfDocs; i++) {
                    const checkCurrentDate = await Contest.find(
                        { [contestDate]: { $exists: true }, choice: 1 },
                        { [contestDate]: { captionOrUsername: 1 }, _id: 0, username: 1 }
                    );
                    var singleCaption = checkCurrentDate[i][contestDate].captionOrUsername;
                    var thisCaption = {
                        usr: checkCurrentDate[i].username,
                        cpt: checkCurrentDate[i][contestDate].captionOrUsername
                    }
        
                    if (singleCaption != undefined) {
                        captions.push(thisCaption);
                    }
                }

                res.render("vote", {allCaptions: captions});
                console.log(captions);
                
            }
            if(currentChoice == 3){
                res.send("You have already voted today.")
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
        const currentUsername = await Contest.findOne({ username: checkUsername });
        if (!currentUsername) {

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
            var currentChoice = currentUsername[contestDate].choice;
            if(currentChoice == 1) {
                res.send("You have already given the caption.");
            }
            if(currentChoice == 2) {
                res.send("You have chosen to vote other caption, you can't view this page.");
            }
            if(currentChoice == 3) {
                res.send("You have already voted today.")
            }

        }
        


    } else {
        res.redirect("/login");
    }
});

app.get("/play", async (req, res) => {
    if (req.isAuthenticated()) {

        const checkUsername = req.user.username;
        const currentUsername = await Contest.findOne({ username: checkUsername });

        if(!currentUsername){
            res.render("playWithWarning");

        } else {
            res.render("play");
            // const currentChoice = currentUsername[contestDate].choice;
            // if(currentChoice == 1){
            //     res.send("You have already captioned the image. You can't view this page now.")
            // }
            // if(currentChoice == 2){
            //     res.render
            // }
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
            [contestDate]: { choice: 1, votes: 0, captionOrUsername: req.body.captionsub }
        });
        newContest.save();
        res.send("Added caption sucessfully.");
    } else {
        const checkCurrentDate = await Contest.findOne({ username: checkUsername, [contestDate]: { $exists: true } });
        console.log(checkCurrentDate);
        if (!checkCurrentDate) {
            Contest.updateOne(
                { username: req.user.username },
                { [contestDate]: { choice: 1, votes: 0, captionOrUsername: req.body.captionsub } }, function (err, cont) {
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
    const votedUser = captions[parseInt(req.body.captionID)].usr
    console.log(votingUser);
    console.log(votedUser);

    //Updating details of voting user.

    const checkUsername = req.user.username;
    const currentUsername = await Contest.findOne({ username: checkUsername });

    if (!currentUsername) {
        const newContest = new Contest({
            username: req.user.username,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            [contestDate]: { choice: 3, votes: 0, votedUsername: votedUser }
        });
        newContest.save();
        console.log("Changed value of voting user successfully.")
    } else {
        Contest.updateOne(
            { username: votingUser },
            { [contestDate]: { choice: 3, votes: 0, votedUsername: votedUser } }, function (err, cont) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Changed value of voting user successfully.");
                }
            }
        )

    }


    //Getting current votes of the voteduser.
    const beingVotedUser = await Contest.findOne({ username: votedUser });
    var currentVotes = beingVotedUser[contestDate].votes;
    const caption = beingVotedUser[contestDate].captionOrUsername;
    currentVotes++;
    console.log(currentVotes);

    //Updating votes    
    Contest.updateOne(
        { username: votedUser },
        { [contestDate]: { choice: 1, votes: currentVotes, captionOrUsername: caption } }, function (err, cont) {
            if (err) {
                console.log(err);
            } else {
                console.log("Votes updated successfully.")
            }
        }
    );
})


app.listen(3000, function (req, res) {
    console.log("Server is running on port 3000.")
})
