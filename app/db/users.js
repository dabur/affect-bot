var TAG = 'db.user';
var config = require('config');
var Q = require('q');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = config.spreadsheets.main;
var users = {
    byChatId: {}
};

// Public //----------------------------------------------------------------------------------------------------------//
module.exports = {
    init: init,
    add: add,
    get: get,
    getAll: getAll
};

function init() {
    var M_TAG = '.init';
    var d = Q.defer();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_users!A2:C',
    }).then(function (results) {
        var byChatId = {};
        for (var i = 0; i < results.length; i++) {
            try {
                var result = results[i];
                var user = {
                    chatId: result[0],
                    firstName: result[1],
                    lastName: result[2]
                };
                if (user.chatId) {
                    byChatId[user.chatId] = user;
                }
            } catch (err) {
                console.warn(TAG + M_TAG, err);
            }
        }
        users.byChatId = byChatId;
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
        users.byChatId[user.chatId] = user;
        update();
        d.resolve(true);
    }
    return d.promise;
}

function get(chatId) {
    return users.byChatId[chatId];
}

function getAll() {
    var arr = [];
    for (var chatId in users.byChatId) {
        arr.push(users.byChatId[chatId]);
    }
    return arr;
}

function update() {
    var M_TAG = '.update';
    var d = Q.defer();
    var resource = {values: []};
    for (var chatId in users.byChatId) {
        var row = users.byChatId[chatId];
        var arr = [
            row.chatId,
            row.firstName,
            row.lastName
        ];
        resource.values.push(arr);
    }
    sheet.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_users!A2:C',
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
//----------------------------------------------------------------------------------------------------------// Public //