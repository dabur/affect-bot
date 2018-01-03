var TAG = 'db.presence';
var Q = require('q');
var moment = require('moment');
var sheet = require('../handler/spreadsheet');
var schedule = require('./schedule');

var SPREADSHEET_ID = '1AkIWJNEmkUO8J90CJJys0iYKZr17JoknDI4GpJoVCdY';
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
        var nowDay = nowDate.getDay();
        var sch = schedule.getAll();
        for (var i = 0; i < sch[nowDay].length; i++) {
            var hour = sch[nowDay][i];
            if (hour) {
                localDb.hours[hour] = true;
            }
        }
    }
}

function add(chatId, hour) {
    refreshDay();
    localDb.data[chatId] = hour;
    return updateToday();
}

function remove(chatId, hour) {
    refreshDay();
    if (localDb.data[chatId] == hour) {
        delete localDb.data[chatId];
    }
    return updateToday();
}

function updateToday() {
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

function getStatus(chatId, subToday) {
    var result = {msg: ''};
    if (localDb.data.hasOwnProperty(chatId)) {
        var sHour = localDb.data[chatId];
        result.msg = 'הינך רשומה ל-' + subToday[sHour];
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

function getNext(subToday) {
    var ans = 'רישום לשעורים להמשך היום:\n';
    var hours = {};
    var nowDate = new Date();
    var nowHour = nowDate.getHours();
    for (var cI in localDb.data) {
        if (localDb.data.hasOwnProperty(cI)) {
            var hour = localDb.data[cI];
            if (nowHour < hour) {
                if (hours[hour] == undefined) {
                    hours[hour] = 0;
                }
                hours[hour]++;
            }
        }
    }
    var lessons = '';
    for (var h in hours) {
        if (hours.hasOwnProperty(h)) {
            lessons += subToday[h] + ':' + hours[h] + '\n'
        }
    }
    if (lessons.length > 0) {
        ans += lessons;
    } else {
        ans = 'אין עדיין רשומות להיום';
    }
    return ans;
}


function isSubscribed(chatId) {
    return localDb.data.hasOwnProperty(chatId);
}

module.exports = {
    init: init,
    add: add,
    remove: remove,
    isSubscribed: isSubscribed,
    getNext: getNext,
    getStatus: getStatus
};