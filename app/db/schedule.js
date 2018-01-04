var TAG = 'db.schedule';
var Q = require('q');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = '1vgQc_0JxixbBrLpd9BKau0RTFQ0OoNgOxxdCFwRQLr4';
var todayHours = {};
var lessonLimits = {};

function init() {
    var d = Q.defer();
    reload().then(function () {
        timer();
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function timer(iT) {
    if (iT) {
        clearTimeout(iT);
    }
    var nowDate = new Date();
    var roundDate = new Date();
    roundDate.setHours(0, 0, 1, 0);
    roundDate.setDate(roundDate.getDate() + 1);
    var reloadTime = roundDate.getTime() - nowDate.getTime();
    iT = setTimeout(function () {
        reload();
        timer(iT);
    }, reloadTime);
}

function reload() {
    var M_TAG = '.reload';
    var d = Q.defer();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'lesson_limit!A2:B',
    }).then(function (results) {
        for (var i = 0; i < results.length; i++) {
            try {
                var result = results[i];
                lessonLimits[result[0]] = parseInt(result[1]);
            } catch (err) {
                console.warn(TAG + M_TAG, err);
            }
        }
        return sheet.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'telegram_schedule!A2:Y8',
        });
    }).then(function (results) {
        var nowDay = new Date().getDay();
        for (var i = 0; i < results.length; i++) {
            try {
                var result = results[i];
                if (result[0] == nowDay) {
                    todayHours = {};
                    todayHours[0] = result[1] && result[1] != "" ? getHourObject(result[1]) : false;
                    todayHours[1] = result[2] && result[2] != "" ? getHourObject(result[2]) : false;
                    todayHours[2] = result[3] && result[3] != "" ? getHourObject(result[3]) : false;
                    todayHours[3] = result[4] && result[4] != "" ? getHourObject(result[4]) : false;
                    todayHours[4] = result[5] && result[5] != "" ? getHourObject(result[5]) : false;
                    todayHours[5] = result[6] && result[6] != "" ? getHourObject(result[6]) : false;
                    todayHours[6] = result[7] && result[7] != "" ? getHourObject(result[7]) : false;
                    todayHours[7] = result[8] && result[8] != "" ? getHourObject(result[8]) : false;
                    todayHours[8] = result[9] && result[9] != "" ? getHourObject(result[9]) : false;
                    todayHours[9] = result[10] && result[10] != "" ? getHourObject(result[10]) : false;
                    todayHours[10] = result[11] && result[11] != "" ? getHourObject(result[11]) : false;
                    todayHours[11] = result[12] && result[12] != "" ? getHourObject(result[12]) : false;
                    todayHours[12] = result[13] && result[13] != "" ? getHourObject(result[13]) : false;
                    todayHours[13] = result[14] && result[14] != "" ? getHourObject(result[14]) : false;
                    todayHours[14] = result[15] && result[15] != "" ? getHourObject(result[15]) : false;
                    todayHours[15] = result[16] && result[16] != "" ? getHourObject(result[16]) : false;
                    todayHours[16] = result[17] && result[17] != "" ? getHourObject(result[17]) : false;
                    todayHours[17] = result[18] && result[18] != "" ? getHourObject(result[18]) : false;
                    todayHours[18] = result[19] && result[19] != "" ? getHourObject(result[19]) : false;
                    todayHours[19] = result[20] && result[20] != "" ? getHourObject(result[20]) : false;
                    todayHours[20] = result[21] && result[21] != "" ? getHourObject(result[21]) : false;
                    todayHours[21] = result[22] && result[22] != "" ? getHourObject(result[22]) : false;
                    todayHours[22] = result[23] && result[23] != "" ? getHourObject(result[23]) : false;
                    todayHours[23] = result[24] && result[24] != "" ? getHourObject(result[24]) : false;
                    break;
                }
            } catch (err) {
                console.warn(TAG + M_TAG, err);
            }
        }
        d.resolve(true);
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

function getHourObject(lesson) {
    var label = '"' + lesson + '"';
    var limit = 16;
    for (var l in lessonLimits) {
        if (lessonLimits.hasOwnProperty(l) && lesson.indexOf(l) != -1) {
            limit = lessonLimits[l];
            break;
        }
    }
    return {
        label: label,
        limit: limit,
        currently: 0
    };
}

function getTodayHours() {
    return todayHours;
}

function increaseCurrently(hour) {
    if (todayHours[hour]) {
        todayHours[hour].currently++;
    }
}

function decreaseCurrently(hour) {
    if (todayHours[hour]) {
        todayHours[hour].currently--;
    }
}

module.exports = {
    init: init,
    getTodayHours: getTodayHours,
    reload: reload,
    increaseCurrently: increaseCurrently,
    decreaseCurrently: decreaseCurrently
};