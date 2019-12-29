const { admin, db } = require('../Util/admin');

const config = require('../Util/config');

const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignupData, validateLoginData, reduceUserDetails } = require ('../Util/validators');


//sign up
exports.signup = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle
    };

    const { valid, errors } =  validateSignupData(newUser);

    if(!valid) return response.status(400).json(errors);

    const noImg = 'no-img.png'

    let token, userId;
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists){
                return response.status(400).json({handle: 'this handle is already taken'});
            } else {
            return firebase.auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
    })
    .then((data) => {
        userId = data.user.uid;
       return  data.user.getIdToken()
    })
    .then((idToken) => {
        token =  idToken;
        const userCredentials = {
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${
                config.storageBucket}/o/${noImg}?alt=media`,
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
         return response.status(500).json({ general: 'Something went wrong, please try again'});
        } 
    });
}


//log users in

exports.login = (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    };

    const { valid, errors } =  validateLoginData(user);

    if (!valid) return response.status(400).json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
         .then((data) => {
             return data.user.getIdToken();
         })
         .then((token) => {
             return response.json({token});
         })
         .catch((err) => {
             console.error(err);
                 return response.status(403).json({ general: 'Wrong credentials, please try again'}); 
         });
};

// Get any user's details
exports.getUserDetails = (request, response) => {
    let userData = {};
    db.doc(`/users/${request.params.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          userData.user = doc.data();
          return db
            .collection('posts')
            .where('userHandle', '==', request.params.handle)
            .orderBy('createdAt', 'desc')
            .get();
        } else {
          return response.status(404).json({ error: 'User not found' });
        }
      })
      .then((data) => {
        userData.posts = [];
        data.forEach((doc) => {
          userData.posts.push({
            body: doc.data().body,
            createdAt: doc.data().createdAt,
            userHandle: doc.data().userHandle,
            userImage: doc.data().userImage,
            likeCount: doc.data().likeCount,
            commentCount: doc.data().commentCount,
            postId: doc.id
          });
        });
        return response.json(userData);
      })
      .catch((err) => {
        console.error(err);
        return response.status(500).json({ error: err.code });
      });
  };

// Add User Details
exports.addUserDetails =(request, response) => {
    let userDetails = reduceUserDetails(request.body);

    db.doc(`/users/${request.user.handle}`).update(userDetails)
        .then(() => {
            return response.json({ message: 'Details Added Successfully'});
        })
        .catch(err => {
            console.error(err);
            return response.status(500).json({error: err.code});
        })
}


//Get Own User Details

exports.getAuthenticatedUser = (request, response) => {
    let userData = {};
    db.doc(`/users/${request.user.handle}`).get()
    .then(doc => {
        if(doc.exists){
            userData.credentials = doc.data();
            return db.collection('likes').where('userHandle', '==', request.user.handle).get()
        }
    })
    .then(data => {
        userData.likes= [];
        data.forEach(doc =>{
            userData.likes.push(doc.data());
        });
        return db
        .collection('notifications')
        .where('recipient', '==', request.user.handle)
        .orderBy('createdAt', 'desc')
        .get();
    })
    .then((data) => {
        userData.notifications = [];
        data.forEach((doc) => {
          userData.notifications.push({
            recipient: doc.data().recipient,
            sender: doc.data().sender,
            createdAt: doc.data().createdAt,
            postId: doc.data().postId,
            type: doc.data().type,
            read: doc.data().read,
            notificationId: doc.id
          });
        });
        return response.json(userData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };

//Upload a profile image for user

exports.uploadImage = (request, response) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
  
    const busboy = new BusBoy({ headers: request.headers });
  
    let imageFileName;
    let imageToBeUploaded = {};
  
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
        return response.status(400).json({ error: 'Wrong file type submitted' });
      }
      // my.image.png
      const imageExtension = filename.split('.')[filename.split('.').length - 1];
      // 645235423674523.png
      imageFileName = `${Math.round(
        Math.random()*100000000000
      )}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
      admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype
            }
          }
        })
        .then(() => {
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
            config.storageBucket
          }/o/${imageFileName}?alt=media`;
          return db.doc(`/users/${request.user.handle}`).update({ imageUrl });
        })
        .then(() => {
            return response.json({ message: 'Image Uploaded Successfully'});
        })
        .catch(err => {
           console.error(err); 
           return response.status(500).json({ error: err.code });
        });
    });
    busboy.end(request.rawBody);
  };

exports.markNotificationsRead = (request, response) => {
    let batch = db.batch();
    request.body.forEach((notificationId) => {
      const notification = db.doc(`/notifications/${notificationId}`);
      batch.update(notification, { read: true });
    });
    batch
      .commit()
      .then(() => {
        return response.json({ message: 'Notifications marked read' });
      })
      .catch((err) => {
        console.error(err);
        return response.status(500).json({ error: err.code });
      });
  };