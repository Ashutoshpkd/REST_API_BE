const express = require('express');

const feedController = require('../controller/feedController');
const { authCheck } = require('../middleware/auth');

const router = express.Router();

router.get('/posts/:postId', feedController.getPostById);

router.put('/post/:postId', authCheck, feedController.updatePost);

router.get('/posts', feedController.getPosts);

router.post('/post', authCheck, feedController.createPost);

router.delete('/post/:postId', authCheck, feedController.deletePost);

exports.feedRouter = router;