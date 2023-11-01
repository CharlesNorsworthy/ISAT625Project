// References:
/// https://github.com/ckorpio/classEx1/blob/main/exercise1.js

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const fs = require("fs");

app.listen(port);
console.log('Server started at http://localhost:' + port);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', function(req, res) {
    fs.readFile('html/login.html', 'utf8', (err, data)=> {
        console.log('Reading html/login.html')
        if(err) {
            res.send('An error occurred: ' + err);
        }
        res.send(data);
    })
});

app.get('/style.css', function(req, res) {
    fs.readFile('html/style.css', 'utf8', (err, data)=> {
        console.log('Reading html/style.css')
        if(err) {
            res.send('An error occurred: ' + err);
        }
        res.send(data);
    })
});

app.get('/signup', function(req, res) {
    fs.readFile('html/signup.html', 'utf8', (err, data)=> {
        console.log('Reading html/signup.html')
        if(err) {
            res.send('An error occurred: ' + err);
        }
        res.send(data);
    })
});
