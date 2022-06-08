const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");

const app = express();

app.use(express.static(__dirname + "/public"));
app.set('view engine', 'ejs')

app.get("/", function(req, res){
    res.render(__dirname + "/views/home.ejs");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/login", function(req, res){
    res.render("login");
})

app.listen(3000, function(req, res){
    console.log("Server is running on port 3000.")
})
