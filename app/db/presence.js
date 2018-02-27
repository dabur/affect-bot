var TAG = 'db.presence';
var config = require('config');
var Q = require('q');
var moment = require('moment');
var sheet = require('../handler/spreadsheet');
var schedule = require('./schedule');
var SPREADSHEET_ID = config.spreadsheets.presence;
var nextDay = {subscribers: {}, lessons: {}};
var today = {subscribers: {}, lessons: {}};

function reload(users, lessons) {
    return reloadToday(users, lessons).then(function () {
        return reloadNextDay(users, lessons);
    });
}

function reloadToday(users, lessons) {
    var d = Q.defer();
    var date = new Date();
    reloadFromSheet(moment(date).format("YYYYMMDD").toString(), users, lessons).then(function (result) {
        today = result;
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function reloadNextDay(users, lessons) {
    var d = Q.defer();
    var date = new Date();
    date.setDate(date.getDate() + 1);
    reloadFromSheet(moment(date).format("YYYYMMDD").toString(), users, lessons).then(function (result) {
        nextDay = result;
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function reloadFromSheet(label, users, lessons) {
    var d = Q.defer();
    var ans = {label: label, subscribers: {}, lessons: {}};
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: label + '!A2:B',
    }).then(function (results) {
        for (var i = 0; results && i < results.length; i++) {
            var result = results[i];
            var lesson = lessons[result[0]];
            var user = users.get(result[1]);
            if (!ans.lessons[lesson.id]) {
                ans.lessons[lesson.id] = {
                    count: 0,
                    users: {}
                };
            }
            if (!ans.lessons[lesson.id].users[user.chatId]) {
                ans.lessons[lesson.id].users[user.chatId] = user;
                ans.lessons[lesson.id].count++;
            }
            ans.subscribers[user.chatId] = lesson;
        }
        d.resolve(ans);
    }).catch(function (reason) {
        if (reason.code && reason.code == 400) {
            d.resolve(ans);
        } else {
            d.reject(reason);
        }
    });
    return d.promise;
}

function updateToday() {
    return updateSheet(today);
}

function updateNextDay() {
    return updateSheet(nextDay);
}

function updateSheet(data) {
    var M_TAG = '.updateSheet';
    var d = Q.defer();
    var resource = {values: []};
    for (var lessonId in data.lessons) {
        if (data.lessons.hasOwnProperty(lessonId)) {
            var lesson = data.lessons[lessonId];
            for (var chattId in lesson.users) {
                if (lesson.users.hasOwnProperty(chattId)) {
                    var arr = [lessonId, chattId];
                    resource.values.push(arr);
                }
            }
        }
    }
    while (resource.values.length < 100) {
        resource.values.push(["", ""]);
    }
    sheet.update({
        spreadsheetId: SPREADSHEET_ID,
        range: data.label + '!A2:B',
        valueInputOption: 'USER_ENTERED',
        resource: resource
    }).then(function () {
        d.resolve(true);
    }).catch(function (reason) {
        if (reason.code && reason.code == 400) {
            createSheet(data.label).then(function () {
                return sheet.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: data.label + '!A2:B',
                    valueInputOption: 'USER_ENTERED',
                    resource: resource
                });
            }).then(function () {
                d.resolve(true);
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
                        columnCount: 2
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
            range: label + '!A1:B1',
            valueInputOption: 'USER_ENTERED',
            resource: {values: [['lessonId', 'chatId']]}
        });
    }).then(function () {
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function getSubscribedUserForToday(user) {
    return getSubscribedUser(user, today.subscribers);
}

function unsubscribeUserForToday(user, lesson) {
    return unsubscribeUser(user, lesson, today.lessons, today.subscribers).then(function () {
        return updateToday();
    });
}

function subscribeUserForToday(user, lesson) {
    return subscribeUser(user, lesson, today.lessons, today.subscribers).then(function () {
        return updateToday();
    });
}

function getSubscribedUserForNextDay(user) {
    return getSubscribedUser(user, nextDay.subscribers);
}

function unsubscribeUserForNextDay(user, lesson) {
    return unsubscribeUser(user, lesson, nextDay.lessons, nextDay.subscribers).then(function () {
        return updateNextDay();
    });
}

function subscribeUserForNextDay(user, lesson) {
    return subscribeUser(user, lesson, nextDay.lessons, nextDay.subscribers).then(function () {
        return updateNextDay();
    });
}

function getSubscribedUser(user, subscribers) {
    return subscribers[user.chatId];
}

function unsubscribeUser(user, lesson, lessons, subscribers) {
    var d = Q.defer();
    if (!lessons[lesson.id]) {
        d.resolve(false);
    } else {
        if (lessons[lesson.id].users[user.chatId]) {
            delete lessons[lesson.id].users[user.chatId];
            lessons[lesson.id].count--;
        }
        if (subscribers[user.chatId]) {
            delete subscribers[user.chatId];
        }
        d.resolve(true);
    }
    return d.promise;
}

function subscribeUser(user, lesson, lessons, subscribers) {
    var d = Q.defer();
    if (!lessons[lesson.id]) {
        lessons[lesson.id] = {
            count: 0,
            users: {}
        };
    }
    if (!lessons[lesson.id].users[user.chatId]) {
        lessons[lesson.id].users[user.chatId] = user;
        lessons[lesson.id].count++;
    }
    subscribers[user.chatId] = lesson;
    d.resolve(true);
    return d.promise;
}

function getSubscribeLessonsForToday() {
    return getSubscribeLessons(today.lessons);
}

function getSubscribeLessonsForNextDay() {
    return getSubscribeLessons(nextDay.lessons);
}

function getSubscribeLessons(lessons) {
    var ans = [];
    for (var i in lessons) {
        if (lessons.hasOwnProperty(i)) {
            var lesson = lessons[i];
            if (lesson.count > 0) {
                ans.push({
                    id: i,
                    count: lesson.count
                });
            }
        }
    }
    return ans;
}

function getSubscribersForToday(lesson) {
    return getSubscribers(lesson, today.lessons);
}

function getSubscribersForNextDay(lesson) {
    return getSubscribers(lesson, nextDay.lessons);
}

function getSubscribers(lesson, lessons) {
    var d = Q.defer();
    if (lessons[lesson.id] && lessons[lesson.id].count > 0) {
        d.resolve(lessons[lesson.id].users);
    } else {
        d.reject('no subscribers found');
    }
    return d.promise;
}

module.exports = {
    reload: reload,
    getSubscribedUserForToday: getSubscribedUserForToday,
    subscribeUserForToday: subscribeUserForToday,
    unsubscribeUserForToday: unsubscribeUserForToday,
    getSubscribeLessonsForToday: getSubscribeLessonsForToday,
    getSubscribersForToday: getSubscribersForToday,
    getSubscribedUserForNextDay: getSubscribedUserForNextDay,
    subscribeUserForNextDay: subscribeUserForNextDay,
    unsubscribeUserForNextDay: unsubscribeUserForNextDay,
    getSubscribeLessonsForNextDay: getSubscribeLessonsForNextDay,
    getSubscribersForNextDay: getSubscribersForNextDay
};
