var TAG = 'db.user';
var config = require('config');
var Q = require('q');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = config.spreadsheets.main;
var users = {};

function init() {
    var M_TAG = '.init';
    var d = Q.defer();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_users!A2:D',
    }).then(function (results) {
        for (var i = 0; i < results.length; i++) {
            try {
                var result = results[i];
                var user = {
                    chatId: result[0],
                    firstName: result[1],
                    lastName: result[2],
                    languageCode: result[3]
                };
                if (user.chatId) {
                    users[user.chatId] = user;
                }
            } catch (err) {
                console.warn(TAG + M_TAG, err);
            }
        }
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function add(user) {
    var M_TAG = '.update';
    var d = Q.defer();
    if (!user.chatId) {
        console.error(TAG + M_TAG, 'no chatId user:', user);
        d.reject('no chatId');
    } else {
        users[user.chatId] = user;
        update();
        d.resolve(true);
    }
    return d.promise;
}

function get(chatId) {
    return users[chatId];
}

function getAll() {
    var arr = [];
    for (var i in users) {
        if (users.hasOwnProperty(i)) {
            var user = users[i];
            arr.push(user);
        }
    }
    return arr;
}

function update() {
    var M_TAG = '.update';
    var d = Q.defer();
    var resource = {values: []};
    for (var i in users) {
        if (users.hasOwnProperty(i)) {
            var row = users[i];
            var arr = [
                row.chatId,
                row.firstName,
                row.lastName,
                row.languageCode
            ];
            resource.values.push(arr);
        }
    }
    sheet.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_users!A2:D',
        valueInputOption: 'USER_ENTERED',
        resource: resource
    }).then(function (result) {
        d.resolve(result);
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
        d.reject(reason);
    });
    return d.promise;
}

module.exports = {
    init: init,
    add: add,
    get: get,
    getAll: getAll
};