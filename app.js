require("dotenv").config(); ////environment variables
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
////////1
app.use(
  session({
    secret: "Our Little Secret.",
    resave: false,
    saveUninitialized: true,
  })
);
/////////2
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://Davinci:davinci99@cluster0.xeqwe86.mongodb.net/Secret", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});
/////////3
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

/////////4
passport.use(User.createStrategy());

passport.serializeUser(async function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(async function () {
    return cb(null, user);
  });
});

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//////auth passport
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        /////install find or create mongosse npm for findOrCreate
        return cb(err, user);
      });
    }
  )
);

app.get("/", async function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", async function (req, res) {
  res.render("login");
});

app.get("/register", async function (req, res) {
  res.render("register");
});

app.get("/secrets", async function (req, res) {
  try {
    const foundUsers = await User.find({ secret: { $ne: null } }).exec();
    if (foundUsers) {
      res.render("secrets", { usersWithSecrets: foundUsers });
    }
  } catch (err) {
    console.log(err);
  }
});

/////get the submit for secrets
app.get("/submit", async function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

//////post the secret
app.post("/submit", async function (req, res) {
  const submitNewSecret = req.body.secret;
  console.log(req.user.id);

  try {
    const foundUser = await User.findById(req.user.id);
    if (foundUser) {
      foundUser.secret = submitNewSecret;
      await foundUser.save();
      res.redirect("/secrets");
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/logout", async function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.post("/register", async function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    async function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, async function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

///login route
app.post("/login", async function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, async function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(3000, function () {
  console.log("server started on port 3000");
});
