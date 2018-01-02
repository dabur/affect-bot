var TAG = 'db.schedule';
var Q = require('q');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = '1vgQc_0JxixbBrLpd9BKau0RTFQ0OoNgOxxdCFwRQLr4';
var localDb = {};

function init() {
    var M_TAG = '.init';
    var d = Q.defer();
    sheet.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'telegram_schedule!A2:Y8',
    }).then(function (results) {
        for (var i = 0; i < results.length; i++) {
            try {
                var result = results[i];
                localDb[result[0]] = {};
                localDb[result[0]][0] = result[1] && result[1] != "" ? '"' + result[1] + '"' : false;
                localDb[result[0]][1] = result[2] && result[2] != "" ? '"' + result[2] + '"' : false;
                localDb[result[0]][2] = result[3] && result[3] != "" ? '"' + result[3] + '"' : false;
                localDb[result[0]][3] = result[4] && result[4] != "" ? '"' + result[4] + '"' : false;
                localDb[result[0]][4] = result[5] && result[5] != "" ? '"' + result[5] + '"' : false;
                localDb[result[0]][5] = result[6] && result[6] != "" ? '"' + result[6] + '"' : false;
                localDb[result[0]][6] = result[7] && result[7] != "" ? '"' + result[7] + '"' : false;
                localDb[result[0]][7] = result[8] && result[8] != "" ? '"' + result[8] + '"' : false;
                localDb[result[0]][8] = result[9] && result[9] != "" ? '"' + result[9] + '"' : false;
                localDb[result[0]][9] = result[10] && result[10] != "" ? '"' + result[10] + '"' : false;
                localDb[result[0]][10] = result[11] && result[11] != "" ? '"' + result[11] + '"' : false;
                localDb[result[0]][11] = result[12] && result[12] != "" ? '"' + result[12] + '"' : false;
                localDb[result[0]][12] = result[13] && result[13] != "" ? '"' + result[13] + '"' : false;
                localDb[result[0]][13] = result[14] && result[14] != "" ? '"' + result[14] + '"' : false;
                localDb[result[0]][14] = result[15] && result[15] != "" ? '"' + result[15] + '"' : false;
                localDb[result[0]][15] = result[16] && result[16] != "" ? '"' + result[16] + '"' : false;
                localDb[result[0]][16] = result[17] && result[17] != "" ? '"' + result[17] + '"' : false;
                localDb[result[0]][17] = result[18] && result[18] != "" ? '"' + result[18] + '"' : false;
                localDb[result[0]][18] = result[19] && result[19] != "" ? '"' + result[19] + '"' : false;
                localDb[result[0]][19] = result[20] && result[20] != "" ? '"' + result[20] + '"' : false;
                localDb[result[0]][20] = result[21] && result[21] != "" ? '"' + result[21] + '"' : false;
                localDb[result[0]][21] = result[22] && result[22] != "" ? '"' + result[22] + '"' : false;
                localDb[result[0]][22] = result[23] && result[23] != "" ? '"' + result[23] + '"' : false;
                localDb[result[0]][23] = result[24] && result[24] != "" ? '"' + result[24] + '"' : false;
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

function getAll() {
    return localDb;
}

module.exports = {
    init: init,
    getAll: getAll
};