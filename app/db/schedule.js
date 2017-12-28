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
                localDb[result[0]][0] = result[1] == '1';
                localDb[result[0]][1] = result[2] == '1';
                localDb[result[0]][2] = result[3] == '1';
                localDb[result[0]][3] = result[4] == '1';
                localDb[result[0]][4] = result[5] == '1';
                localDb[result[0]][5] = result[6] == '1';
                localDb[result[0]][6] = result[7] == '1';
                localDb[result[0]][7] = result[8] == '1';
                localDb[result[0]][8] = result[9] == '1';
                localDb[result[0]][9] = result[10] == '1';
                localDb[result[0]][10] = result[11] == '1';
                localDb[result[0]][11] = result[12] == '1';
                localDb[result[0]][12] = result[13] == '1';
                localDb[result[0]][13] = result[14] == '1';
                localDb[result[0]][14] = result[15] == '1';
                localDb[result[0]][15] = result[16] == '1';
                localDb[result[0]][16] = result[17] == '1';
                localDb[result[0]][17] = result[18] == '1';
                localDb[result[0]][18] = result[19] == '1';
                localDb[result[0]][19] = result[20] == '1';
                localDb[result[0]][20] = result[21] == '1';
                localDb[result[0]][21] = result[22] == '1';
                localDb[result[0]][22] = result[23] == '1';
                localDb[result[0]][23] = result[24] == '1';
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