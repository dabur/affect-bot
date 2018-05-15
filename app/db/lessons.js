var config = require('config');
var Q = require('q');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = config.spreadsheets.main;
var lessons = {
    byId: {},
    byDay: {}
};

// Public //----------------------------------------------------------------------------------------------------------//
module.exports = {
    init: init,
    getById: getById,
    getByDay: getByDay
};

function getById(id) {
    return lessons.byId[id];
}

function getByDay(day) {
    return lessons.byDay[day];
}

function init() {
    var d = Q.defer();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_lessons!A2:G'
    }).then(function (results) {
        var byId = {};
        var byDay = {};
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var id = result[0];
            var day = result[1];
            byId[id] = {
                id: id,
                day: day,
                hour: result[2],
                minute: result[3],
                label: result[4],
                duration: result[5],
                capacity: result[6]
            };
            if (!byDay[day]) {
                byDay[day] = [];
            }
            byDay[day].push(byId[id]);
        }
        lessons.byId = byId;
        lessons.byDay = byDay;
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}
//----------------------------------------------------------------------------------------------------------// Public //