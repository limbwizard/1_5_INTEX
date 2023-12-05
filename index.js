// let express = require("express");

// let app = express();

// app.get("/", (req, res) => res.send("this is the server response to the client request"));

// app.listen(3000, () => console.log("the server is listening for a client"));

const express = require("express");
let app = express();
const port = process.env.PORT || 3000;
app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");

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