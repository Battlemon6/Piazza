const express = require('express');
const router = express.Router();

const Post = require('../models/Post');
const verifyToken=require('../verifyToken')

// Middleware to update expired posts
async function updatePostStatus(req, res, next) {
    try {
        await Post.updateMany(
            { expirationTime: { $lte: Date.now() }, status: 'Live' },
            { $set: { status: 'Expired' } }
        );
        next();
    } catch (err) {
        next(err);
    }
}

// Apply the middleware to all routes in this router
router.use('/', updatePostStatus);

// POST (Create post) verifying token 
router.post('/', verifyToken, async (req, res) => {
    let expirationTime;

    // Validate expirationDuration
    if (req.body.expirationDuration) {
        const durationInMinutes = parseInt(req.body.expirationDuration);
        if (isNaN(durationInMinutes) || durationInMinutes <= 0) {
            return res.status(400).send({ message: 'Invalid expiration duration' });
        }
        const durationInMs = durationInMinutes * 60000; // Convert minutes to milliseconds
        expirationTime = new Date(Date.now() + durationInMs);
    } else {
        // Default expiration time, e.g., 15 minutes later
        expirationTime = new Date(Date.now() + 15 * 60000);
    }
    const postData = new Post({
        user: req.user._id, // Request id from authorization key. The reason I make it like this is because it is not logical for someone to write their own usernames when posting. With this technique user logs in get an auth key then everything he does, he does it with the authentication key. You dont go to twitter and post by adding your username first.
        title: req.body.title, // Title of the post
        topic: req.body.topic, // Topic of the post (Politics, Health, Sport, Tech)
        body: req.body.body, // Message body of the post
        expirationTime: expirationTime, // Expiration time of the post
        status: 'Live', // Status of the post, default is 'Live'
        likes: 0, // Initial number of likes
        dislikes: 0, // Initial number of dislikes
        likedBy: [], // Users who liked the post
        dislikedBy: [], // Users who disliked the post8
        comments: [] // Initial empty list of comments
    });
    // Try to insert...
    try {
        const postToSave = await postData.save();
        await postToSave.populate('user','username -_id');
        res.status(201).send(postToSave);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// GET (Read all posts) verifying token
router.get('/',  async (req, res) => {
    try {
        const getPosts = await Post.find({ status: 'Live' })
        .populate('user', 'username -_id') // Populate user field with the username. That way we dont only see posters id but username too.
        .populate('likedBy', 'username') // Replace 'likedBy' IDs with user details (username)
        .populate('dislikedBy', 'username') // Replace 'dislikedBy' IDs with user details (username)
        .populate('comments.user', 'username'); // Populate the user field in comments with username
        res.status(200).send(getPosts);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});

// GET (Read post by ID)
router.get('/:postId', verifyToken, async (req, res) => {
    try {
        const getPostById = await Post.findById({ _id: req.params.postId, status: 'Live' })
        .populate('user', 'username') // Populate user field with the username. That way we dont only see posters id but username too. these populate method makes sense when we are testing.
        .populate('likedBy', 'username') // Replace 'likedBy' IDs with user details (username)
        .populate('dislikedBy', 'username') // Replace 'dislikedBy' IDs with user details (username)
        .populate('comments.user', 'username'); // Populate the user field in comments with username

        if (!getPostById) {
            return res.status(404).send({ message: 'Post not found' });
        }
        res.status(200).send(getPostById);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});
// GET Posts by topic.
router.get('/topic/:topic', verifyToken, async (req, res) => {
    try {
        const postByTopic = await Post.find({topic: req.params.topic,status:'Live'})
        .populate('user', 'username') // Populate user field with the username. That way we dont only see posters id but username too. these populate method makes sense when we are testing.
        .populate('likedBy', 'username') // Replace 'likedBy' IDs with user details (username)
        .populate('dislikedBy', 'username') // Replace 'dislikedBy' IDs with user details (username)
        .populate('comments.user', 'username'); // Populate the user field in comments with username

        if (!postByTopic) {
            return res.status(404).send({ message: 'Topic not found' });
        }
        res.status(200).send(postByTopic);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});

// GET (Browse most active post by topic)
router.get('/most-active/:topic', verifyToken, async (req, res) => {
    try {
        const mostActivePost = await Post.find({ topic: req.params.topic, status: 'Live' })
            .sort({ likes: -1, dislikes: -1 })
            .limit(1)
            .populate([
                { path: 'user', select: 'username -_id' },
                { path: 'likedBy', select: 'username -_id' },
                { path: 'dislikedBy', select: 'username -_id' },
                { path: 'comments.user', select: 'username -_id' }
            ]);
        if (!mostActivePost || mostActivePost.length === 0) {
            return res.status(404).send({ message: 'There are no posts on this topic yet...' });
        }
        res.status(200).send(mostActivePost[0]);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});

// GET expired posts by topic
router.get('/expired/topic/:topic', verifyToken, async (req, res) => {
    try {
        // Update statuses for any posts that have expired
        await Post.updateMany(
            { expirationTime: { $lte: Date.now() }, status: 'Live' },
            { $set: { status: 'Expired' } }
        );
        const expiredPosts = await Post.find({
            topic: req.params.topic,
            status: 'Expired'
        })
        .populate('user', 'username -_id')
        .populate('likedBy', 'username')
        .populate('dislikedBy', 'username')
        .populate('comments.user', 'username');

        if (expiredPosts.length === 0) {
            return res.status(404).send({ message: 'No expired posts found for this topic.' });
        }

        res.status(200).send(expiredPosts);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});

// Like,Dislike. verifying tokens as usual, Using patch as they are only updating some data of a post. 
//(like and dislike count) postID and findbyID as working for only one post
// a user can only like or dislike a post. and a user can only like or dislike a post once.
router.patch('/:postId/like', verifyToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post || post.status === 'Expired') {
            return res.status(400).send({ message: 'Cannot interact with an expired post' });
        }
        // Checking if the post has expired
        if (post.expirationTime && post.expirationTime <= Date.now()) {
            post.status = 'Expired';
            await post.save();
            return res.status(400).send({ message: 'Cannot interact with an expired post' });

        }
        // implementing users can not like their own posts function.
        if (post.user.toString() === req.user._id.toString()) {
            return res.status(400).send({ message:'Users can not like their own posts.' });
        }
        // If user has previously liked the post, remove like
        if (post.likedBy.includes(req.user._id)) {
            post.likedBy = post.likedBy.filter(userId => userId.toString() !== req.user._id.toString());
            post.likes -= 1;
        } else {
            // Remove dislike if its been disliked before.
            if (post.dislikedBy.includes(req.user._id)) {
                post.dislikedBy = post.dislikedBy.filter(userId => userId.toString() !== req.user._id.toString());
                post.dislikes -= 1;
            }
            // Add like
            post.likedBy.push(req.user._id);
            post.likes += 1;
        }
        
        await post.save();
        // Shows who liked or disliked the post to the user after liking.
        await post.populate([
            { path: 'user', select: 'username -_id' },
            { path: 'likedBy', select: 'username -_id' },
            { path: 'dislikedBy', select: 'username -_id' }
        ]);

        res.status(200).send(post);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});

router.patch('/:postId/dislike', verifyToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post || post.status === 'Expired') {
            return res.status(400).send({ message: 'Cannot interact with an expired post' });
        }
        // Check if the post has expired
        if (post.expirationTime && post.expirationTime <= Date.now()) {
            post.status = 'Expired';
            await post.save();
            return res.status(400).send({ message: 'Cannot interact with an expired post' });
        }
        if (post.user.toString() === req.user._id.toString()) {
            return res.status(400).send({ message: 'Users can not dislike their own posts' });
        }
        // If user has previously disliked the post, remove dislike
        if (post.dislikedBy.includes(req.user._id)) {
            post.dislikedBy = post.dislikedBy.filter(userId => userId.toString() !== req.user._id.toString());
            post.dislikes -= 1;
        } else {
            // If user has previously liked the post, remove like
            if (post.likedBy.includes(req.user._id)) {
                post.likedBy = post.likedBy.filter(userId => userId.toString() !== req.user._id.toString());
                post.likes -= 1;
            }
            
            // Add dislike
            post.dislikedBy.push(req.user._id);
            post.dislikes += 1;
        }
        
        await post.save();
        await post.populate([
            { path: 'user', select: 'username -_id' },
            { path: 'likedBy', select: 'username -_id' },
            { path: 'dislikedBy', select: 'username -_id' }
        ]);
        res.status(200).send(post);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});
// POST (Add a comment to a post)
router.post('/:postId/comment', verifyToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).send({ message: 'Post not found' });
        }
        // Check if the post has expired
        if (post.expirationTime && post.expirationTime <= Date.now()) {
            post.status = 'Expired';
            await post.save();
            return res.status(400).send({ message: 'Cannot interact with an expired post' });
        }
        // Add new comment to the post
        const newComment = {
            user: req.user._id, // Get the user from the token
            text: req.body.text // Get the comment text from the request body
        };

        post.comments.push(newComment);
        await post.save();
        await post.populate([
            { path: 'user', select: 'username -_id' },
            { path: 'comments.user', select: 'username -_id' },
            { path: 'likedBy', select: 'username -_id' },
            { path: 'dislikedBy', select: 'username -_id' }
        ]);

        res.status(201).send(post);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});

// PATCH (Update post by ID)
router.patch('/:postId', verifyToken, async (req, res) => {
    try {
        const updatePostById = await Post.updateOne(
            { _id: req.params.postId, user:req.user._id}, // only user can patch
            {
                $set: {
                    user: req.body.user, // Post owner information
                    title: req.body.title, // Title of the post
                    topic: req.body.topic, // Topic of the post
                    body: req.body.body, // Message body of the post
                    expirationTime: req.body.expirationTime, // Expiration time of the post
                    status: req.body.status, // Status of the post (Live or Expired)
                }
            }
        );
        if (updatePostById.nModified === 0) {
            return res.status(404).send({ message: 'Post not found or no changes made' });
        }
        res.status(200).send(updatePostById);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

// DELETE (Delete post by ID)
router.delete('/:postId', verifyToken, async (req, res) => {
    try {
        const deletePostById = await Post.deleteOne({ _id: req.params.postId, user:req.user._id},);
        if (deletePostById.deletedCount === 0) {
            return res.status(404).send({ message: 'Post not found' });
        }
        res.status(200).send(deletePostById);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
});

module.exports = router;

