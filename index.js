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
     knex("respondent").insert({
                    timestamp: "2" /*moment(new Date()).format("M/D/YYYY HH:mm:ss")*/,
                    age: req.body.age,
                    // gender: req.body.gender,
                    // relationship_status: req.body.relationship_status,
                    // occupation_status: req.body.occupation_status,
                    // use_sm: req.body.use_sm,
                    // //socialMediaPlatforms: req.body.socialMediaPlatforms,
                    // avg_daily_sm_time: req.body.avg_daily_sm_time,
                    // sm_no_purpose: req.body.sm_no_purpose,
                    // sm_distracted_when_busy: req.body.sm_distracted_when_busy,
                    // sm_restless_not_using:
                    //     req.body.sm_restless_not_using,
                    // distracted_easily: req.body.distracted_easily,
                    // bothered_by_worries: req.body.bothered_by_worries,
                    // difficulty_concentrating: req.body.difficulty_concentrating,
                    // sm_compare_to_successful: req.body.sm_compare_to_successful,
                    // feel_about_compares: req.body.feel_about_compares,
                    // sm_validation_from_features: req.body.sm_validation_from_features,
                    // depressed_frequency: req.body.depressed_frequency,
                    // interest_fluctuation: req.body.interest_fluctuation,
                    // sleep_issues: req.body.sleep_issues,
                    // location: "Provo"
     }).then(mySurvey => {res.redirect("/index.html")});
}); //Inserts new data from survey

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