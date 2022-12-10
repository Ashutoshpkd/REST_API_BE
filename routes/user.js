const express = require("express");
const { body } = require('express-validator');
const { signup, getStatus, login, updateStatus, generateNewAccessToken, logout } = require('../controller/userController');
const { authCheck, verifyRefresh } = require("../middleware/auth");
const router = express.Router();

router.put('/signup', [
    body('email').trim().isEmail().withMessage('Enter a valid email!'),
    body('password').trim().isLength({min: 6}).withMessage('Password should be more than 6'),
    body('name').trim().not().isEmpty().withMessage('Must be a character only'),
  ] ,signup);

router.get('/status/:userId', getStatus);

router.post('/login', [
    body('email').trim().isEmail().withMessage('Enter a valid email!'),
    body('password').trim().isLength({min: 6}).withMessage('Password should be more than 6'),
  ], login);

router.put('/updatestatus', [
    body('status').trim().isString().withMessage('Only numbers and characters allowed.'),
    authCheck,
], updateStatus);

router.put('/refresh/:userId', verifyRefresh, generateNewAccessToken);

router.delete('/logout/:userId', logout);

exports.userRouter = router;