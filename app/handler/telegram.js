var singleton = function singleton() {
    var TAG = 'handler.telegram';
    var config = require('config');
    var Q = require('q');
    var TelegramBot = require('node-telegram-bot-api');
    var conn;

    // Public //------------------------------------------------------------------------------------------------------//
    this.init = init;
    this.onText = onText;
    this.onMessage = onMessage;
    this.sendMessage = sendMessage;
    this.onCallbackQuery = onCallbackQuery;
    this.answerCallbackQuery = answerCallbackQuery;

    function init(onFail) {
        var d = Q.defer();
        conn = new TelegramBot(config.telegram.token, {polling: true});
        conn.on('polling_error', function (error) {
            console.warn(TAG + ' on(polling_error) error:', error);
            if (error.code && error.code == 'EFATAL') {
                conn = new TelegramBot(config.telegram.token, {polling: true});
                if (onFail) {
                    onFail();
                }
            }
        });

        conn.on('webhook_error', function (error) {
            console.warn(TAG + ' on(webhook_error) error:', error);
        });
        d.resolve(true);
        return d.promise;
    }

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