var config = require('config');
var Q = require('q');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = config.spreadsheets.main;
var lessons = {
    byId: {},
    byDay: {},
    all: []
};

// Public //----------------------------------------------------------------------------------------------------------//
module.exports = {
    init: init,
    getById: getById,
    getByDay: getByDay,
    getAll: getAll
};

function getByDay(day) {
    return lessons.byDay[day];
}

function getById(id) {
    return lessons.byId[id];
}

function getAll() {
    return lessons.all;
}

function init() {
    var d = Q.defer();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_lessons!A2:G'
    }).then(function (results) {
        var byId = {};
        var byDay = {};
        var all = [];
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var id = result[0];
            var day = result[1];
            var lesson = {
                id: id,
                day: day,
                hour: result[2],
                minute: result[3],
                label: result[4],
                duration: result[5],
                capacity: result[6]
            };
            byId[id] = lesson;
            all.push(lesson);
            if (!byDay[day]) {
                byDay[day] = [];
            }
            byDay[day].push(lesson);
        }
        lessons.byId = byId;
        lessons.byDay = byDay;
        lessons.all = all;
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}
//----------------------------------------------------------------------------------------------------------// Public //