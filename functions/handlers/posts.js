const { db } = require('../Util/admin');

exports.getAllPosts = (request, response) => {
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
        .catch((err) => {
            console.error(err);
            response.status(500).json({ error: err.code});
        });
}

exports.makeOnePost = (request, response) => {
    if (request.body.body.trim()=== '') {
        return response.status(400).json({ body: 'Body must not be empty'});
    }

    const newPost = {
        body: request.body.body,
        userHandle: request.user.handle,
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
};