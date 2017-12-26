var singleton = function singleton() {
    var TAG = 'handler.telegram';
    var config = require('config');
    var TelegramBot = require('node-telegram-bot-api');
    var conn = new TelegramBot(config.telegram.token, {polling: true});

    this.onText = function (regex, cb) {
        conn.onText(regex, cb);
    };

    this.sendMessage = function (chatId, msg) {
        conn.sendMessage(chatId, msg);
    };

    this.onMessage = function (cb) {
        conn.on('message', cb);
    };

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