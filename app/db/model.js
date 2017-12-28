var singleton = function singleton() {
    var TAG = 'db.model';
    var sheet = require('../handler/spreadsheet');
    var user = require('./user');
    var presence = require('./presence');
    var schedule = require('./schedule');

    this.user = user;
    this.presence = presence;
    this.schedule = schedule;
    this.init = init;

    function init() {
        return sheet.init().then(function () {
            return schedule.init();
        }).then(function () {
            return user.init();
        }).then(function () {
            return presence.init();
        });
    }

    if (singleton.caller != singleton.getInstance) {
        console.error(TAG, 'This object cannot be instantiated');
        throw new Error('This object cannot be instantiated')
    }
};

singleton.instance = null;

singleton.getInstance = function () {
    if (this.instance === null) {
        this.instance = new singleton()
    }
    return this.instance
};

module.exports = singleton.getInstance();