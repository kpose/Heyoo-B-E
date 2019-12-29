const functions = require('firebase-functions');

const app = require('express')();

const FBAuth = require('./Util/fbAuth');
  
const { getAllPosts,
        makeOnePost, 
        getPost,
        commentOnPost,
        likePost,
        unlikePost,
        deletePost 
    } = require('./handlers/posts');

const { 
    signup, 
    login, 
    uploadImage , 
    addUserDetails,
    getAuthenticatedUser,
} = require('./handlers/users');

//Post Routes
app.get('/posts', getAllPosts);
app.post('/post', FBAuth, makeOnePost);
app.get('/post/:postId', getPost);
app.delete('/post/:postId', FBAuth, deletePost);
app.get('/post/:postId/like', FBAuth, likePost);
app.get('/post/:postId/unlike', FBAuth, unlikePost);
app.post('/post/:postId/comment', FBAuth, commentOnPost);

//users routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);

