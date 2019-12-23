const admin = require("firebase-admin");
const serviceAccount = require("../serviceacc/serviceAccount.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://heyoo-9a975.firebaseio.com',
    storageBucket: "heyoo-9a975.appspot.com",
  });
const db = admin.firestore();

module.exports = { admin, db };