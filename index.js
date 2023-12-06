const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
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

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await knex("users").where({ username }).first();
        if (user && (await bcrypt.compare(password, user.password))) {
            req.session.userId = user.id;
            res.json({ success: true, message: "Login successful" });
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

app.post("/submitSurvey", async (req, res) => {
    const formData = req.body;
    const platformNames = formData["socialMediaPlatforms[]"] || [];
    const affiliationName = formData.affiliatedOrganizations;

    try {
        await knex.transaction(async (trx) => {
            const [respondentId] = await trx("respondent")
                .insert({
                    timestamp: new Date().toLocaleString("en-US", {
                        timeZone: "America/Denver",
                    }),
                    age: formData.age,
                    gender: formData.gender,
                    relationship_status: formData.relationshipStatus,
                    occupation_status: formData.occupationStatus,
                    avg_daily_sm_time: formData.avgDailySmTime,
                    sm_no_purpose: formData.smNoPurpose,
                    sm_distraction_when_busy: formData.smDistractionWhenBusy,
                    sm_restless_not_using: formData.smRestlessNotUsing,
                    distracted_easily: formData.distractedEasily,
                    bothered_by_worries: formData.botheredByWorries,
                    difficulty_concentrating: formData.difficultyConcentrating,
                    sm_compare_to_successful: formData.smCompareToSuccessful,
                    feel_about_compares: formData.feelAboutCompares,
                    sm_validation_from_features:
                        formData.smValidationFromFeatures,
                    depressed_frequency: formData.depressedFrequency,
                    interest_fluctuation: formData.interestFluctuation,
                    sleep_issues: formData.sleepIssues,
                    location: "Provo",
                })
                .returning("id");

            let affiliationId = null;
            if (affiliationName) {
                const affiliation = await trx("organizationaffiliation")
                    .select("affiliation_id")
                    .where("affiliation_name", affiliationName)
                    .first();
                affiliationId = affiliation ? affiliation.affiliation_id : null;
            }

            if (platformNames.length > 0) {
                for (const platformName of platformNames) {
                    const platform = await trx("socialmediaplatforms")
                        .select("platform_id")
                        .where("platform_name", platformName)
                        .first();

                    if (platform) {
                        await trx("main").insert({
                            respondent_id: respondentId,
                            platform_id: platform.platform_id,
                            affiliation_id: affiliationId,
                        });
                    }
                }
            } else {
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
        res.status(500).send("Failed to submit survey data.");
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

app.listen(port, () => console.log(`Server listening on port ${port}.`));
