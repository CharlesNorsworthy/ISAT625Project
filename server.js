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


app.get('/app/:path', async function (req, res) {
    let now = Date.now();
    let cookieUser = req.cookies;
    if(cookieUser == null) {
        res.status(200).render('subscribe', { instructions: '' });
    }

    const expirationDate = cookieUser.expires;
    if(expirationDate === undefined) {
        res.status(200).render('subscribe', { instructions: '' });
    } else if(now > expirationDate) {
        res.status(419).render('login', { instructions: 'Cookie expired. Please login.' });
    }

    let path = req.params.path.toString();
    const username = cookieUser.username;
    let user = await getUser(username);
    if(user !== null) {
        if(path.equals('subscribe')) {
            res.status(200).render('subscribe', { instructions: '' });
        } else if(path.equals('login')) {
            res.status(200).render('login', { instructions: '' });
        } else {
            res.cookie("userData", user, { expires: new Date(Date.now() + 1000000), httpOnly: true });
            res.status(200).render('topics', user);
        }
    } else {
        res.status(200).render('subscribe', { instructions: '' });
    }
});

app.get('/style.css', function(req, res) {
    res.send(readFileAsync(__dirname + '/views/style.css'));
});

app.post('/subscribe', async function(req, res) {
    let reqBody = req.body
    const username = reqBody.username;
    const subscriptions = reqBody.subscriptions
    let user = await createUser(username, subscriptions);
    if(user !== null) {
        res.cookie("userData", user, { expires: new Date(Date.now() + 1000000), httpOnly: true });
        res.render('topics', user);
    } else {
        res.status(500).send('Internal Server Error.');
    }
});

app.post('/login', async function (req, res) {
    const username = req.body.username;
    let user = await getUser(username);
    if (user === null) {
        res.status(401).render('subscribe', { instructions: 'The username is not recognized, please subscribe!' });
    } else {
        res.cookie("userData", user, { expires: new Date(Date.now() + 1000000), httpOnly: true });
        res.status(200).render('topics', user);
    }
});

async function getUser(username) {
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
            returnUser = user;
        }
    } catch(error) {
        console.error(error);
    } finally {
        await client.close();
    }
    return returnUser;
}

async function createUser(username, subscriptions) {
    // https://www.mongodb.com/languages/mongodb-with-nodejs
    const client = new MongoClient(mongoUri);
    let newUser = {username: username, subscriptions: subscriptions};
    try {
        const database = client.db('isat_twitter');
        const parts = database.collection('users');
        let query = { 'username': username };
        // see if this username exists
        const user = await parts.findOne(query);
        if(user === null) {
            // the user does not exist
            await parts.insertOne(newUser);
        } else {
            for(let i = 0; i <= 99999; i++) {
                let newUsername = username + i.toString();
                let query = { 'username': newUsername };
                const find = await parts.findOne(query);
                if(find === null) {
                    // the username is unique
                    newUser = {username: newUsername, subscriptions: subscriptions};
                    await parts.insertOne(newUser);
                    break;
                }
            }
        }
    } catch(error) {
        console.error(error);
        return null;
    } finally {
        await client.close();
    }
    return newUser;
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