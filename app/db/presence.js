var TAG = 'db.presence';
var Q = require('q');
var sheet = require('../handler/spreadsheet');
var localDb = {data: {}, count: 0};

function init() {
    var M_TAG = '.init';
    var d = Q.defer();
    sheet.get({
        spreadsheetId: '1AkIWJNEmkUO8J90CJJys0iYKZr17JoknDI4GpJoVCdY',
        range: '20171226_18!A2:B',
    }).then(function (results) {
        for (var i = 0; i < results.length; i++) {
            try {
                var result = results[i];
                localDb.data[result[0]] = !!result[1];
                localDb.count++;
            } catch (err) {
                console.warn(TAG + M_TAG, err);
            }
        }
    }).catch(function (reason) {
        d.reject(reason);
    });
    return d.promise;
}

module.exports = {
    init: init
};