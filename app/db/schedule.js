var config = require('config');
var Q = require('q');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = config.spreadsheets.main;
var data = {
    schedule: {},
    lessons: {}
};

function reload() {
    var d = Q.defer();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_schedule!A2:F'
    }).then(function (results) {
        var schedule = {};
        var lessons = {};
        var id = 1;
        for (var i = 0; i < results.length; i++) {
            id++;
            var result = results[i];
            var day = result[0];
            if (!schedule.hasOwnProperty(day)) {
                schedule[day] = {}
            }
            var hour = result[1];
            if (!schedule[day].hasOwnProperty(hour)) {
                schedule[day][hour] = {}
            }
            var minute = result[2];
            if (!schedule[day][hour].hasOwnProperty(minute)) {
                schedule[day][hour][minute] = {}
            }
            schedule[day][hour][minute].id = id;
            schedule[day][hour][minute].day = day;
            schedule[day][hour][minute].hour = hour;
            schedule[day][hour][minute].minute = minute;
            schedule[day][hour][minute].label = result[3];
            schedule[day][hour][minute].duration = result[4];
            schedule[day][hour][minute].capacity = result[5];
            lessons[id] = schedule[day][hour][minute];
        }
        data.schedule = schedule;
        data.lessons = lessons;
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function getScheduler() {
    return data.schedule;
}

function getLessons() {
    return data.lessons;
}

module.exports = {
    reload: reload,
    getScheduler: getScheduler,
    getLessons: getLessons
};