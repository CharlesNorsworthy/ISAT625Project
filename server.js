// References:
/// https://github.com/ckorpio/classEx1/blob/main/exercise1.js
/// https://github.com/ckorpio/MongoRender/blob/main/testmongo.js

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const fs = require("fs");
const { MongoClient } = require("mongodb");
const mongoUri = 'mongodb+srv://' + process.env.USERNAME + ':' + process.env.PASSWORD +
    '@cluster0.jt7yc3y.mongodb.net/?retryWrites=true&w=majority';

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

app.post('/login', async function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    let user = await getUser(username, password);
    if (user === null) {
        // TODO: say username doesn't exist or password is incorrect
        res.send('no');
    } else {
        // TODO: redirect to user's personal account, send cookie
        res.send('yes');
    }
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

app.post('/signup', function(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    const password2 = req.body.password2;

    if(password !== password2) {
        // TODO: send back html with fields filled in
    }

    // TODO: redirect to user's personal account

    res.send({

    });
});

app.get('/account', function(req, res) {

    // TODO: see if the user is logged in via cookies, then get the account info

    fs.readFile('html/account.html', 'utf8', (err, data)=> {
        console.log('Reading html/account.html')
        if(err) {
            res.send('An error occurred: ' + err);
        }
        res.send(data);
    })
});

async function getUser(username, password) {
    // https://www.mongodb.com/blog/post/quick-start-nodejs-mongodb-how-to-get-connected-to-your-database
    const client = new MongoClient(mongoUri);
    let returnUser = null;
    try {
        const database = client.db('isat_twitter');
        const parts = database.collection('users');
        const query = { 'username': username };

        // see if this username + password combination exists
        const user = await parts.findOne(query);
        if(user !== null) {
            // the user exists
            let correctPass = user.password;
            if(password === correctPass) {
                returnUser = user;
            }
        }
    } catch(error) {
        console.log(error);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
    return returnUser;
}