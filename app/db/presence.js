var TAG = 'db.presence';
var config = require('config');
var Q = require('q');
var moment = require('moment');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = config.spreadsheets.presence;
var presence = {
    byLessonId: {},
    byChatId: {},
    allButThisWeek: []
};

// Public //----------------------------------------------------------------------------------------------------------//
module.exports = {
    reload: reload,
    add: add,
    getByLessonId: getByLessonId,
    getByChatId: getByChatId
};

function reload(users, lessons) {
    var date = new Date();
    var label = moment(date).format("YYYYMM").toString();
    return reloadByLabel(label, users, lessons, true);
}

function add(chatId, lessonId) {
    //duplicate check
    var obj = {chatId: chatId, lessonId: lessonId};
    if (!presence.byLessonId[lessonId]) {
        presence.byLessonId[lessonId] = [];
    }
    presence.byLessonId[lessonId].push(chatId);
    if (!presence.byChatId[chatId]) {
        presence.byChatId[chatId] = [];
    }
    presence.byChatId[chatId].push(lessonId);
    update();
}

function getByLessonId(lessonId) {
    return presence.byLessonId[lessonId]
}

function getByChatId(chatId) {
    return presence.byChatId[chatId];
}
//----------------------------------------------------------------------------------------------------------// Public //

function reloadByLabel(label, users, lessons, createIfNeed) {
    var d = Q.defer();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: label + '!A2:C',
    }).then(function (results) {
        var byLessonId = {};
        var byChatId = {};
        var allButThisWeek = [];
        for (var i = 0; results && i < results.length; i++) {
            var result = results[i];
            var week = result[0];
            var date = new Date();
            var thisWeek = parseInt(moment(date).format("DD").toString()) % 7;
            var lessonId = result[1];
            var chatId = result[2];
            if (thisWeek == week) {
                if (users.byChatId[chatId] && lessons.byId[lessonId]) {
                    if (!byLessonId[lessonId]) {
                        byLessonId[lessonId] = [];
                    }
                    byLessonId[lessonId].push(chatId);
                    if (!byChatId[chatId]) {
                        byChatId[chatId] = [];
                    }
                    byChatId[chatId].push(lessonId);
                }
            } else {
                allButThisWeek.push([week, lessonId, chatId]);
            }
        }
        presence.byLessonId = byLessonId;
        presence.byChatId = byChatId;
        presence.allButThisWeek = allButThisWeek;
        d.resolve(true);
    }).catch(function (reason) {
        if (reason.code && reason.code == 400 && createIfNeed) {
            createSheet(label).then(function () {
                return reloadByLabel(label, users, lessons);
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

function update() {
    var M_TAG = '.update';
    var d = Q.defer();
    var resource = {values: []};
    for (var i in presence.allButThisWeek) {
        var arrAll = presence.allButThisWeek[i];
        resource.values.push([arrAll[0], arrAll[1], arrAll[2]]);
    }
    var date = new Date();
    var week = parseInt(moment(date).format("DD").toString()) % 7;
    for (var chatId in presence.byChatId) {
        var byChatId = presence.byChatId[chatId];
        for (var j = 0; j < byChatId.length; j++) {
            var lessonId = byChatId[j];
            resource.values.push([week, lessonId, chatId]);
        }
    }
    while (resource.values.length < 100) {
        resource.values.push(["", "", ""]);
    }
    var label = moment(date).format("YYYYMM").toString();
    sheet.update({
        spreadsheetId: SPREADSHEET_ID,
        range: label + '!A2:C',
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
            range: label + '!A1:C1',
            valueInputOption: 'USER_ENTERED',
            resource: {values: [['week', 'lessonId', 'chatId']]}
        });
    }).then(function () {
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}
