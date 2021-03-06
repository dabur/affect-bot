/**
 * Created by nick on 14/05/18.
 */
var singleton = function singleton() {
    var TAG = 'app.main';
    var Q = require('q');
    var tel = require('./handler/telegram');
    var action = require('./action');
    var reloadTimerId;
    var notificationTimers = [];

    // Public //------------------------------------------------------------------------------------------------------//
    this.run = run;
    this.stop = stop;

    function run() {
        var d = Q.defer();
        tel.init(run).then(()=> {
            return action.init();
        }).then(()=> {
            initListeners();
            initReload();
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

    function initReload() {
        var M_TAG = 'initReload';
        if (reloadTimerId) {
            clearTimeout(reloadTimerId);
        }
        var nowDate = new Date();
        var nowDay = nowDate.getDay();
        var reloadDate = new Date();
        reloadDate.setHours(0, 0, 0, 0);
        reloadDate.setDate(reloadDate.getDate() + (7 - nowDay));
        var time = reloadDate.getTime() - nowDate.getTime();
        reloadTimerId = setTimeout(()=> {
            action.init().then(()=> {
                initReload();
                var reloadDate = new Date();
                console.info(TAG + M_TAG, 'complete date:', reloadDate);
            }).catch((reason)=> {
                console.error(TAG + M_TAG, 'failed reason:', reason);
            });
        }, time);
        resetNotificationTimers();
    }

    function resetNotificationTimers() {
        for (var i = 0; i < notificationTimers.length; i++) {
            var timer = notificationTimers[i];
            clearTimeout(timer.id);
        }
        notificationTimers = [];
        var notifications = action.getNotifications();
        for (var j = 0; j < notifications.length; j++) {
            var notification = notifications[j];
            addNotificationTimer(notification);
        }
    }

    function addNotificationTimer(notification) {
        var timerId = setTimeout(()=> {
            var chatIds = action.getNotificationChatIds(notification);
            if (chatIds.length > 0) {
                var txt = notification.txt;
                for (var i = 0; i < chatIds.length; i++) {
                    var chatId = chatIds[i];
                    tel.sendMessage(chatId, txt);
                }
            }
        }, notification.time);
        var timer = {id: timerId, notification};
        notificationTimers.push(timer);
    }

    function initListeners() {
        tel.onMessage(onMessage);
        tel.onCallbackQuery(onCallbackQuery);
    }

    function onCallbackQuery(msg) {
        if (msg.from.is_bot) {
            tel.answerCallbackQuery(msg.id);
        } else {
            var M_TAG = '.onCallbackQuery';
            var start = new Date().getTime();
            queryAction(msg).then(()=> {
                var end = new Date().getTime();
                if (end - start < 10000) {
                    return tel.answerCallbackQuery(msg.id);
                }
            }).catch((reason)=> {
                console.error(TAG + M_TAG, reason);
                var end = new Date().getTime();
                if (end - start < 10000) {
                    return tel.answerCallbackQuery(msg.id);
                }
            });
        }
    }

    function onMessage(msg) {
        if (!msg.from.is_bot) {
            var M_TAG = '.onMessage';
            var txt = msg.text;
            if (action.isAutoMessage(txt)) {
                action.message(txt, msg).then((result)=> {
                    if (result.inline_txt) {
                        if (result.txt) {
                            tel.sendMessage(msg.from.id, result.txt, result.keyboard).then(()=> {
                                tel.sendMessage(msg.from.id, result.inline_txt, result.inline_keyboard);
                            });
                        } else {
                            tel.sendMessage(msg.from.id, result.inline_txt, result.inline_keyboard);
                        }
                    } else {
                        if (result.txt) {
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
            if (result.inline_txt) {
                if (result.txt) {
                    return tel.sendMessage(msg.from.id, result.txt, result.keyboard).then(()=> {
                        return tel.sendMessage(msg.from.id, result.inline_txt, result.inline_keyboard);
                    });
                } else {
                    return tel.sendMessage(msg.from.id, result.inline_txt, result.inline_keyboard);
                }
            } else {
                if (result.txt) {
                    return tel.sendMessage(msg.from.id, result.txt, result.keyboard);
                } else {
                    return rejectedPromise(new Error('no txt'));
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