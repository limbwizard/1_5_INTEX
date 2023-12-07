const express = require("express");
const app = express();
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

// Survey page
app.get("/survey", (req, res) => {
    res.render("survey"); // Render the 'survey.ejs' view
});

app.post("/submitSurvey", (req, res) => {
     knex("ebdb").insert({
                    timestamp: moment(new Date()).format("M/D/YYYY HH:mm:ss"),
                    age: req.body.age,
                    gender: req.body.gender,
                    relationship_status: req.body.relationship_status,
                    occupation_status: req.body.occupation_status,
                    use_sm: req.body.use_sm,
                    socialMediaPlatforms: req.body.socialMediaPlatforms,
                    avg_daily_sm_time: req.body.avg_daily_sm_time,
                    sm_no_purpose: req.body.sm_no_purpose,
                    sm_distracted_when_busy: req.body.sm_distracted_when_busy,
                    sm_restless_not_using:
                        req.body.sm_restless_not_using,
                    distracted_easily: req.body.distracted_easily,
                    bothered_by_worries: req.body.bothered_by_worries,
                    difficulty_concentrating: req.body.difficulty_concentrating,
                    sm_compare_to_successful: req.body.sm_compare_to_successful,
                    feel_about_compares: req.body.feel_about_compares,
                    sm_validation_from_features: req.body.sm_validation_from_features,
                    depressed_frequency: req.body.depressed_frequency,
                    interest_fluctuation: req.body.interest_fluctuation,
                    sleep_issues: req.body.sleep_issues,
                    location: "Provo",
     }).then(mySurvey => {res.redirect("/")});
}); //Inserts new data from survey

// Middleware to protect routes
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect("/login"); // Redirect to the login page if not authenticated
}

app.get("/loggedin", isAuthenticated, (req, res) => {
    res.render("loggedin"); // Render the 'loggedin.ejs' view
});

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login"); // Redirect to login page after logout
    });
});

app.post("/submitSurvey", async (req, res) => {
    const formData = req.body;

    try {
        const response = await knex.transaction(async (trx) => {
            const respondentData = {
                timestamp: moment().format("M/D/YYYY HH:mm:ss"),
                ...formData,
                location: "Provo",
            };

            const [respondentId] = await trx("respondent")
                .insert(respondentData)
                .returning("respondent_id");
            const affiliationId = formData.affiliatedOrganizations
                ? await getAffiliationId(trx, formData.affiliatedOrganizations)
                : null;
            const platformIds = await getPlatformIds(
                trx,
                formData["socialMediaPlatforms[]"] || []
            );
            const mainEntries = platformIds.map((platformId) => ({
                respondent_id: respondentId,
                platform_id: platformId,
                affiliation_id: affiliationId,
            }));

            if (mainEntries.length) {
                await trx("main").insert(mainEntries);
            } else {
                await trx("main").insert({
                    respondent_id: respondentId,
                    affiliation_id: affiliationId,
                });
            }

            return "Survey data submitted successfully!";
        });

        res.status(200).send(response);
    } catch (error) {
        console.error("Transaction failed:", error);
        res.status(500).send("Failed to submit survey data. Please try again.");
    }
});

async function getAffiliationId(trx, affiliationId) {
    // Validate that affiliationId is a number
    const id = parseInt(affiliationId, 10);
    return !isNaN(id) ? id : null;
}

async function getPlatformIds(trx, platformIds) {
    // Validate each ID and parse it to an integer
    return platformIds.reduce((validIds, id) => {
        const parsedId = parseInt(id, 10);
        if (!isNaN(parsedId)) {
            validIds.push(parsedId);
        }
        return validIds;
    }, []);
}


app.post('/createUser', isAuthenticated, async (req, res) => {
    const { username, password } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        await knex('users').insert({
            username,
            password: hashedPassword
        });

        res.redirect('/accountmanage'); // Redirect to the account management page or to a success message
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).send('Error creating user');
    }
});

app.post('/updateUser', isAuthenticated, async (req, res) => {
    const { username, newPassword } = req.body;

    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        await knex('users')
              .where({ username })
              .update({
                  password: hashedPassword
              });

        res.redirect('/accountmanage'); // Redirect to account management page or a success message
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).send('Error updating user');
    }
});

app.post('/deleteUser', isAuthenticated, async (req, res) => {
    const { username } = req.body;

    try {
        // Delete the user from the database
        await knex('users')
              .where({ username })
              .del();

        res.redirect('/accountmanage'); // Redirect to the account management page or a success message
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).send('Error deleting user');
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

//login check
app.get("/login", (req, res) => {
    res.render("accountManage");
});

app.listen(port, () => console.log(`Server listening on port ${port}.`));