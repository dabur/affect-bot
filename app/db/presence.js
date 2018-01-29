var TAG = 'db.presence';
var config = require('config');
var Q = require('q');
var moment = require('moment');
var sheet = require('../handler/spreadsheet');
var schedule = require('./schedule');
var SPREADSHEET_ID = config.spreadsheets.presence;
var localDb = {};

function init() {
    var M_TAG = '.init';
    var d = Q.defer();
    refreshDay();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: localDb.yyyymmdd + '!A2:B',
    }).then(function (results) {
        for (var i = 0; results && i < results.length; i++) {
            try {
                var result = results[i];
                localDb.data[result[0]] = result[1];
                schedule.increaseCurrently(result[1]);
            } catch (err) {
                console.warn(TAG + M_TAG, err);
            }
        }
        d.resolve(true);
    }).catch(function (reason) {
        if (reason.code && reason.code == 400) {
            d.resolve(true);
        } else {
            d.reject(reason);
        }
    });
    return d.promise;
}

function refreshDay() {
    var nowDate = new Date();
    var yyyymmdd = moment(nowDate).format("YYYYMMDD").toString();
    if (localDb.yyyymmdd != yyyymmdd) {
        localDb.yyyymmdd = yyyymmdd;
        localDb.hours = {};
        localDb.data = {};
        var todayHours = schedule.getTodayHours();
        for (var i = 0; i < todayHours.length; i++) {
            var hour = todayHours[i];
            if (hour) {
                localDb.hours[hour] = true;
            }
        }
    }
}

function add(chatId, hour) {
    refreshDay();
    var nowDate = new Date();
    if (localDb.data[chatId] && localDb.data[chatId] < nowDate.getHours()) {
        return rejectedPromise(101);
    }
    if (hour < nowDate.getHours()) {
        return rejectedPromise(102);
    }
    localDb.data[chatId] = hour;
    return updateToday();
}

function remove(chatId, hour) {
    refreshDay();
    var nowDate = new Date();
    if (localDb.data[chatId] && localDb.data[chatId] < nowDate.getHours()) {
        return rejectedPromise(201);
    }
    if (!localDb.data[chatId] || localDb.data[chatId] != hour) {
        return rejectedPromise(202)
    }
    delete localDb.data[chatId];
    return updateToday();
}

function updateToday(previousHour) {
    var M_TAG = '.updateToday';
    var d = Q.defer();
    var resource = {values: []};
    for (var i in localDb.data) {
        if (localDb.data.hasOwnProperty(i)) {
            var hour = localDb.data[i];
            var arr = [i, hour];
            resource.values.push(arr);
        }
    }
    while (resource.values.length < 100) {
        resource.values.push(["", ""]);
    }
    sheet.update({
        spreadsheetId: SPREADSHEET_ID,
        range: localDb.yyyymmdd + '!A2:B',
        valueInputOption: 'USER_ENTERED',
        resource: resource
    }).then(function (result) {
        d.resolve(result);
    }).catch(function (reason) {
        if (reason.code && reason.code == 400) {
            createToday().then(function () {
                return sheet.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: localDb.yyyymmdd + '!A2:B',
                    valueInputOption: 'USER_ENTERED',
                    resource: resource
                });
            }).then(function (result) {
                d.resolve(result);
            }).catch(function (reason) {
                console.error(TAG + M_TAG, reason);
                d.reject(reason);
            });
        } else {
            console.error(TAG + M_TAG, reason);
            d.reject(reason);
        }
    });
    return d.promise;
}

function createToday() {
    var d = Q.defer();
    var resource = {};
    resource.requests = [
        {
            addSheet: {
                properties: {
                    title: localDb.yyyymmdd,
                    gridProperties: {
                        rowCount: 100,
                        columnCount: 10
                    }
                }
            }
        }
    ];
    sheet.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: resource
    }).then(function () {
        return sheet.update({
            spreadsheetId: SPREADSHEET_ID,
            range: localDb.yyyymmdd + '!A1:B1',
            valueInputOption: 'USER_ENTERED',
            resource: {values: [['chatId', 'hour']]}
        });
    }).then(function () {
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function getStatus(chatId, todayHours) {
    refreshDay();
    var result = {msg: ''};
    if (localDb.data.hasOwnProperty(chatId)) {
        var sHour = localDb.data[chatId];
        var statsLabel = 'סה"כ: ' + todayHours[sHour].currently + '/' + todayHours[sHour].limit + ' רשומות';
        result.msg = 'הינך רשומה ל-' + todayHours[sHour].label + '\n' + statsLabel;
        result.options = {
            reply_markup: JSON.stringify({
                inline_keyboard: [[
                    {
                        text: 'הסר',
                        callback_data: 'ans::' + sHour + '::no'
                    }
                ]]
            })
        };
    } else {
        result.msg = 'עוד לא נרשמת היום';
    }
    return result;
}

function getNext(todayHours) {
    refreshDay();
    var hours = {};
    var nowDate = new Date();
    var nowHour = nowDate.getHours();
    for (var cI in localDb.data) {
        if (localDb.data.hasOwnProperty(cI)) {
            var hour = localDb.data[cI];
            if (nowHour <= hour) {
                if (hours[hour] == undefined) {
                    hours[hour] = 0;
                }
                hours[hour]++;
            }
        }
    }
    var options;
    var inlineKeyboard = [];
    for (var h in hours) {
        if (hours.hasOwnProperty(h)) {
            var btn = [
                {
                    text: todayHours[h].label + ' - ' + hours[h],
                    callback_data: 'menu::' + h + '::hoursubscribers'
                }
            ];
            inlineKeyboard.push(btn);

        }
    }
    var message = 'אין עדיין רשומות להיום';
    if (inlineKeyboard.length > 0) {
        message = 'רישום לשעורים להמשך היום:\n';
        options = {
            reply_markup: JSON.stringify({
                inline_keyboard: inlineKeyboard
            })
        };
    }
    var ans = {message: message};
    if (options) {
        ans.options = options;
    }
    return ans;
}

function isSubscribed(chatId) {
    refreshDay();
    return localDb.data.hasOwnProperty(chatId);
}

function getHourSubscribers(hour) {
    refreshDay();
    var chatIds = [];
    for (var cI in localDb.data) {
        if (localDb.data.hasOwnProperty(cI)) {
            if (localDb.data[cI] == hour) {
                chatIds.push(cI)
            }
        }
    }
    return chatIds;
}

function rejectedPromise(reason) {
    var d = Q.defer();
    d.reject(reason);
    return d.promise;
}

function getPreviousHour(chatId) {
    return localDb.data[chatId];
}

module.exports = {
    init: init,
    add: add,
    remove: remove,
    isSubscribed: isSubscribed,
    getHourSubscribers: getHourSubscribers,
    getNext: getNext,
    getStatus: getStatus,
    getPreviousHour: getPreviousHour
};
