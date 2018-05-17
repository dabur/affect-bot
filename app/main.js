/**
 * Created by nick on 14/05/18.
 */
var singleton = function singleton() {
    var TAG = 'app.main';
    var Q = require('q');
    var tel = require('./handler/telegram');
    var action = require('./action');

    // Public //------------------------------------------------------------------------------------------------------//
    this.run = run;
    this.stop = stop;

    function run() {
        var d = Q.defer();
        action.init().then(()=> {
            initListeners();
            d.resolve(true);
        }).catch(d.reject);
        return d.promise;
    }

    function stop() {
        var d = Q.defer();
        d.resolve(true);
        return d.promise;
    }

    //------------------------------------------------------------------------------------------------------// Public //

    function initListeners() {
        tel.onMessage(onMessage);
        tel.onCallbackQuery(onCallbackQuery);
    }

    function onCallbackQuery(msg) {
        if (msg.from.is_bot) {
            tel.answerCallbackQuery(msg.id);
        } else {
            var M_TAG = '.onCallbackQuery';
            queryAction(msg).then(()=> {
                return tel.answerCallbackQuery(msg.id);
            }).catch((reason)=> {
                console.error(TAG + M_TAG, reason);
                tel.answerCallbackQuery(msg.id);
            });
        }
    }

    function onMessage(msg) {
        if (!msg.from.is_bot) {
            var M_TAG = '.onMessage';
            var txt = msg.text;
            if (action.isAutoMessage(txt)) {
                action.message(txt, msg).then((result)=> {
                    if (result.inline_keyboard && result.inline_txt) {
                        if (result.keyboard && result.txt) {
                            tel.sendMessage(msg.from.id, result.txt, result.keyboard).then(()=> {
                                tel.sendMessage(msg.from.id, result.inline_txt, result.inline_keyboard);
                            });
                        } else {
                            tel.sendMessage(msg.from.id, result.inline_txt, result.inline_keyboard);
                        }
                    } else {
                        if (result.keyboard && result.txt) {
                            tel.sendMessage(msg.from.id, result.txt, result.keyboard);
                        }
                    }
                }).catch((reason)=> {
                    console.error(TAG + M_TAG, reason);
                    tel.sendMessage(msg.from.id, action.defaultTxt(msg), action.defaultKeyboard(msg));
                });
            } else {
                tel.sendMessage(msg.from.id, action.defaultTxt(msg), action.defaultKeyboard(msg));
            }
        }
    }

    function queryAction(msg) {
        if (!msg.data) {
            return rejectedPromise(new Error('empty msg data'));
        }
        return action.query(msg.data, msg).then((result)=> {
            if (result.inline_keyboard && result.inline_txt) {
                if (result.keyboard && result.txt) {
                    return tel.sendMessage(msg.from.id, result.txt, result.keyboard).then(()=> {
                        return tel.sendMessage(msg.from.id, result.inline_txt, result.inline_keyboard);
                    });
                } else {
                    return tel.sendMessage(msg.from.id, result.inline_txt, result.inline_keyboard);
                }
            } else {
                if (result.keyboard && result.txt) {
                    return tel.sendMessage(msg.from.id, result.txt, result.keyboard);
                } else {
                    return rejectedPromise(new Error('no txt or keyboard'));
                }
            }
        });
    }

    function rejectedPromise(reason) {
        var d = Q.defer();
        d.reject(reason);
        return d.promise;
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