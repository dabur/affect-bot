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
    getByLessonId: getByLessonId,
    getByChatId: getByChatId
};

function init(users, lessons) {
    persistence.users = users;
    persistence.lessons = lessons;
    var date = new Date();
    var label = moment(date).format("YYYYMM").toString();
    return reloadByLabel(label, users, lessons, true);
}

function add(chatId, lessonId) {
    if (presence.users.get(chatId) && presence.lessons.getById(lessonId)) {
        var data = {chatId, lessonId};
        if (!presence.byLessonId[lessonId]) {
            presence.byLessonId[lessonId] = {obj: {}, arr: []};
        }
        presence.byLessonId[lessonId].obj[chatId] = data;
        presence.byLessonId[lessonId].arr.push(data);


        if (!presence.byChatId[chatId]) {
            presence.byChatId[chatId] = {obj: {}, arr: []};
        }
        presence.byChatId[chatId].obj[lessonId] = data;
        presence.byChatId[chatId].arr.push(data);
    }
    update();
}

function getByLessonId(lessonId) {
    return presence.byLessonId.obj[lessonId]
}

function getByChatId(chatId) {
    return presence.byChatId.obj[chatId];
}
//----------------------------------------------------------------------------------------------------------// Public //

function clear() {
    presence.byLessonId = {};
    presence.byChatId = {};
    presence.allButThisWeek = [];
}

function reloadByLabel(label, users, lessons, createIfNeed) {
    var d = Q.defer();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: label + '!A2:C',
    }).then(function (results) {
        clear();
        for (var i = 0; results && i < results.length; i++) {
            var result = results[i];
            var week = result[0];
            var date = new Date();
            var thisWeek = parseInt(moment(date).format("DD").toString()) % 7;
            var lessonId = result[1];
            var chatId = result[2];
            if (thisWeek == week) {
                add(chatId, lessonId);
            } else {
                presence.allButThisWeek.push([week, lessonId, chatId]);
            }
        }
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
        if (presence.byChatId.hasOwnProperty(chatId)) {
            var arr = presence.byChatId[chatId].arr;
            for (var j = 0; j < arr.length; j++) {
                var data = arr[j];
                resource.values.push([week, data.lessonId, data.chatId]);
            }
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
