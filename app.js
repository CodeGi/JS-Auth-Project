require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//passport js requirements
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate")
//google-FB login requirements
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook")

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
  password: String,
  googleId:String ,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose); //it will hash and salt and save our users
userSchema.plugin(findOrCreate);//find google account or create a new account by asking user to logging into their google account if not found in database in mongodb

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});//should work for both google and facebook.



//user new window for Google login
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



//User new window for facebook login
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/Secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/" , function(req, res){

res.render("home");

});



app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });




//APP.GET for facebook

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/Secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
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
User.find({"secret": {$ne: null}}, function(err, foundUsers) {
  if(err){
    console.log(err);
  }else{
    if(foundUsers){
      res.render("secrets" , {userSubmittedSecrets: foundUsers});
    }
  }
})
});

app.get('/submit', function(req, res){
  if(req.isAuthenticated()){
    res.render("submit")
  } else{
    res.redirect("/login");
  }
});


app.post("/submit" , function(req, res){
const newSecret = req.body.secret;
    User.findById(req.user.id , function(err , foundUser){
      if(err){
        console.log(err)
      }else{
        if(foundUser){
          foundUser.secret = newSecret;
          console.log(foundUser)
          console.log(foundUser.secret)
          console.log(req.user.id)
          console.log(req.user)
          foundUser.save(function(){
            res.redirect("/secrets")
          })
        }
      }
    })
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
