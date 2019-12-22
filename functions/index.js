const functions = require('firebase-functions');

const app = require('express')();

const FBAuth = require('./Util/fbAuth');

const { getAllPosts, makeOnePost } = require('./handlers/posts');
const { signup, login } = require('./handlers/users');





//Posts Routes
app.get('/posts', getAllPosts);
app.post('/post', FBAuth, makeOnePost);

//signup and signin route
app.post('/signup', signup);
app.post('/login', login);





exports.api = functions.https.onRequest(app);
