
let express = require("express");
let app = express();
let path = require("path");

const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.urlencoded({extended: true}));

const knex = require("knex")({
    client: "pg",
    connection: {
    host: process.env.RDS_HOSTNAME || "localhost",
    user: process.env.RDS_USERNAME || "intex",
    password: process.env.RDS_PASSWORD || "intexroot15",
    database: process.env.RDS_DB_NAME || "MentalHealthSM",
    port: process.env.RDS_PORT || 5432,
    ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
    }
});

app.listen(port, () => console.log("Server listening."));

app.use(express.static(path.join(__dirname, 'views')));

app.get('/', (req, res) => {
    res.sendFile('/views/index.html', {root: __dirname});
});

app.get('/surveyData', (req, res) => {
    knex.select().from("main").then(main => {
        //draw an HTML form back on the browser
        //we want to display a view; the HTML page
        //this calls the HTML file we are going to make somewhere
        //create new variable myCountry and pass a variable from the database table; called country
        res.render("displaySurveyData.ejs", {surveyData : main});
    })
});