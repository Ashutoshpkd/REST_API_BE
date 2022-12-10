const User = require('../models/users');
const Token = require('../models/tokens');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res, next) => {
    try {
        const err = validationResult(req);

        if (!err.isEmpty()) {
            err.statusCode = 400;
            err.message = 'Validation failed!';
            err.errors = err.array();

            throw err;
        }
        const existing = await User.findOne({
            email: req.body.email,
        });
        if (existing) {
            const error = new Error('User already exists');
            error.statusCode = 401;
            throw error;
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 14);
        const newUser = new User({
            email: req.body.email,
            password: hashedPassword,
            name: req.body.name,
            status: 'User',
        })
        const data = await newUser.save();
        console.log(data);
        return res.status(201).json({
            message: 'New user created!',
            user: data,
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        return next(err);
    }
}

exports.getStatus = async (req, res, next) => {
    const userId = req.params.userId;

    try {
        const resp = await User.findById(userId);
        if (!resp) {
            throw new Error('User not found!');
        }

        return res.status(200).json({
            status: resp.status
        })

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 404;
        }
        return next(err);
    }

}

exports.login = async (req, res, next) => {
    try {
        const err = validationResult(req);

        if (!err.isEmpty()) {
            err.statusCode = 400;
            err.message = 'Validation failed';
            err.errors = err.array();

            throw err;
        }
        const email = req.body.email;
        const password = req.body.password;

        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error('Authentication failed');
            error.statusCode = 404;

            throw error;
        }

        const verified = await bcrypt.compare(password, user.password);

        if (!verified) {
            const error = new Error('Authentication failed');
            error.statusCode = 404;

            throw error;
        }

        const token = jwt.sign({
            userId: user.id,
            email: user.email,
            expiresIn: '1',
        }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '1h'
        });

        const refreshToken = jwt.sign({
            userId: user.id,
            email: user.email,
        }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '2d'
        });

        const hashedToken = await bcrypt.hash(refreshToken, 14);
        const storedToken = new Token({
            userId: user.id,
            refreshToken: hashedToken,
        });
        const storeTokenResult = await storedToken.save();
        console.log(`STORING TOKEN - ${storeTokenResult}`);
        return res.status(200).json({
            email: user.email,
            userId: user.id,
            tokenExpiration: 1,
            token,
            refreshToken,
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        return next(err);
    }
}

exports.updateStatus = async (req, res, next) => {
    try {
        const err = validationResult(req);

        if (!err.isEmpty()) {
            err.statusCode = 401;
            err.errors = err.array();
            throw err;
        }
        const userId = req.userId;
        const user = await User.findById(userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;

            throw error;
        }
        user.status = req.body.status;
        const resp = await user.save();

        return res.status(201).json({
            message: 'Status updated successfully!',
            body: resp,
        });

    } catch (error) {
        if (!error.statusCode) {
            error.statusCode =  500;
        }
        return next(error);
    }
}

exports.generateNewAccessToken = async (req, res, next) => {
    try {
        const userId = req.userId;

        const newAccessToken = jwt.sign({
            userId,
            expiresIn: 1
        }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '1h',
        });

        const newRefreshToken = jwt.sign({
            userId,
            expiresIn: '2d',
        }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '2d'
        });

        const hashedToken = await bcrypt.hash(newRefreshToken, 14);

        const storedData = await Token.findOne({userId: userId});

        if (!storedData) {
            const err = new Error('Authentication failed');
            err.statusCode = 401;

            throw err;
        }

        storedData.refreshToken = hashedToken;
        const storeRefreshTokenResult = await storedData.save();
        console.log(`STORING RESULT FOR NEW ACCESSTOKEN - ${storeRefreshTokenResult}`);

        return res.status(200).json({
            token: newAccessToken,
            userId: userId,
            refreshToken: newRefreshToken,
            tokenExpiration: 1,
        });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 401;
        }
        return next(error);
    }
}

exports.logout = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        const resp = await Token.findOneAndDelete({userId: userId});
        console.log(`DELETING RESPONSE - ${resp}`);

        if (!resp) {
            const err = new Error('Something went wrong!');
            err.statusCode = 500;

            throw err;
        }

        return res.status(200).json({
            message: 'Logged out'
        });
    } catch(err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        return next(err);
    }
}