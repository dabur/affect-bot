var singleton = function singleton() {
    var TAG = 'handler.telegram';
    var config = require('config');
    var TelegramBot = require('node-telegram-bot-api');
    var conn = new TelegramBot(config.telegram.token, {polling: true});

    this.onText = function (regex, cb) {
        conn.onText(regex, cb);
    };

    this.sendMessage = function (chatId, msg, options) {
        return conn.sendMessage(chatId, msg, options)
    };

    this.onCallbackQuery = function (cb) {
        return conn.on('callback_query', cb);
    };

    this.answerCallbackQuery = function (callbackQueryId, option) {
        return conn.answerCallbackQuery(callbackQueryId, option);
    };

    conn.on('polling_error', function (error) {
        console.warn(error.code);
    });

    conn.on('webhook_error', function (error) {
        console.warn(error.code);
    });

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