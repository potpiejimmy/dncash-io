const crypto = require('crypto');
const constants = require('constants');

module.exports.decodeToken = function(requestParams, response, context, ee, next) {
    context.vars.radiocode = response.body.uuid + crypto.privateDecrypt({
        key: context.vars.tokenPrivKey,
        padding: constants.RSA_PKCS1_PADDING
    }, new Buffer(response.body.secure_code, 'base64')).toString('hex');
    return next();
};

module.exports.logResponse = function(requestParams, response, context, ee, next) {
    console.log(JSON.stringify(response.body));
    return next();
};
