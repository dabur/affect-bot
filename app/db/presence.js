var TAG = 'db.presence';
var Q = require('q');
var moment = require('moment');
var sheet = require('../handler/spreadsheet');
var localDb = {data: {}};
var HOURS = [];

function init(hours) {
    var M_TAG = '.init';
    var d = Q.defer();
    var yyyymmdd = moment(new Date()).format("YYYYMMDD_HH").toString();
    localDb.data = {
        label: yyyymmdd,
        hours: {}
    };
    for (var i = 0; i < hours.length; i++) {
        var hour = hours[i];
        HOURS.push(hour);
        localDb.data.hours[HOURS[HOURS.length - 1]] = 0;
    }
    d.resolve(true);
    //init from spreadsheet offline state
    // sheet.get({
    //     spreadsheetId: '1AkIWJNEmkUO8J90CJJys0iYKZr17JoknDI4GpJoVCdY',
    //     range: '20171226_18!A2:B',
    // }).then(function (results) {
    //     for (var i = 0; i < results.length; i++) {
    //         try {
    //             var result = results[i];
    //             localDb.data[result[0]] = !!result[1];
    //         } catch (err) {
    //             console.warn(TAG + M_TAG, err);
    //         }
    //     }
    //     d.resolve(true);
    // }).catch(function (reason) {
    //     d.reject(reason);
    // });
    return d.promise;
}

function add(chatId, hour) {
    var M_TAG = '.add';
    var d = Q.defer();
    var yyyymmdd = moment(new Date()).format("YYYYMMDD_HH").toString();
    if (yyyymmdd != localDb.data.label) {
        init(HOURS);
    } else {
        if (localDb.data.hours[hour] != undefined) {
            localDb.data.hours[hour]++;
        }
        console.log(TAG + M_TAG, 'yyyymmdd_hh:', yyyymmdd + '_' + hour, 'chatId:', chatId);
    }
    d.resolve(true);
    return d.promise;
}

function remove(chatId, hour) {
    var M_TAG = '.remove';
    var d = Q.defer();
    var yyyymmdd = moment(new Date()).format("YYYYMMDD_HH").toString();
    if (yyyymmdd != localDb.data.label) {
        init(HOURS);
    } else {
        if (localDb.data.hours[hour] != undefined && localDb.data.hours[hour] > 0) {
            localDb.data.hours[hour]--;
        }
        console.log(TAG + M_TAG, 'yyyymmdd_hh:', yyyymmdd + '_' + hour, 'chatId:', chatId);
    }
    d.resolve(true);
    return d.promise;
}

function getStatus(hours) {
    var ans = 'Hour - Subscribers:\n';
    for (var i = 0; i < hours.length; i++) {
        var hour = hours[i];
        if (localDb.data.hours[hour] != undefined) {
            ans += ' ' + hour + ':00 - ' + localDb.data.hours[hour] + '\n'
        }
    }
    return ans;
}

module.exports = {
    init: init,
    add: add,
    remove: remove,
    getStatus: getStatus
};