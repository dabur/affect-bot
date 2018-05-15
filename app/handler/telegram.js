var singleton = function singleton() {
    var TAG = 'handler.telegram';
    var config = require('config');
    var TelegramBot = require('node-telegram-bot-api');
    var conn = new TelegramBot(config.telegram.token, {polling: true});

    // Public //------------------------------------------------------------------------------------------------------//
    this.onText = onText;
    this.onMessage = onMessage;
    this.sendMessage = sendMessage;
    this.onCallbackQuery = onCallbackQuery;
    this.answerCallbackQuery = answerCallbackQuery;

    function onText(regex, cb) {
        conn.onText(regex, cb);
    }

    function sendMessage(chatId, msg, options) {
        return conn.sendMessage(chatId, msg, options)
    }

    function onMessage(cb) {
        return conn.on('message', cb);
    }

    function onCallbackQuery(cb) {
        return conn.on('callback_query', cb);
    }

    function answerCallbackQuery(callbackQueryId, option) {
        return conn.answerCallbackQuery(callbackQueryId, option);
    }

    //------------------------------------------------------------------------------------------------------// Public //

    conn.on('polling_error', function (error) {
        console.warn(TAG + ' on(polling_error) error:', error);
    });

    conn.on('webhook_error', function (error) {
        console.warn(TAG + ' on(webhook_error) error:', error);
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