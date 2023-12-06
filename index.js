const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const moment = require("moment");
const app = express();
const path = require("path");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        secret: "your-secret-key",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: !process.env.DEVELOPMENT },
    })
);

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

const port = process.env.PORT || 3000;

// Login route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await knex("users").where({ username }).first();
        if (user && (await bcrypt.compare(password, user.password))) {
            // Set the user ID in the session to indicate they are logged in
            req.session.userId = user.id;
            res.redirect("/protected-page"); // Redirect to the protected page after login
        } else {
            res.status(401).json({
                success: false,
                message: "Invalid username or password",
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("An error occurred during login.");
    }
});

// Middleware to protect routes
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect("/login"); // Redirect to the login page if not authenticated
}

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login"); // Redirect to login page after logout
    });
});

app.post("/submitSurvey", async (req, res) => {
    const formData = req.body;

    try {
        await knex.transaction(async (trx) => {
            // Insert data into 'respondent' table
            const [respondentId] = await trx("respondent")
                .insert({
                    timestamp: moment(new Date()).format("M/D/YYYY HH:mm:ss"),
                    age: formData.age,
                    gender: formData.gender,
                    relationship_status: formData.relationshipStatus,
                    occupation_status: formData.occupationStatus,
                    use_sm: formData.useSocialMedia,
                    avg_daily_sm_time: formData.averageTimeOnSocialMedia,
                    sm_no_purpose: formData.purposelessSocialMediaUse,
                    sm_distracted_when_busy: formData.distractionBySocialMedia,
                    sm_restless_not_using:
                        formData.restlessnessWithoutSocialMedia,
                    distracted_easily: formData.easeOfDistraction,
                    bothered_by_worries: formData.botheredByWorries,
                    difficulty_concentrating: formData.difficultyConcentrating,
                    sm_compare_to_successful: formData.socialMediaComparisons,
                    feel_about_compares: formData.feelingsAboutComparisons,
                    sm_validation_from_features: formData.validationSeeking,
                    depressed_frequency: formData.feelingsOfDepression,
                    interest_fluctuation: formData.interestFluctuation,
                    sleep_issues: formData.sleepIssues,
                    location: "Provo",
                })
                .returning("respondent_id");

            // Handle organization affiliation if provided
            let affiliationId = null;
            if (formData.affiliatedOrganizations) {
                const affiliationRecord = await trx("organizationaffiliation")
                    .where({
                        affiliation_name: formData.affiliatedOrganizations,
                    })
                    .first();

                affiliationId = affiliationRecord
                    ? affiliationRecord.affiliation_id
                    : null;
            }

            // Insert data into 'main' table with social media platforms
            const platformNames = formData["socialMediaPlatforms[]"] || [];
            if (platformNames.length > 0) {
                for (const platformName of platformNames) {
                    const platformRecord = await trx("socialmediaplatforms")
                        .where({ platform_name: platformName })
                        .first();

                    if (platformRecord) {
                        await trx("main").insert({
                            respondent_id: respondentId,
                            platform_id: platformRecord.platform_id,
                            affiliation_id: affiliationId,
                        });
                    }
                }
            } else {
                // Even if no platforms are provided, insert a record into 'main'
                await trx("main").insert({
                    respondent_id: respondentId,
                    platform_id: null,
                    affiliation_id: affiliationId,
                });
            }

            await trx.commit();
            res.status(200).send("Survey data submitted successfully!");
        });
    } catch (error) {
        console.error("Transaction failed:", error);
        res.status(500).send("Failed to submit survey data. Please try again.");
    }
});

app.get("/", (req, res) => {
    res.sendFile("/views/index.html", { root: __dirname });
});

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

app.get("/singleRecord"), (req, res) => {
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
        res.render("displaySurveyData", { surveyData: result });
    })
    .catch((error) => {
        console.error(error);
        res.status(500).send("Source Code Error");
    });
}

app.listen(port, () => console.log(`Server listening on port ${port}.`));
