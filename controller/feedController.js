const { validationResult } = require('express-validator');
const io = require('../socket');

const Post = require('../models/posts');
const User = require('../models/users');
const { uploadFile, getObjectSignedUrl, deleteFile } = require('../s3');

exports.getPosts = async (req, res, next) => {
    try {
        const perPage = 3;
        const page = req.query.page || 1;
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find().skip((page - 1) * perPage).sort({createdAt: -1}).limit(perPage).populate('creator');
        return res.status(200).json({
            message: 'Fetched successfully!',
            totalItems,
            posts,
            perPage,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        return next(err);
    }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const file = req.file;
try {
  if (!(file.mimetype === 'image/png' || file.mimetype === 'image/jpg'
   || file.mimetype === 'image/jpeg' || file.mimetype === 'image/JPG')) {
    const err = new Error('Validation failed');
    err.statusCode = 422;
    throw err;
   }
  if (!errors.isEmpty()) {
    const err = new Error('Validation failed');
    err.statusCode = 422;
    throw err;
  }
  if (!req.file) {
    const err = new Error('Image not uploaded!');
    err.statusCode = 422;
    throw err;
  }
  if (!userId) {
    const err = new Error('Cannot create post without verifying yourself');
    err.statusCode = 422;
    throw err;
  }

  const title = req.body.title;
  const content = req.body.content;
  const nameOfFile = new Date().toISOString() + '-' + file.originalname;
  const s3Upload = await uploadFile(file.buffer, nameOfFile, file.mimetype);
  console.log(s3Upload);
  const post = new Post({
    title: title,
    content: content,
    imageUrl: nameOfFile,
    creator: userId,
  });
  const user = await User.findById(userId);

  if (!user) {
    const err = new Error('Invalid authorization!');
    err.statusCode = 404;
    throw err;
  }
  const result = await post.save();
  user.posts.push(result.id);
  const creator = await user.save();
  io.getIO().emit('post', { type: 'create', post: {...result._doc, creator: {_id: user.id, name: user.name } } });
  return res.status(201).json({
      message: 'Post created!',
      post: result,
      creator,
  });
  } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 422;
      }
      return next(err);
  }
};

exports.getPostById = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId);
        // const url = await getObjectSignedUrl(post.imageUrl);
        const url = process.env.S3_BUCKET + '/' + post.imageUrl;
        post.imageUrl = url;
        return res.status(200).json({
            message: 'Post found!',
            post,
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 404;
        }
        return next(err);
    }
};

exports.updatePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl;
    const file = req.file;
    const userId = req.userId;

    if (file) {
      imageUrl = new Date().toISOString() + '-' + file.originalname;
    }

    const resp = await Post.findById(postId).populate('creator');

    if (resp.creator._id.toString() !== userId) {
      const err = new Error('Not Authorised');
      err.statusCode = 401;
      throw err;
    }

    let s3Upload;
    if (imageUrl &&  imageUrl !== resp.imageUrl) {
      if (!(file.mimetype === 'image/png' || file.mimetype === 'image/jpg'
      || file.mimetype === 'image/jpeg' || file.mimetype === 'image/JPG')) {
        const e = new Error('Invalid file type');
        e.statusCode = 404;
        throw e;
      }
      s3Upload = await uploadFile(file.buffer, imageUrl, file.mimetype);
    };
    console.log(s3Upload);
    resp.title = title;
    resp.content = content;
    resp.imageUrl = imageUrl || resp.imageUrl;

    const result = await resp.save();

    io.getIO().emit('post', { type: 'update', post: result });

    return res.status(200).json({
      message: 'Post updated!',
      post: result,
    })
    
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 422;
    }
    return next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const userId = req.userId;

    const resp = await Post.findById(postId);
    
    if (resp.creator.toString() !== userId) {
      const err = new Error('Not Authorised');
      err.statusCode = 401;
      throw err;
    }

    if (!resp) {
      const err = new Error('Post not found!');
      err.statusCode = 422;
      throw err;
    }
    const deleteFromS3 = await deleteFile(resp.imageUrl);
    const result = await Post.findByIdAndDelete(postId);
    io.getIO().emit('post', { type: 'delete', postId } );
    return res.status(200).json({
      message: 'Deleted successfully!',
      post: result,
      deleteFromS3
    })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    return next(err);
  }

}