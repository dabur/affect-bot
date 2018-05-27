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
    var date = new Date();
    var label = moment(date).format("YYYYMM").toString();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: label + '!A2:D',
    }).then(function (results) {
        for (var i = 0; results && i < results.length; i++) {
            var result = results[i];
            var week = result[0];
            var nowDate = new Date();
            var thisWeek = getWeek(nowDate);
            var lessonId = result[1];
            var chatId = result[2];
            var date = result[3];
            if (week < thisWeek) {
                presence.olderThisWeek.push([week, lessonId, chatId, date]);
            } else {
                if (week = thisWeek) {
                    var lessonDate = new Date();
                    var lesson = persistence.lessons.getById(lessonId);
                    lessonDate.setDate(lessonDate.getDate() - lessonDate.getDay() + parseInt(lesson.day));
                    var lessonWeek = getWeek(lessonDate);
                    if (lessonWeek > thisWeek) {
                        add(chatId, lessonId, false, date);
                    } else {
                        presence.olderThisWeek.push([week, lessonId, chatId, date]);
                    }
                } else {
                    add(chatId, lessonId, false, date);
                }
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
    var date = new Date();
    date.setMonth(date.getMonth() + 1);
    var label = moment(date).format("YYYYMM").toString();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: label + '!A2:D',
    }).then(function (results) {
        for (var i = 0; results && i < results.length; i++) {
            var result = results[i];
            var lessonId = result[1];
            var chatId = result[2];
            var date = result[3];
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
        resource.values.push([arrAll[0], arrAll[1], arrAll[2], arrAll[3]]);
    }
    var date = new Date();
    for (var lessonId in presence.byLessonId) {
        if (presence.byLessonId.hasOwnProperty(lessonId)) {
            var subLesson = presence.byLessonId[lessonId];
            var lesson = persistence.lessons.getById(lessonId);
            var lessoneDate = new Date(date.getTime());
            lessoneDate.setDate(lessoneDate.getDate() - date.getDay() + parseInt(lesson.day));
            var lessoneWeek = getWeek(lessoneDate);
            var arr = subLesson.arr;
            for (var j = 0; j < arr.length; j++) {
                var data = arr[j];
                if (date.getMonth() == lessoneDate.getMonth()) {
                    resource.values.push([lessoneWeek, data.lessonId, data.chatId, data.date]);
                }
            }
        }
    }
    var label = moment(date).format("YYYYMM").toString();
    while (resource.values.length < 100) {
        resource.values.push(["", "", "", ""]);
    }
    sheet.update({
        spreadsheetId: SPREADSHEET_ID,
        range: label + '!A2:D',
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
    var date = new Date();
    for (var lessonId in presence.byLessonId) {
        if (presence.byLessonId.hasOwnProperty(lessonId)) {
            var subLesson = presence.byLessonId[lessonId];
            var lesson = persistence.lessons.getById(lessonId);
            var lessoneDate = new Date(date.getTime());
            lessoneDate.setDate(lessoneDate.getDate() - date.getDay() + parseInt(lesson.day));
            var lessoneWeek = getWeek(lessoneDate);
            var arr = subLesson.arr;
            for (var j = 0; j < arr.length; j++) {
                var data = arr[j];
                if (lessoneDate.getMonth() > date.getMonth() || lessoneDate.getYear() > date.getYear()) {
                    resource.values.push([lessoneWeek, data.lessonId, data.chatId, data.date]);
                }
            }
        }
    }
    date.setMonth(date.getMonth() + 1);
    var label = moment(date).format("YYYYMM").toString();
    while (resource.values.length < 100) {
        resource.values.push(["", "", "", ""]);
    }
    sheet.update({
        spreadsheetId: SPREADSHEET_ID,
        range: label + '!A2:D',
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
                        rowCount: 100,
                        columnCount: 4
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
            range: label + '!A1:D1',
            valueInputOption: 'USER_ENTERED',
            resource: {values: [['week', 'lessonId', 'chatId', 'date']]}
        });
    }).then(function () {
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function getWeek(date) {
    return parseInt(parseInt(moment(date).format("DD").toString()) / 7);
}