var TAG = 'db.presence';
var Q = require('q');
var moment = require('moment');
var sheet = require('../handler/spreadsheet');
var SPREADSHEET_ID = '1AkIWJNEmkUO8J90CJJys0iYKZr17JoknDI4GpJoVCdY';
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