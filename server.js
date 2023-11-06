// References:
/// https://github.com/ckorpio/classEx1/blob/main/exercise1.js
/// https://github.com/ckorpio/MongoRender/blob/main/testmongo.js
/// https://www.tutorialspoint.com/http-cookies-in-node-js
/// https://www.npmjs.com/package/node-html-parser
/// https://www.geeksforgeeks.org/use-ejs-as-template-engine-in-node-js/

const express = require('express');
const bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');
const app = express();
const port = 3000;
const fs = require('fs');
const { MongoClient } = require('mongodb');
const NodeHtmlParser = require('node-html-parser');
const mongoUri = 'mongodb+srv://' + process.env.USERNAME + ':' + process.env.PASSWORD +
    '@cluster0.jt7yc3y.mongodb.net/?retryWrites=true&w=majority';

app.listen(port);
console.log('Server started at http://localhost:' + port);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');

app.get('/login', function(req, res) {
    const fileString = readFileSync('./views/html/login.html');
    if(fileString === null) {
        res.status(500).send('Internal Server Error.');
    } else {
        res.status(200).send(fileString);
    }
});

app.post('/login', async function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    let user = await getUser(username, password);
    if (user === null) {
        const fileString = readFileSync('./views/html/login.html');
        let html = NodeHtmlParser.parse(fileString);
        html.getElementById('instructions').set_content(
            'The username does not exist or the password is incorrect.');
        res.status(401).send(html.toString());
    } else {
        res.cookie("userData", user);
        res.status(200).render('account', user);
    }
});

app.get('/style.css', function(req, res) {
    res.send(readFileAsync('./views/html/style.css'));
});

app.get('/signup', function(req, res) {
    const fileString = readFileSync('./views/html/signup.html');
    if(fileString === null) {
        res.status(500).send('Internal Server Error.');
    } else {
        res.status(200).send(fileString);
    }
});

app.post('/signup', async function(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    const password2 = req.body.password2;

    if(password !== password2) {
        const fileString = readFileSync('./views/html/signup.html');
        let html = NodeHtmlParser.parse(fileString);
        html.getElementById('username').set_content(username);
        html.getElementById('instructions').set_content('The passwords do not match.');
        res.status(401).send(html.toString());
    }
    let user = { username: username, password: password, subscriptions: [] }
    let result = await createUser(user);
    if(result === 'User created.') {
        res.render('account', user);
    } else {
        const fileString = readFileSync('./views/html/signup.html');
        let html = NodeHtmlParser.parse(fileString);
        html.getElementById('instructions').set_content(result);
        res.status(401).send(html.toString());
    }
});

app.get('/account', async function (req, res) {
    let cookieUser = req.cookies;
    const username = cookieUser.username;
    const password = cookieUser.password;
    let user = await getUser(username, password);
    if (user === null) {
        const fileString = readFileSync('./views/html/login.html');
        let html = NodeHtmlParser.parse(fileString);
        html.getElementById('instructions').set_content('Please login.');
        res.status(401).send(html.toString());
    } else {
        res.render('account', user);
    }
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
        console.error(error);
    } finally {
        await client.close();
    }
    return returnUser;
}

async function createUser(newUser) {
    // https://www.mongodb.com/languages/mongodb-with-nodejs
    const client = new MongoClient(mongoUri);
    try {
        const database = client.db('isat_twitter');
        const parts = database.collection('users');
        username = newUser.username
        const query = { 'username': username };
        // see if this username exists
        const user = await parts.findOne(query);
        if(user === null) {
            // the user does not exist
            await parts.insertOne(newUser);
        } else {
            return 'The user already exists. Please choose a different username.';
        }
    } catch(error) {
        console.error(error);
        return 'Internal Server Error';
    } finally {
        await client.close();
    }
    return 'User created.';
}

function readFileSync(filepath) {
    let fileString = null;
    console.log('Reading ' + filepath);
    try {
        fileString = fs.readFileSync(filepath, 'utf8');
    } catch(error) {
        console.error(error);
    }
    return fileString;
}

async function readFileAsync(filepath) {
    let fileString = null;
    fs.readFile(filepath, 'utf8', (err, data)=> {
        console.log('Reading ' + filepath);
        if(err) {
            console.error(err);
        }
        fileString = data;
    })
    return fileString;
}