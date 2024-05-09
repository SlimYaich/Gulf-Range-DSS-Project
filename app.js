// Filename - App.js
const {countAccountMoveEntries , countTotalPartners , calculateSalesRevenue , calculateTotalOrders } = require('./services');



const express = require("express"),
	mongoose = require("mongoose"),
	passport = require("passport"),
	bodyParser = require("body-parser"),
	LocalStrategy = require("passport-local"),
	passportLocalMongoose = 
		require("passport-local-mongoose")
    path = require('path');  
const User = require("./model/User");
let app = express();

mongoose.connect("mongodb://localhost:27017/27017");

app.set('views', path.join(__dirname, 'views'));  // path.join for clarity
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/assets'));

app.use(require("express-session")({
	secret: "Rusty is a dog",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//=====================
// ROUTES
//=====================

function isLoggedIn(req, res, next) {
  // Check if user is logged in (e.g., check session or cookie)
  if (req.session.user) { // Replace 'req.session.user' with your logic
    next(); // Allow access if logged in
  } else {
    res.redirect("/login"); // Redirect to login if not logged in
  }
}

// Showing secret page
app.get("/index", isLoggedIn, function (req, res) {
  res.render("index", { username: req.session.user.username });
});


//Showing login form
app.get("/login", function (req, res) {
	res.render("login");
});






//Handling user login
app.post("/login", async function(req, res) {
  try {
      // Check if the user exists
      const user = await User.findOne({ username: req.body.username });
      if (user) {
        // Check if password matches
        const result = req.body.password === user.password;
        if (result) {
          // Login successful, set session variable and include the username
          req.session.user = { username: user.username };
          res.render("index", { username: user.username }); // Pass username to the index view
        } else {
          res.status(400).json({ error: "Password doesn't match" });
        }
      } else {
        res.status(400).json({ error: "User doesn't exist" });
      }
    } catch (error) {
      res.status(400).json({ error });
    }
});

// **New Route for DSS.ejs**
app.get("/dss", function(req, res) {
	res.render("DSS"); // DSS.ejs exists in  views folder
  });

  // **New Route for KPIS.ejs**
app.get("/kpis", function(req, res) {
	res.render("KPIS"); // KPIS.ejs exists in  views folder
  }); 

    // **New Route for recommndation.ejs**
app.get("/recommndation", function(req, res) {
	res.render("recommndation"); // recommndation.ejs exists in  views folder
  }); 

     // **New Route for  entercode.ejs**
app.get("/", function(req, res) {
	res.render("entercode"); // entercode.ejs exists in  views folder
  });  
  
  
  


   // **New Route for  Expectatons.ejs**
app.get("/expectatons", function(req, res) {
	res.render("Expectatons"); // Expectatons.ejs exists in  views folder
  });  
  

  

  
  
  
  




  
   // **New Route for  elkhalijiyah.ejs**
app.get("/elkhalijiyah", async function(req, res) {
    try {
        
        // Call the function to count the number of entries in account.move
        const accountMoveCount = await countAccountMoveEntries();
        
        // Call the function to count the total number of partners
        const partnerCount = await countTotalPartners();
		
		
        // Call the function to count the total amounts of validated orders
		const SalesRevenueCount = await calculateSalesRevenue();
		
		
		// Call the function to calculate the total number of orders placed by customers
		const TotalOrdersCount = await calculateTotalOrders();
		
		
		
		
		
		
		
        
        // To render the 'elkhalijiyah' page with the two counters
        res.render("elkhalijiyah", { accountMoveCount, partnerCount , SalesRevenueCount , TotalOrdersCount  });
    } catch (error) {
        // Error handling
        console.error('Failed to retrieve data:', error);
        res.status(500).send("Error fetching data");
    }
});












//Handling user logout 
app.get("/logout", function (req, res) {
	req.logout(function(err) {
		if (err) { return next(err); }
		res.redirect('/');
	});
});

let port = process.env.PORT || 3088;
app.listen(port, function () {
	console.log("Server Has Started!");
});
