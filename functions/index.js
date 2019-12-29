const functions = require('firebase-functions');

const app = require('express')();

const FBAuth = require('./Util/fbAuth');

const { db } = require('./Util/admin');
  
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


//create like notification
exports.createNotificationOnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            postId: doc.id
          });
        }
      })
      .catch((err) => console.error(err));
  });

//delete notification

exports.deleteNotificationOnUnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

  
//creat notification for comments
exports.createNotificationOnComment = functions
  .region('europe-west1')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            postId: doc.id
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });