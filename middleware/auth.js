const jwt = require('jsonwebtoken');
const Token = require('../models/tokens');
const bcrypt = require('bcryptjs');

exports.authCheck = async (req, res, next) => {
    const authData = req.get('Authorization');

    try {
        if (!authData) {
            const err = new Error('Authorization failed!');
            err.statusCode = 401;

            throw err;
        }
        const token = authData.split(' ')[1];
        if (!token) {
            const err = new Error('Invalid token');
            err.statusCode = 401;

            throw err;
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (!decodedToken) {
            const err = new Error('Invalid token');
            err.statusCode = 401;

            throw err;
        }

        req.userId = decodedToken.userId;
        return next();
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 400;
        }
        return next(error);
    }
};

exports.verifyRefresh = async (req, res, next) => {
    try {
        const authData = req.body.refreshToken;
        const userId = req.params.userId;

        if (!authData) {
            const err = new Error('Authorization failed!');
            err.statusCode = 401;

            throw err;
        }

        const token = authData.split(' ')[1];
        if (!token) {
            const err = new Error('Invalid token');
            err.statusCode = 401;

            throw err;
        }
        const storedRefreshToken = await Token.findOne({userId: userId});
        
        if (!storedRefreshToken) {
            const err = new Error('Authorization failed!');
            err.statusCode = 401;

            throw err;
        }

        const isEqual = await bcrypt.compare(token, storedRefreshToken.refreshToken);

        if (!isEqual) {
            const err = new Error('Invalid token');
            err.statusCode = 401;

            throw err;
        }
        const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        if (!decodedToken) {
            const err = new Error('Invalid token');
            err.statusCode = 401;

            throw err;
        }

        req.userId = decodedToken.userId;
        return next();
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 400;
        }
        return next(err);
    }
}