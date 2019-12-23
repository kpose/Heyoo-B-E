const functions = require('firebase-functions');

const app = require('express')();

const FBAuth = require('./Util/fbAuth');

const { getAllPosts, makeOnePost } = require('./handlers/posts');
const { signup, login, uploadImage , addUserDetails } = require('./handlers/users');

//Post Routes
app.get('/posts', getAllPosts);
app.post('/post', FBAuth, makeOnePost);

//users routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);

exports.api = functions.https.onRequest(app);
