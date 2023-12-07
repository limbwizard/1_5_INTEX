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

app.listen(port, () => console.log(`Server listening on port ${port}.`));
