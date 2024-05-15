const express = require("express");
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require("mongoose");
const passport = require("passport");
const bodyParser = require("body-parser");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const path = require('path');
const User = require("./model/User");
const { getTotalSalesAndPassengers } = require('./services');

let app = express();

// Connection to MongoDB
mongoose.connect("mongodb://localhost:27017/27017");

// Setting up view engine
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/assets'));
app.use(require("express-session")({
    secret: "Rusty is a dog",
    resave: false,
    saveUninitialized: false
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Creating HTTP server and attaching socket.io
const server = http.createServer(app);
const io = socketIo(server);

const getCurrentDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

let globalSocket = null;



const showLoader = () => {
    if (globalSocket) {
        globalSocket.emit('showLoader');
    }
};

const hideLoader = () => {
    if (globalSocket) {
        globalSocket.emit('hideLoader');
    }
};

io.on('connection', (socket) => {
    console.log('New client connected');
    globalSocket = socket;

    socket.on('pageLoad', (page) => {
        if (page === 'elkhalijiyah') {
            showLoader();  // Show the loader when the page loads
            // Obtenir les données pour la date actuelle par défaut
            const today = getCurrentDate();
            getTotalSalesAndPassengers(socket, today, today);
        }
    });

    socket.on('dateRangeChange', (data) => {
        showLoader();  // Show the loader when the date range is changed
        const { startDate, endDate } = data;
        console.log(`Date range selected: ${startDate} to ${endDate}`);
        getTotalSalesAndPassengers(socket, startDate, endDate);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        globalSocket = null;
    });
});

// Routes
function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/login");
    }
}

app.get("/index", isLoggedIn, function (req, res) {
    res.render("index", { username: req.session.user.username });
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.post("/login", async function(req, res) {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && req.body.password === user.password) {
            req.session.user = { username: user.username };
            res.render("index", { username: user.username });
        } else {
            res.status(400).json({ error: "Incorrect credentials" });
        }
    } catch (error) {
        res.status(400).json({ error });
    }
});

// New Route for DSS.ejs
app.get("/dss", function(req, res) {
    res.render("DSS"); // DSS.ejs exists in views folder
});

// New Route for KPIS.ejs
app.get("/kpis", function(req, res) {
    res.render("KPIS"); // KPIS.ejs exists in views folder
});

// New Route for recommndation.ejs
app.get("/recommndation", function(req, res) {
    res.render("recommndation"); // recommndation.ejs exists in views folder
});

// New Route for entercode.ejs
app.get("/", function(req, res) {
    res.render("entercode"); // entercode.ejs exists in views folder
});

// New Route for Expectatons.ejs
app.get("/expectatons", function(req, res) {
    res.render("Expectatons"); // Expectatons.ejs exists in views folder
});

// Route for elkhalijiyah.ejs
app.get("/elkhalijiyah", isLoggedIn, function(req, res) {
    res.render("elkhalijiyah"); // elkhalijiyah.ejs exists in views folder
});

app.get("/logout", function (req, res) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Start server
let port = process.env.PORT || 3088;
server.listen(port, function () {
    console.log("Server Has Started!");
});
