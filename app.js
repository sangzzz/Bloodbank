require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const bodyParser = require("body-parser");

const app = express();

const locations = ["New York", "Illinois", "Texas", "California", "Florida"];
const admins = ["sangeeth@mail.com", "jaks@mail.com"];
// let isProfileComplete;
let x = "";
let numDonors = 0;
let registerUserName = "";
let registerPassword = "";
let isAdmin = false;
let loggedInUser = {
  username: "",
  password: "",
  USERTYPE: "",
  FULLNAME: {
    FNAME: "",
    LNAME: "",
  },
  DOB: "",
  BLOOD_TYPE: "",
  COUNTRY: "",
  isProfileComplete: false,
  isCampApplied: false,
  isPatientProfile: false,
  isHospitalApplied: false,
  hosp_no: 0,
};

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  "mongodb+srv://Sangeeth:1245780*@cluster0-9z6vo.mongodb.net/BloodBank",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  USERTYPE: String,
  FULLNAME: {
    FNAME: String,
    LNAME: String,
  },
  DOB: Date,
  BLOOD_TYPE: String,
  COUNTRY: String,
  isProfileComplete: Number,
});

const donorSchema = new mongoose.Schema({
  EMAIL: String,
  PASSWORD: String,
  DNAME: {
    FNAME: String,
    LNAME: String,
  },
  DOB: Date,
  BLOOD_TYPE: String,
  COUNTRY: String,
  CAMP: {
    CAMP_ID: String,
    CAMP_LOCATION: String,
  },
  isCampApplied: Boolean,
});

const patientSchema = new mongoose.Schema({
  EMAIL: String,
  PASSWORD: String,
  PNAME: {
    FNAME: String,
    LNAME: String,
  },
  DOB: Date,
  BLOOD_TYPE: String,
  COUNTRY: String,
  URGENCY: String,
  DATE_OF_REQUEST: Date,
  isPatientProfile: Boolean,
  isHospitalApplied: Boolean,
  HOSPITAL: {
    HOSPITAL_ID: String,
    HOSPITAL_NAME: String,
  },
});

const campSchema = new mongoose.Schema({
  CAMP_ID: String,
  LOCATION: String,
  CAMP_DATE: Date,
  NUM_OF_DONORS: Number,
});

const sponsorSchema = new mongoose.Schema({
  SPONSOR_NAME: String,
  EMAIL: String,
  AMOUNT: Number,
  HOSPITAL: {
    HOSPITAL_ID: String,
    HOSPITAL_NAME: String,
  },
});

const hospitalSchema = new mongoose.Schema({
  HOSPITAL_ID: String,
  HOSPITAL_NAME: String,
  LOCATION: String,
  NUM_OF_PATIENTS: Number,
});

const bloodBankSchema = new mongoose.Schema({
  TYPE: String,
  UNITS: Number,
});

function GetFormattedDate(todayTime) {
  // var todayTime = new Date();
  var month = todayTime.getMonth() + 1;
  var day = todayTime.getDate();
  var year = todayTime.getFullYear();
  return day + " / " + month + " / " + year;
}

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Donor = new mongoose.model("Donor", donorSchema);
const Patient = new mongoose.model("Patient", patientSchema);
const Camp = new mongoose.model("Camp", campSchema);
const Hospital = new mongoose.model("Hospital", hospitalSchema);
const Sponsor = new mongoose.model("Sponsor", sponsorSchema);

passport.use(User.createStrategy()); //This strategy is then referred as 'local' strategy
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Home Route
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("Loggedin");
  } else {
    res.render("Home");
  }
});

// Login Route
app.get("/login", (req, res) => {
  res.render("Login");
});

app.post("/login", (req, res) => {
  const newUser = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(newUser, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, () => {
        x = "login";
        registerPassword = req.body.password;
        registerUserName = req.body.username;
        if (registerUserName === admins[0] || registerUserName === admins[1]) {
          isAdmin = true;
        } else {
          isAdmin = false;
        }
        res.redirect("/loggedin");
      });
    }
  });
});

// Register Route
app.get("/register", (req, res) => {
  res.render("Register");
});

app.post("/register", (req, res) => {
  if (req.body.password === req.body.confirmpassword) {
    User.register(
      { username: req.body.username },
      req.body.password,
      (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, () => {
            loggedInUser.isProfileComplete = false;
            res.redirect("/profile");
            [registerUserName, registerPassword] = [
              req.body.username,
              req.body.password,
            ];
          });
        }
      }
    );
  }
});
// Profile Route
app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    if (!loggedInUser.isProfileComplete) {
      // console.log(registerPassword, registerUserName);
      res.render("Profile");
      x = "register";
      loggedInUser.isProfileComplete = true;
    } else {
      // console.log(loggedInUser);
      res.render("viewprofile", {
        usertype: _.capitalize(loggedInUser.USERTYPE),
        username: loggedInUser.username,
        fname: _.capitalize(loggedInUser.FULLNAME.FNAME),
        lname: loggedInUser.FULLNAME.LNAME,
        dob: loggedInUser.DOB.toDateString(),
        blood_type: loggedInUser.BLOOD_TYPE,
        location: loggedInUser.COUNTRY,
      });
    }
  } else {
    res.redirect("/login");
  }
});

// profile route
app.get("/loggedin", (req, res) => {
  if (req.isAuthenticated()) {
    User.findOne({ username: registerUserName }, (err, user) => {
      if (!err) {
        // console.log(user);
        loggedInUser.username = registerUserName;
        loggedInUser.password = registerPassword;
        loggedInUser.USERTYPE = user.USERTYPE;
        loggedInUser.FULLNAME.FNAME = user.FULLNAME.FNAME;
        loggedInUser.FULLNAME.LNAME = user.FULLNAME.LNAME;
        loggedInUser.DOB = user.DOB;
        loggedInUser.BLOOD_TYPE = user.BLOOD_TYPE;
        loggedInUser.COUNTRY = user.COUNTRY;
        loggedInUser.isProfileComplete = user.isProfileComplete;
        res.render("LoggedIn", {
          usertype: loggedInUser.USERTYPE,
          admin: isAdmin,
        });
      } else {
        console.log(err);
      }
      // console.log(loggedInUser);
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/loggedin", (req, res) => {
  if (req.isAuthenticated()) {
    if (x === "register") {
      loggedInUser.username = registerUserName;
      loggedInUser.password = registerPassword;
      loggedInUser.USERTYPE = req.body.usertype;
      loggedInUser.FULLNAME.FNAME = req.body.fname;
      loggedInUser.FULLNAME.LNAME = req.body.lname;
      loggedInUser.DOB = req.body.dob;
      loggedInUser.BLOOD_TYPE = req.body.bloodtype;
      loggedInUser.COUNTRY = req.body.country;
      User.findOneAndUpdate(
        { username: registerUserName },
        {
          USERTYPE: loggedInUser.USERTYPE,
          FULLNAME: {
            FNAME: loggedInUser.FULLNAME.FNAME,
            LNAME: loggedInUser.FULLNAME.LNAME,
          },
          DOB: loggedInUser.DOB,
          BLOOD_TYPE: loggedInUser.BLOOD_TYPE,
          COUNTRY: loggedInUser.COUNTRY,
          isProfileComplete: true,
        },
        (err) => {
          if (err) {
            console.log(err);
          }
        }
      );
      if (loggedInUser.USERTYPE === "patient") {
        const newPatient = new Patient({
          EMAIL: registerUserName,
          PASSWORD: registerPassword,
          PNAME: {
            FNAME: req.body.fname,
            LNAME: req.body.lname,
          },
          DOB: req.body.dob,
          BLOOD_TYPE: req.body.bloodtype,
          COUNTRY: req.body.country,
          isPatientProfile: false,
          isHospitalApplied: false,
        });
        newPatient.save();
      } else if (loggedInUser.USERTYPE === "donor") {
        const newDonor = new Donor({
          EMAIL: registerUserName,
          PASSWORD: registerPassword,
          DNAME: {
            FNAME: req.body.fname,
            LNAME: req.body.lname,
          },
          DOB: req.body.dob,
          BLOOD_TYPE: req.body.bloodtype,
          COUNTRY: req.body.country,
          isCampApplied: false,
        });
        newDonor.save();
      }
      res.redirect("/loggedin");
    }
  } else {
    console.log("Something went wrong with registration!");
    res.redirect("/");
  }
});

// viewprofile route
app.get("/viewprofile", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("viewprofile");
  } else {
    // alert("Authentication Failed!!");
    res.redirect("/");
  }
});

// Camps route
app.get("/camps", (req, res) => {
  if (req.isAuthenticated()) {
    Donor.findOne({ EMAIL: loggedInUser.username }, (err, donor) => {
      loggedInUser.isCampApplied = donor.isCampApplied;
    });
    Camp.find({ LOCATION: loggedInUser.COUNTRY }, (err, camps) => {
      res.render("Camp", {
        usertype: loggedInUser.USERTYPE,
        camps: camps,
        apply: loggedInUser.isCampApplied,
      });
    });
  } else {
    // alert("Authentication Failed!!");
    res.redirect("/");
  }
});

app.post("/camps", (req, res) => {
  Camp.updateOne(
    { CAMP_ID: req.body.camp_no },
    { $set: { $inc: { NUM_OF_DONORS: 1 } } },
    { overwrite: true, timestamps: false }
  );
  Donor.findOneAndUpdate(
    { EMAIL: loggedInUser.username },
    { isCampApplied: true },
    (err) => {
      if (err) {
        console.log(err);
      }
    }
  );
  Camp.find({ LOCATION: loggedInUser.COUNTRY }, (err, camps) => {
    Donor.findOneAndUpdate(
      { EMAIL: loggedInUser.username },
      {
        CAMP: {
          CAMP_ID: req.body.camp_no,
        },
      },
      (err) => {
        if (err) console.log(err);
      }
    );
  });
  res.redirect("/camps");
});

// Hospitals Route
app.get("/hospitals", (req, res) => {
  if (req.isAuthenticated()) {
    Patient.findOne({ EMAIL: loggedInUser.username }, (err, patient) => {
      loggedInUser.isPatientProfile = patient.isPatientProfile;
      loggedInUser.isHospitalApplied = patient.isHospitalApplied;
      loggedInUser.hosp_no = patient.HOSPITAL.HOSPITAL_ID;
    });
    Hospital.find({ LOCATION: loggedInUser.COUNTRY }, (err, hospitals) => {
      res.render("Hospital", {
        usertype: loggedInUser.USERTYPE,
        hospitals: hospitals,
        isProfile: loggedInUser.isPatientProfile,
        apply: loggedInUser.isHospitalApplied,
      });
    });
  } else {
    res.redirect("/");
  }
});

app.post("/hospitals", (req, res) => {
  if (!loggedInUser.isPatientProfile) {
    var datee = new Date().toDateString();
    Patient.findOneAndUpdate(
      { EMAIL: loggedInUser.username },
      {
        isPatientProfile: true,
        URGENCY: req.body.urgency,
        DATE_OF_REQUEST: datee,
      },
      (err) => {
        if (err) {
          console.log(err);
        }
      }
    );
  } else {
    Patient.findOneAndUpdate(
      { EMAIL: loggedInUser.username },
      { isHospitalApplied: true },
      (err) => {
        if (err) {
          console.log(err);
        }
      }
    );

    Hospital.find({ LOCATION: loggedInUser.COUNTRY }, (err, hospitals) => {
      Patient.findOneAndUpdate(
        { EMAIL: loggedInUser.username },
        {
          HOSPITAL: {
            HOSPITAL_ID: req.body.hosp_no,
          },
        },
        (err) => {
          if (err) console.log(err);
        }
      );
    });
  }
  // var post = Camp.findOne({ CAMP_ID: req.body.camp_no });
  // Camp.findOneAndUpdate(
  //   { CAMP_ID: req.body.camp_no },
  //   { $inc: { "post.NUM_OF_DONORS": 1 } },
  //   (err) => {
  //     if (err) {
  //       console.log(err);
  //     }
  //   }
  // );
  res.redirect("/hospitals");
});

// Waiting List
app.get("/waitinglist", (req, res) => {
  if (req.isAuthenticated()) {
    Patient.find(
      { HOSPITAL: { HOSPITAL_ID: loggedInUser.hosp_no } },
      (err, patients) => {
        patients.sort((p1, p2) => {
          return p1.URGENCY - p2.URGENCY;
        });
        res.render("Waitinglist", {
          patients: patients,
          apply: loggedInUser.isHospitalApplied,
          isProfile: loggedInUser.isPatientProfile,
          usertype: "patient",
          auth: true,
        });
      }
    );
  } else {
    Patient.find({}, (err, patients) => {
      patients.sort((p1, p2) => {
        return p1.URGENCY - p2.URGENCY;
      });
      res.render("Waitinglist", {
        patients: patients,
        apply: true,
        isProfile: true,
        usertype: "patient",
        auth: false,
      });
    });
  }
});

// Sponsor route
app.get("/sponsor", (req, res) => {
  res.render("Donate");
});

app.post("/sponsor", (req, res) => {
  const newSponsor = new Sponsor({
    SPONSOR_NAME: req.body.name,
    EMAIL: req.body.email,
    AMOUNT: req.body.amount,
    HOSPITAL: {
      HOSPITAL_ID: req.body.hospital,
    },
  });
  newSponsor.save();
  res.redirect("/");
});

// logout route
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.get("/addcamp", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("Addcamp");
  } else {
    res.redirect("/");
  }
});

app.post("/addcamp", (req, res) => {
  if (req.isAuthenticated()) {
    console.log(req.body);

    const newCamp = new Camp({
      CAMP_ID: req.body.campid,
      CAMP_DATE: req.body.campdate,
      LOCATION: req.body.location,
      NUM_OF_DONORS: req.body.no,
    });
    newCamp.save();
    res.redirect("/loggedin");
  } else {
    console.log("Error!");
  }
});
app.get("/addhospital", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("Addhospital");
  } else {
    res.redirect("/");
  }
});

app.post("/addhospital", (req, res) => {
  if (req.isAuthenticated()) {
    const newHospital = new Hospital({
      HOSPITAL_ID: req.body.hospid,
      HOSPITAL_NAME: req.body.hospname,
      NUM_OF_PATIENTS: req.body.no,
      LOCATION: req.body.location,
    });

    newHospital.save((err) => {
      if (err) {
        console.log("Error!");
      }
    });
    res.redirect("/loggedin");
  } else {
    console.log("Error!");
  }
});
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, () => console.log("Server is running in port 3000"));
// app.listen(3000);
