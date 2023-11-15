// References:
/// https://github.com/ckorpio/classEx1/blob/main/exercise1.js
/// https://github.com/ckorpio/MongoRender/blob/main/testmongo.js
/// https://www.tutorialspoint.com/http-cookies-in-node-js
/// https://www.npmjs.com/package/node-html-parser
/// https://www.geeksforgeeks.org/use-ejs-as-template-engine-in-node-js/
/// https://www.geeksforgeeks.org/express-js-res-redirect-function/

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

app.get('/style.css', function(req, res) {
    res.send(readFileAsync(__dirname + '/views/style.css'));
});

app.post('/subscribe', async function(req, res) {
    let reqBody = req.body
    const username = reqBody.username;
    const subscriptions = reqBody.subscriptions
    let user = await createUser(username, subscriptions);
    if(user !== null) {
        user.expires = new Date(Date.now() + 1000000);
        res.cookie('userData', user);
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
        user.expires = new Date(Date.now() + 1000000);
        res.cookie("userData", user);
        res.status(200).render('topics', user);
    }
});

app.get('/expire_cookie', function(req, res) {
    let expiredTime = Date.now() - 1;
    let cookies = req.cookies;
    let hasCookie = cookies.hasOwnProperty('userData');
    if(hasCookie) {
        let userCookie = cookies.userData;
        userCookie.expires = expiredTime
        res.cookie('userData', userCookie);
        res.status(200).send('\'userData\' cookie expired.');
    } else {
        res.status(200).send('\'userData\' cookie does not exist.');
    }
});

app.get('*', async function (req, res) {
    let now = Date.now();
    let cookies = req.cookies;
    let hasCookie = cookies.hasOwnProperty('userData');
    if(hasCookie) {
        let userCookie = cookies.userData;
        const expirationDate = userCookie.expires;
        if(expirationDate === undefined) {
            res.status(200).render('subscribe', { instructions: '' });
        } else if(now > expirationDate) {
            res.status(419).render('login', { instructions: 'Cookie expired. Please login.' });
        } else {
            let path = req.url.toString();
            const username = userCookie.username;
            let user = await getUser(username);
            if(user !== null) {
                if(path === '/subscribe' || path === '/subscribe.html') {
                    res.status(200).render('subscribe', { instructions: '' });
                } else if(path === '/login' || path === '/login.html') {
                    res.status(200).render('login', { instructions: '' });
                } else {
                    user.expires = new Date(Date.now() + 1000000);
                    res.cookie("userData", user);
                    res.status(200).render('topics', user);
                }
            } else {
                res.status(200).render('subscribe', { instructions: '' });
            }
        }
    } else {
        let topics = await getAllTopics();
        let data = { instructions: '' , 'topics': topics }
        res.status(200).render('subscribe', data);
    }
});

async function getUser(username) {
    // https://www.mongodb.com/blog/post/quick-start-nodejs-mongodb-how-to-get-connected-to-your-database
    const client = new MongoClient(mongoUri);
    let returnUser = null;
    try {
        const database = client.db('isat_twitter');
        const collection = database.collection('users');
        const query = { 'username': username };
        // see if this username + password combination exists
        const user = await collection.findOne(query);
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

async function getAllTopics() {
    // https://www.mongodb.com/languages/mongodb-with-nodejs
    const client = new MongoClient(mongoUri);
    let topics = null;
    try {
        const database = client.db('isat_twitter');
        const collection = database.collection('topics');
        // https://stackoverflow.com/questions/33425565/how-to-return-array-of-string-with-mongodb-aggregation
        topics = await collection.distinct('topic');
    } catch(error) {
        console.error(error);
    } finally {
        await client.close();
    }
    return topics;
}

async function createUser(username, subscriptions) {
    // https://www.mongodb.com/languages/mongodb-with-nodejs
    const client = new MongoClient(mongoUri);
    let newUser = {username: username, subscriptions: subscriptions};
    try {
        // https://www.w3schools.com/nodejs/nodejs_mongodb_find.asp
        const database = client.db('isat_twitter');
        const collection = database.collection('users');
        let query = { 'username': username };
        // see if this username exists
        const user = await collection.findOne(query);
        if(user === null) {
            // the user does not exist
            await collection.insertOne(newUser);
        } else {
            for(let i = 0; i <= 9999999; i++) {
                let newUsername = username + i.toString();
                let query = { 'username': newUsername };
                const find = await collection.findOne(query);
                if(find === null) {
                    // the username is unique
                    newUser = {username: newUsername, subscriptions: subscriptions};
                    await collection.insertOne(newUser);
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