var TAG = 'db.user';
var Q = require('q');
var sheet = require('../handler/spreadsheet');
var localDb = {};

function init() {
    var M_TAG = '.init';
    var d = Q.defer();
    sheet.get({
        spreadsheetId: '1vgQc_0JxixbBrLpd9BKau0RTFQ0OoNgOxxdCFwRQLr4',
        range: 'telegram_users!A2:E',
    }).then(function (results) {
        for (var i = 0; i < results.length; i++) {
            try {
                var result = results[i];
                var user = {
                    chatId: result[0],
                    username: result[1],
                    firstName: result[2],
                    lastName: result[3],
                    languageCode: result[4]
                };
                if (user.chatId) {
                    localDb[user.chatId] = user;
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
        console.error(TAG + M_TAG, 'no chatId');
        d.reject('no chatId');
    } else {
        localDb[user.chatId] = user;
        update();
        d.resolve(true);
    }
    return d.promise;
}

function get(chatId) {
    return localDb[chatId];
}

function update() {
    var M_TAG = '.update';
    var d = Q.defer();
    var resource = {values: []};
    for (var i in localDb) {
        if (localDb.hasOwnProperty(i)) {
            var row = localDb[i];
            var arr = [
                row.chatId,
                row.username,
                row.firstName,
                row.lastName,
                row.languageCode
            ];
            resource.values.push(arr);
        }
    }
    sheet.update({
        spreadsheetId: '1vgQc_0JxixbBrLpd9BKau0RTFQ0OoNgOxxdCFwRQLr4',
        range: 'telegram_users!A2:E',
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
    get: get
};