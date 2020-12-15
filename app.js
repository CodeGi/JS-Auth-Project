require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");



const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

 // trust first proxy
app.use(session({//Create a session
  secret: 'Our little secret. ',//Create a secret key within the session
  resave: false,//
  saveUninitialized: true
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB' ,{useUnifiedTopology: true , useNewUrlParser: true});
mongoose.set("useCreateIndex" , true);
//TODO


const userSchema = new mongoose.Schema({
  email: String ,
  password: String
});

userSchema.plugin(passportLocalMongoose); //it will hash and salt and save our users

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/" , function(req, res){

res.render("home");

});

app.get("/login" , function(req, res){

res.render("login");

});



app.get("/register" , function(req, res){

res.render("register");

});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get("/secrets" , function(req , res){
  if(req.isAuthenticated()){
    res.render("secrets")
  } else{
    res.redirect("/login");
  }
});

app.post("/register" , function(req, res){
User.register({username: req.body.username}, req.body.password , function(err , user){//this comes from passport local package, it allows us to not need to create mongoose new user and save user manually. Saves us time.
if(err){
  console.log(err);
  res.redirect("/register");
}else{
  passport.authenticate("local")(req, res, function(){
    res.redirect("/secrets")
  })
}

});
});

app.post("/login" , function(req, res){
const user = new User({
  username:req.body.username ,
  password: req.body.password
  });

//we use a login function formula that passport doc gave us
req.login(user, function(err){//we pass in new user above can call back of error if unable to find the said user.
if(err){
  console.log(err);
      res.redirect("/login");
}else{
  passport.authenticate("local")(req, res, function(){
    res.redirect("/secrets")
  })
    }


        });
});





app.listen(3000, function() {
  console.log("Server started on port 3000");
});
