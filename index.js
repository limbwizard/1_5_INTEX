/*
    Group 1-5
    Patrick Nieves, Isaac Limb, Ken Hall, Sydney Dawson

    index.js page for node.js operations
*/

//declare libraries to use and other connection settings
const express = require("express");
const app = express();
const moment = require("moment");
const path = require("path");

const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "views")));

const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "localhost",
        user: process.env.RDS_USERNAME || "intex",
        password: process.env.RDS_PASSWORD || "intexroot15",
        database: process.env.RDS_DB_NAME || "ebdb",
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
    },
});

//Retrieve Survey page
app.get("/survey", (req, res) => {
    res.render("survey"); // Render the 'survey.ejs' view
});

//Submit filled out survey to database
app.post("/submitSurvey", (req, res) => {
    knex("respondent")
        .insert({
            timestamp:"2", //moment(new Date()).format("M/D/YYYY HH:mm:ss"),
            age: req.body.age
            // gender: req.body.gender.value,
            // relationship_status: req.body.relationship_status.value,
            // occupation_status: req.body.occupation_status.value,
            // use_sm: req.body.use_sm.value,
            // avg_daily_sm_time: req.body.avg_daily_sm_time.value,
            // sm_no_purpose: req.body.sm_no_purpose.value,
            // sm_distracted_when_busy: req.body.sm_distracted_when_busy.value,
            // sm_restless_not_using: req.body.sm_restless_not_using.value,
            // distracted_easily: req.body.distracted_easily.value,
            // bothered_by_worries: req.body.bothered_by_worries.value,
            // difficulty_concentrating: req.body.difficulty_concentrating.value,
            // sm_compare_to_successful: req.body.sm_compare_to_successful.value,
            // feel_about_compares: req.body.feel_about_compares.value,
            // sm_validation_from_features: req.body.sm_validation_from_features.value,
            // depressed_frequency: req.body.depressed_frequency.value,
            // interest_fluctuation: req.body.interest_fluctuation.value,
            // sleep_issues: req.body.sleep_issues.value,
            // location: "Provo"
                    })
        // .then(mySurvey => {
        //     // After inserting into respondent table, perform another knex query
        //     return knex("socialmediaplatforms").insert({
        //         socialMediaPlatforms: req.body.socialMediaPlatforms.value
        //     });
        // })
        // .then(mySurvey2 => {
        //     // Do something with the data from another_table
        //     return knex("organizationaffiliation").insert({
        //         affiliation_id: req.body.affiliation_id.value
        //     });
        // })
        .then(mySurvey3=> {
            res.redirect("/index.html");
        })
        .catch(error => {
            console.error(error);
            res.status(500).send("Internal Server Error");
        });
});

//declare app methods
//retrieve the home page
app.get("/", (req, res) => {
    res.sendFile("/views/index.html", { root: __dirname });
});

//retrieve the data page
app.get("/surveyData", (req, res) => {
    knex.select()
        .from("main")
        .leftJoin(
            "organizationaffiliation",
            "main.affiliation_id",
            "organizationaffiliation.affiliation_id"
        )
        .leftJoin(
            "respondent",
            "main.respondent_id",
            "respondent.respondent_id"
        )
        .leftJoin(
            "socialmediaplatforms",
            "main.platform_id",
            "socialmediaplatforms.platform_id"
        )
        .then((result) => {
            res.render("displaySurveyData", { surveyData: result });
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send("Source Code Error");
        });
});

//retrieve only one specified record
app.get("/singleRecord", (req, res) => {
    knex.select()
        .from("main")
        .leftJoin(
            "organizationaffiliation",
            "main.affiliation_id",
            "organizationaffiliation.affiliation_id"
        )
        .leftJoin(
            "respondent",
            "main.respondent_id",
            "respondent.respondent_id"
        )
        .leftJoin(
            "socialmediaplatforms",
            "main.platform_id",
            "socialmediaplatforms.platform_id"
        )
        .where("main_id", req.query.singleRecord)
        .then((result) => {
            res.render("displaySingleRecord", { surveyData: result });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ err });
        });
});

//login process to check database for credentials
app.get("/login", (req, res) => {
    knex.select()
        .from("users")
        .where("username", req.query.username)
        .where("password", req.query.password)
        .then((result) => {
            if (result.length > 0) {
                res.render("accountManage");
            }
            else {
                res.redirect("/loginpage.html");
                alert("Incorrect username/password.");
            }
        })
});

//add user to database
app.post("/createUser", (req, res) => {
    knex("users")
        .insert({username: req.body.username, password: req.body.password})
        .then(result => {
            res.render("accountManage");
        });
});

//update user information in database
app.post("/updateUser", (req, res) => {
    knex("users")
        .where("username", req.body.username).update({
            username: req.body.username,
            password: req.body.newPassword
        })
        .then(result => {
            res.render("accountManage");
        });
})

//report server working on specified port in console
app.listen(port, () => console.log(`Server listening on port ${port}.`));