var TAG = 'db.presence';
var config = require('config');
var Q = require('q');
var moment = require('moment');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = config.spreadsheets.presence;
var persistence = {};
var presence = {};
clear();

// Public //----------------------------------------------------------------------------------------------------------//
module.exports = {
    init: init,
    add: add,
    remove: remove,
    getByLessonId: getByLessonId,
    getByChatId: getByChatId,
    getAll: getAll
};

function init(users, lessons) {
    persistence.users = users;
    persistence.lessons = lessons;
    return reload(true);
}

function add(chatId, lessonId, sync, date) {
    var d = Q.defer();
    if (persistence.users.get(chatId) && persistence.lessons.getById(lessonId)) {
        if (!date) {
            date = moment(new Date()).format("YYYYMMDD").toString();
        }
        var data = {chatId, lessonId, date};
        if (!presence.byLessonId[lessonId]) {
            presence.byLessonId[lessonId] = {obj: {}, arr: []};
        }
        if (!presence.byLessonId[lessonId].obj[chatId]) {
            presence.byLessonId[lessonId].obj[chatId] = data;
            presence.byLessonId[lessonId].arr.push(data);
        }
        if (!presence.byChatId[chatId]) {
            presence.byChatId[chatId] = {obj: {}, arr: []};
        }
        if (!presence.byChatId[chatId].obj[lessonId]) {
            presence.byChatId[chatId].obj[lessonId] = data;
            presence.byChatId[chatId].arr.push(data);
        }
        if (sync) {
            update(lessonId).then(function () {
                d.resolve(true);
            }).catch(function (reason) {
                d.reject(reason);
            });
        } else {
            d.resolve(true);
        }
    } else {
        d.resolve(true);
    }
    return d.promise;
}

function remove(chatId, lessonId, sync) {
    var d = Q.defer();
    if (persistence.users.get(chatId) && persistence.lessons.getById(lessonId)) {
        var data = presence.byChatId[chatId].obj[lessonId];
        if (data) {
            for (var ci = 0; ci < presence.byChatId[chatId].arr.length; ci++) {
                var val1 = presence.byChatId[chatId].arr[ci];
                if (val1.chatId == data.chatId && val1.lessonId == data.lessonId) {
                    presence.byChatId[chatId].arr.splice(ci, 1);
                    break;
                }
            }
            delete presence.byChatId[chatId].obj[lessonId];
            for (var li = 0; li < presence.byLessonId[lessonId].arr.length; li++) {
                var val2 = presence.byLessonId[lessonId].arr[li];
                if (val2.chatId == data.chatId && val2.lessonId == data.lessonId) {
                    presence.byLessonId[lessonId].arr.splice(li, 1);
                    break;
                }
            }
            delete presence.byLessonId[lessonId].obj[chatId];
            if (sync) {
                update(lessonId).then(function () {
                    d.resolve(true);
                }).catch(function (reason) {
                    d.reject(reason);
                });
            } else {
                d.resolve(true);
            }
        } else {
            d.resolve(true);
        }
    } else {
        d.resolve(true);
    }
    return d.promise;
}

function getByLessonId(lessonId) {
    return presence.byLessonId[lessonId]
}

function getByChatId(chatId) {
    return presence.byChatId[chatId];
}

function getAll() {
    return presence.byLessonId;
}
//----------------------------------------------------------------------------------------------------------// Public //

function clear() {
    presence.byLessonId = {};
    presence.byChatId = {};
    presence.olderThisWeek = [];
}

function reload(createIfNeed) {
    var date = new Date();
    var checkDate = new Date(date.getTime());
    checkDate.setDate(checkDate.getDate() - date.getDay() + 7);
    clear();
    if (date.getMonth() == checkDate.getMonth()) {
        return reloadThisMonth(createIfNeed);
    } else {
        return reloadThisMonth(createIfNeed).then(()=> {
            return reloadNextMonth(createIfNeed);
        });
    }
}
function reloadThisMonth(createIfNeed) {
    var d = Q.defer();
    var nowDate = new Date();
    var label = moment(nowDate).format("YYYYMM").toString();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_presence_' + label + '!A2:C',
    }).then(function (results) {
        var startWeekDate = getStartWeekDate();
        for (var i = 0; results && i < results.length; i++) {
            var result = results[i];
            var lessonId = result[0];
            var chatId = result[1];
            var date = result[2];
            var lessonDate = getLessonDate(lessonId);
            var lessonSubDate = getLessonSubDate(date);
            if (lessonDate.getMonth() == nowDate.getMonth() && lessonSubDate.getTime() >= startWeekDate.getTime()) {
                add(chatId, lessonId, false, date);
            } else {
                presence.olderThisWeek.push([lessonId, chatId, date]);
            }
        }
        d.resolve(true);
    }).catch(function (reason) {
        if (reason.code && reason.code == 400 && createIfNeed) {
            createSheet(label).then(function () {
                return reloadThisMonth();
            }).then(function () {
                d.resolve(true);
            }).catch(function (reason) {
                d.reject(reason);
            });
        } else {
            d.reject(reason);
        }
    });
    return d.promise;
}

function reloadNextMonth(createIfNeed) {
    var d = Q.defer();
    var nextMonthDate = new Date();
    nextMonthDate.setMonth(nowDate.getMonth() + 1);
    var label = moment(nextMonthDate).format("YYYYMM").toString();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_presence_' + label + '!A2:C'
    }).then(function (results) {
        for (var i = 0; results && i < results.length; i++) {
            var result = results[i];
            var lessonId = result[0];
            var chatId = result[1];
            var date = result[2];
            add(chatId, lessonId, false, date);
        }
        d.resolve(true);
    }).catch(function (reason) {
        if (reason.code && reason.code == 400 && createIfNeed) {
            createSheet(label).then(function () {
                return reloadNextMonth();
            }).then(function () {
                d.resolve(true);
            }).catch(function (reason) {
                d.reject(reason);
            });
        } else {
            d.reject(reason);
        }
    });
    return d.promise;
}

function update(lessonId) {
    var lessonDate = new Date();
    var lesson = persistence.lessons.getById(lessonId);
    lessonDate.setDate(lessonDate.getDate() - lessonDate.getDay() + parseInt(lesson.day));
    var nowDate = new Date();
    if (nowDate.getMonth() == lessonDate.getMonth()) {
        return updateThisMonth();
    } else {
        return updateNextMonth();
    }
}

function updateThisMonth() {
    var M_TAG = '.updateThisMonth';
    var d = Q.defer();
    var resource = {values: []};
    for (var i in presence.olderThisWeek) {
        var arrAll = presence.olderThisWeek[i];
        resource.values.push([arrAll[0], arrAll[1], arrAll[2]]);
    }
    var nowDate = new Date();
    var startWeekDate = getStartWeekDate();
    for (var lessonId in presence.byLessonId) {
        if (presence.byLessonId.hasOwnProperty(lessonId)) {
            var lessonDate = getLessonDate(lessonId);
            if (lessonDate.getMonth() == nowDate.getMonth()) {
                var subLesson = presence.byLessonId[lessonId];
                var arr = subLesson.arr;
                for (var j = 0; j < arr.length; j++) {
                    var data = arr[j];
                    var lessonSubDate = getLessonSubDate(data.date);
                    if (lessonSubDate.getTime() >= startWeekDate.getTime()) {
                        resource.values.push([data.lessonId, data.chatId, data.date]);
                    }
                }
            }
        }
    }
    var label = moment(nowDate).format("YYYYMM").toString();
    while (resource.values.length < 100) {
        resource.values.push(["", "", ""]);
    }
    sheet.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_presence_' + label + '!A2:C',
        valueInputOption: 'USER_ENTERED',
        resource: resource
    }).then(function () {
        d.resolve(true);
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
        d.reject(reason);
    });
    return d.promise;
}

function updateNextMonth() {
    var M_TAG = '.updateThisMonth';
    var d = Q.defer();
    var resource = {values: []};
    var nowDate = new Date();
    var startWeekDate = getStartWeekDate();
    for (var lessonId in presence.byLessonId) {
        if (presence.byLessonId.hasOwnProperty(lessonId)) {
            var lessonDate = getLessonDate(lessonId);
            if (lessonDate.getMonth() > nowDate.getMonth()) {
                var subLesson = presence.byLessonId[lessonId];
                var arr = subLesson.arr;
                for (var j = 0; j < arr.length; j++) {
                    var data = arr[j];
                    var lessonSubDate = getLessonSubDate(data.date);
                    if (lessonSubDate.getTime() >= startWeekDate.getTime()) {
                        resource.values.push([data.lessonId, data.chatId, data.date]);
                    }
                }
            }
        }
    }
    nowDate.setMonth(nowDate.getMonth() + 1);
    var label = moment(nowDate).format("YYYYMM").toString();
    while (resource.values.length < 100) {
        resource.values.push(["", "", ""]);
    }
    sheet.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_presence_' + label + '!A2:C',
        valueInputOption: 'USER_ENTERED',
        resource: resource
    }).then(function () {
        d.resolve(true);
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
        d.reject(reason);
    });
    return d.promise;
}

function createSheet(label) {
    var d = Q.defer();
    var resource = {};
    resource.requests = [
        {
            addSheet: {
                properties: {
                    title: label,
                    gridProperties: {
                        rowCount: 1,
                        columnCount: 3
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
            range: 'telegram_presence_' + label + '!A1:C1',
            valueInputOption: 'USER_ENTERED',
            resource: {values: [['lessonId', 'chatId', 'date']]}
        });
    }).then(function () {
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function getLessonDate(lessonId) {
    var lesson = persistence.lessons.getById(lessonId);
    var lessonDate = new Date();
    lessonDate.setDate(lessonDate.getDate() - lessonDate.getDay() + parseInt(lesson.day));
    return lessonDate;
}

function getLessonSubDate(date) {
    var dateStr = String(date);
    var lessonSubDate = new Date();
    lessonSubDate.setHours(0, 0, 0, 0);
    lessonSubDate.setFullYear(
        parseInt(dateStr.substring(0, 4)),
        parseInt(dateStr.substring(4, 6)) - 1,
        parseInt(dateStr.substr(6, 8))
    );
    return lessonSubDate;
}

function getStartWeekDate() {
    var startWeekDate = new Date();
    startWeekDate.setDate(startWeekDate.getDate() - startWeekDate.getDay());
    startWeekDate.setHours(0, 0, 0, 0);
    return startWeekDate;
}