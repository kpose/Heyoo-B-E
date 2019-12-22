const functions = require('firebase-functions');
const admin = require("firebase-admin");
const app = require('express')();
const serviceAccount = require("../serviceacc/serviceAccount.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://heyoo-9a975.firebaseio.com'
  });


const config = {
    apiKey: "AIzaSyBEDZbk8olxh8YWkq8mY1nuFdWqJngBWJ8",
    authDomain: "heyoo-9a975.firebaseapp.com",
    databaseURL: "https://heyoo-9a975.firebaseio.com",
    projectId: "heyoo-9a975",
    storageBucket: "heyoo-9a975.appspot.com",
    messagingSenderId: "942599281012",
    appId: "1:942599281012:web:a78f183a1289ffc5673421",
    measurementId: "G-GEGW9SJQEP"
  };



const firebase = require('firebase');
firebase.initializeApp(config)
const db = admin.firestore();



app.get('/posts', (request, response) => {
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
            let posts = [];
            data.forEach((doc) => {
                posts.push({
                    postId: doc.id,
                    body: doc.data().body,
                    userHandle:doc.data().userHandle,
                    createdAt: new Date().toISOString()
                });
            });
            return response.json(posts);
        })
        .catch((err) => console.error(err));
})

const FBAuth = (request, response, next) => {
    let idToken;
    if(request.headers.authorization && request.headers.authorization.startsWith('Bearer ')){
        idToken = request.headers.authorization.split('Bearer ')[1];
    } else {
        console.error('No Token Found')
        return response.status(403).json({ error: 'Unauthorized'});
    }

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            request.user = decodedToken;
            console.log(decodedToken);
            return db.collection('users')
                .where('userId', '==', request.user.uid)
                .limit(1)
                .get();
        })
        .then(data => {
            request.user.handle = data.docs[0].data().handle;
            return next();
        })
        .catch(err => {
            console.error('Error while verifying token ', err);
            return response.status(403).json(err);
        })
}

//Make a Post
app.post('/post', FBAuth, (request, response) => {
        if (request.body.body.trim()=== '') {
            return response.status(400).json({ body: 'Body must not be empty'});
        }

        const newPost = {
            body: request.body.body,
            userHandle: request.body.handle,
            createdAt: new Date().toISOString()
        };

        db.collection('posts')
            .add(newPost)
            .then(doc => {
                response.json({ message: `document ${doc.id} created successfully`});
            })
            .catch(err => {
                response.status(500).json({ error: 'something went wrong'});
                console.error(err);
            })
   });

   const isEmail = (email) => {
       const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
       if(email.match(regEx)) return true;
       else return false;
   }

   const isEmpty = (string) => {
       if (string.trim()=== '') return true;
       else return false;
   }



   //signup route
   app.post('/signup', (request, response) => {
       const newUser = {
           email: request.body.email,
           password: request.body.password,
           confirmPassword: request.body.confirmPassword,
           handle: request.body.handle
       };

       let errors = {};
       
       if(isEmpty(newUser.email)) {
           errors.email = 'Must not be empty'
       }else if(!isEmail(newUser.email)){
           errors.email = 'Must be a valid email address'
       }

       if(isEmpty(newUser.password)) errors.password= 'Must not be empty'
       if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = "Passwords do not match"
       if(isEmpty(newUser.handle)) errors.handle= 'Must not be empty'


       if (Object.keys(errors).length > 0) return response.status(400).json(errors);
       //validate user
       let token, userId;
       db.doc(`/users/${newUser.handle}`).get()
       .then(doc => {
           if (doc.exists){
               return response.status(400).json({handle: 'this handle is already taken'});
           } else {
            return firebase.auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
           }
       })
       .then(data => {
           userId = data.user.uid;
          return  data.user.getIdToken()
       })
       .then(idtoken => {
           token =  idtoken;
           const userCredentials = {
               handle: newUser.handle,
               email: newUser.email,
               createdAt: new Date().toISOString(),
               userId
           };
           return db.doc(`/users/${newUser.handle}`).set(userCredentials);
       })
       .then((data) => {
           return response.status(201).json({ token });
       })
       .catch(err => {
           console.error(err);
           if (err.code === 'auth/email-already-in-use'){
               return response.status(400).json({email: 'Email is already in use'})
           } else {
            return response.status(500).json({ error: err.code});
           } 
       })
   });

   app.post('/login', (request, response) => {
       const user = {
           email: request.body.email,
           password: request.body.password
       };

       let errors = {};

       if(isEmpty(user.email)) errors.email = "Must not be empty";
       if(isEmpty(user.password)) errors.password = "Must not be empty";

       if(Object.keys(errors).length > 0) return response.status(400).json(errors);

       firebase.auth().signInWithEmailAndPassword(user.email, user.password)
            .then(data => {
                return data.user.getIdToken();
            })
            .then(token => {
                return response.json({token});
            })
            .catch(err => {
                console.error(err);
                if(err.code === 'auth/wrong-password'){
                    return response.status(403).json({ general: 'Wrong credentials, please try again'});
                } else return response.status(500).json({error: err.code});
            });
   });

exports.api = functions.https.onRequest(app);
