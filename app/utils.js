/**
 * Created by nick on 26/02/18.
 */
var Uuid = require('uuid');

function uuid() {
    return Uuid.v1()
}

function replaceAll(string, find, replace) {
    return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

module.exports = {
    replaceAll: replaceAll,
    uuid: uuid
};