let express = require("express");

let app = express();

app.get("/", (req, res) => res.send("this is the server response to the client request"));

app.listen(3000, () => console.log("the server is listening for a client"));

