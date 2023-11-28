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
// https://stackoverflow.com/questions/24582338/how-can-i-include-css-files-using-node-express-and-ejs
app.use(express.static(__dirname + '/views'));

const databaseName = 'isat_twitter';
const cookieName = 'isatTwitterCookie';

app.get('/style.css', function(req, res) {
    res.send(readFileAsync(__dirname + '/views/style.css'));
});

app.post('/subscribe', async function(req, res) {
    let reqBody = req.body;
    const username = reqBody.username;
    let subscriptions = await getSubscriptions(reqBody);
    let user = await createUser(username, subscriptions);
    if(user !== null) {
        user.expires = new Date(Date.now() + 1000000);
        res.cookie(cookieName, user);
        res.render('SubscribedTopics', user);
    } else {
        res.status(500).send('Internal Server Error.');
    }
});

app.post('/login', async function (req, res) {
    const username = req.body.username;
    let user = await getUser(username);
    if (user === null) {
        let topics = await getAllTopics();
        let data = { instructions: 'The username is not recognized, please subscribe!', 'topics': topics, 'initNumTopicsShowing': 3 };
        res.status(401).render('subscribe', data);
    } else {
        user.expires = new Date(Date.now() + 1000000);
        res.cookie(cookieName, user);
        res.status(200).render('SubscribedTopics', user);
    }
});

app.post('/edit_subscriptions', async function (req, res) {
    let reqBody = req.body;
    const username = reqBody.username;
    let subscriptions = await getSubscriptions(reqBody);
    let user = await getUser(username);
    if (user === null) {
        let topics = await getAllTopics();
        let data = { instructions: 'The username is not recognized, please subscribe!', 'topics': topics, 'initNumTopicsShowing': 3 };
        res.status(401).render('subscribe', data);
    } else {
        let editedUser = await editUser(username, subscriptions);
        editedUser.expires = new Date(Date.now() + 1000000);
        res.cookie(cookieName, editedUser);
        res.status(200).render('SubscribedTopics', editedUser);
    }
});

app.post('/create_post', async function (req, res) {
    let reqBody = req.body;
    const username = reqBody.username;
    let user = await getUser(username);
    if (user === null) {
        let topics = await getAllTopics();
        let data = { instructions: 'The username is not recognized, please subscribe!', 'topics': topics, 'initNumTopicsShowing': 3 };
        res.status(401).render('subscribe', data);
    } else {
        //TODO: put in db
        user.expires = new Date(Date.now() + 1000000);
        res.cookie(cookieName, user);
        res.status(200).render('SubscribedTopics', user);
    }
});

app.get('/expire_cookie', function(req, res) {
    let expiredTime = Date.now() - 1;
    let cookies = req.cookies;
    let hasCookie = cookies.hasOwnProperty(cookieName);
    if(hasCookie) {
        let userCookie = cookies[cookieName];
        userCookie.expires = expiredTime;
        res.cookie(cookieName, userCookie);
        res.status(200).send('\'' + cookieName + '\'' + ' cookie expired.');
    } else {
        res.status(200).send('\'' + cookieName + '\'' + ' cookie does not exist.');
    }
});

app.get('*', async function (req, res) {
    // TODO: consider redirecting instead of handling here
    let now = Date.now();
    let path = req.url.toString();
    let cookies = req.cookies;
    let hasCookie = cookies.hasOwnProperty(cookieName);
    if(hasCookie) {
        let userCookie = cookies[cookieName];
        const expirationDate = userCookie.expires;
        if(expirationDate === undefined) {
            let topics = await getAllTopics();
            let data = { instructions: '', 'topics': topics, 'initNumTopicsShowing': 3 };
            res.status(200).render('subscribe', data);
        } else if(now > expirationDate) {
            res.status(419).render('login', { instructions: 'Cookie expired. Please login.' });
        } else {
            const username = userCookie.username;
            let user = await getUser(username);
            if(user !== null) {
                if(path === '/subscribe' || path === '/subscribe.html') {
                    let topics = await getAllTopics();
                    let data = { instructions: '', 'topics': topics, 'initNumTopicsShowing': 3 };
                    res.status(200).render('subscribe', data);
                } else if(path === '/login' || path === '/login.html') {
                    res.status(200).render('login', { instructions: '' });
                } else if (path === '/create_post') {
                    let topics = await getAllTopics();
                    res.status(200).render('CreatePost', { 'topics': topics, 'username': user.username });
                } else if (path === '/edit_subscriptions') {
                    let topics = await getAllTopics();
                    res.status(200).render('EditSubscriptions', { 'topics': topics, 'username':
                        user.username, 'subscriptions': user.subscriptions });
                } else {
                    user.expires = new Date(Date.now() + 1000000);
                    res.cookie(cookieName, user);
                    res.status(200).render('SubscribedTopics', user);
                }
            } else {
                if(path === '/login' || path === '/login.html') {
                    res.status(200).render('login', { instructions: '' });
                } else {
                    let topics = await getAllTopics();
                    let data = { instructions: '', 'topics': topics, 'initNumTopicsShowing': 3 };
                    res.status(200).render('subscribe', data);
                }
            }
        }
    } else {
        if(path === '/login' || path === '/login.html') {
            res.status(200).render('login', { instructions: '' });
        } else {
            let topics = await getAllTopics();
            let data = { instructions: '', 'topics': topics, 'initNumTopicsShowing': 3 };
            res.status(200).render('subscribe', data);
        }
    }
});

async function createUser(username, subscriptions) {
    // https://www.mongodb.com/languages/mongodb-with-nodejs
    const client = new MongoClient(mongoUri);
    // remove subscriptions to topics that don't exist
    let allTopics = await getAllTopics();
    let editedSubscriptions = [];
    for(let i in subscriptions) {
        let s = subscriptions[i];
        if(allTopics.includes(s)) {
            editedSubscriptions.push(s);
        }
    }
    let newUser = { username: username, subscriptions: editedSubscriptions };
    try {
        // see if this username exists
        const user = await getDatabaseItem(client, 'users', { 'username': username });
        if(user === null) {
            // the user does not exist
            await addDatabaseItem(client, 'users', newUser);
        } else {
            for(let i = 0; i <= 9999999; i++) {
                let newUsername = username + i.toString();
                const find = await getDatabaseItem(client, 'users', { 'username': newUsername });
                if(find === null) {
                    // the username is unique
                    newUser = { username: newUsername, subscriptions: subscriptions };
                    await addDatabaseItem(client, 'users', newUser);
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

async function editUser(username, subscriptions) {
    const client = new MongoClient(mongoUri);
    let editedUser = { 'username': username, 'subscriptions': subscriptions };
    try {
        const database = client.db('isat_twitter');
        const collection = database.collection('users');
        const query = { 'username': username };
        // https://www.w3schools.com/nodejs/nodejs_mongodb_update.asp
        const editQuery = { $set: editedUser };
        await collection.updateOne(query, editQuery);
    } catch(error) {
        console.error(error);
    } finally {
        await client.close();
    }
    return editedUser;
}

async function createTopic(topicName) {
    const client = new MongoClient(mongoUri);
    let newTopic = { 'topic': topicName, 'posts': [] };
    try {
        // see if this topic exists
        const dbTopic = await getDatabaseItem(client, 'topics', { 'topic': topicName });
        if(dbTopic === null) {
            // the topic does not exist
            await addDatabaseItem(client, 'topics', newTopic);
        }
    } catch(error) {
        console.error(error);
        return null;
    } finally {
        await client.close();
    }
}

async function createPost(topicName, text, user) {
    const client = new MongoClient(mongoUri);
    let newPost = { 'text': text, 'user': user, 'replies': [] };
    try {
        // see if the topic exists
        const dbTopic = await getDatabaseItem(client, 'topics', topicName);
        if(dbTopic !== null) {
            // https://stackoverflow.com/questions/11077202/in-mongodb-is-it-practical-to-keep-all-comments-for-a-post-in-one-document
            //TODO: implement
        }
    } catch(error) {
        console.error(error);
        return null;
    } finally {
        await client.close();
    }
}

async function createReply(post, replyText, replyUser) {
    //TODO: implement
}

async function getAllTopics() {
    // https://www.mongodb.com/languages/mongodb-with-nodejs
    const client = new MongoClient(mongoUri);
    let topics = null;
    try {
        const database = client.db(databaseName);
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

async function getSubscriptions(reqBody) {
    let subscriptions = [];
    // https://stackoverflow.com/questions/17385009/can-i-iterate-over-the-query-string-parameters-using-expressjs
    for(let queryKey in reqBody) {
        if(reqBody.hasOwnProperty(queryKey)) {
            let value = reqBody[queryKey].toString();
            if(queryKey === value) {
                subscriptions.push(queryKey);
            }
        }
    }
    return subscriptions;
}


async function getDatabaseItem(client, collection, query) {
    // https://www.w3schools.com/nodejs/nodejs_mongodb_find.asp
    const db = client.db(databaseName);
    const dbCollection = db.collection(collection);
    return await dbCollection.findOne(query);
}

async function addDatabaseItem(client, collection, item) {
    const db = client.db(databaseName);
    const dbCollection = db.collection(collection);
    await dbCollection.insertOne(item);
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