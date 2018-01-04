var TAG = 'bot';
var config = require('config');
var Q = require('q');
var tel = require('./handler/telegram');
var model = require('./db/model');
var CRON_JOB_MESSAGE = true;
var admins = {};
for (var a = 0; a < config.admins.length; a++) {
    admins[config.admins[a]] = {chatId: config.admins[a]};
}
var MAIN_MENU = {
    reply_markup: JSON.stringify({
        inline_keyboard: [[
            {
                text: 'השיעורים שאני רשומה',
                callback_data: 'menu::mysubscription'
            },
            {
                text: 'השיעורים של היום',
                callback_data: 'menu::todaylessons'
            }
        ]]
    })
};

var ADMIN_MAIN_MENU = {
    reply_markup: JSON.stringify({
        inline_keyboard: [[
            {
                text: 'רענון מערכת',
                callback_data: 'menu::schedulereload'
            },
            {
                text: 'השיעורים של היום',
                callback_data: 'menu::todaylessons'
            }
        ]]
    })
};

function queryReaction(msg) {
    if (!msg.data) {
        return rejectedPromise('no data');
    }
    if (msg.data.startsWith('menu::')) {
        return queryMenuReaction(msg);
    } else if (msg.data.startsWith('ans::')) {
        return queryAnsReaction(msg);
    } else {
        return rejectedPromise('unknown query prefix');
    }

}

function queryMenuReaction(msg) {
    var yesData = msg.data.split('::');
    var todayHours = model.schedule.getTodayHours();
    if (yesData.length == 2) {
        if (yesData[1] == 'mysubscription') {
            var result = model.presence.getStatus(msg.from.id, todayHours);
            if (!result.options) {
                result.options = isAdmin(msg.from.id) ? ADMIN_MAIN_MENU : MAIN_MENU;
            }
            return tel.sendMessage(msg.from.id, result.msg, result.options);
        }
        if (yesData[1] == 'todaylessons') {
            if (isAdmin(msg.from.id)) {
                var nextLessons = model.presence.getNext(todayHours);
                return tel.sendMessage(msg.from.id, nextLessons.message, nextLessons.options);
            } else {
                var keyboard = [[]];
                var nowHour = new Date().getHours();
                for (var hour in todayHours) {
                    if (todayHours.hasOwnProperty(hour)) {
                        if (todayHours[hour] && nowHour < hour) {
                            if (keyboard[keyboard.length - 1].length > 0) {
                                keyboard.push([]);
                            }
                            keyboard[keyboard.length - 1].push(
                                {
                                    text: todayHours[hour].label,
                                    callback_data: 'ans::' + hour + '::yes'
                                }
                            );
                        }
                    }
                }
                var options;
                var message1 = 'תלחצי על שיעור על מנת להירשם אליו';
                if (keyboard.length == 1 && keyboard[0].length == 0) {
                    message1 = 'אין שיעורים להיום';
                } else {
                    options = {
                        reply_markup: JSON.stringify({
                            inline_keyboard: keyboard
                        })
                    };
                }
                return tel.sendMessage(msg.from.id, message1, options);
            }
        }
        if (yesData[1] == 'schedulereload') {
            if (isAdmin(msg.from.id)) {
                return model.schedule.reload().then(function () {
                    return tel.sendMessage(msg.from.id, "מערכת נטענה בהצלחה!");
                });
            }
        }
    }
    if (yesData.length == 3) {
        if (yesData[2] == 'hoursubscribers') {
            if (isAdmin(msg.from.id)) {
                var reqHour = parseInt(yesData[1]);
                if (reqHour) {
                    var message2 = todayHours[reqHour].label + ' רשומות:' + '\n';
                    var chatIds = model.presence.getHourSubscribers(reqHour);
                    for (var i = 0; i < chatIds.length; i++) {
                        var user = model.user.get(chatIds[i]);
                        message2 += user.firstName + ' ' + user.lastName + '\n';
                    }
                    return tel.sendMessage(msg.from.id, message2);
                }
            }
        }
    }
    return rejectedPromise('unknown menu query');
}

function queryAnsReaction(msg) {
    var todayHours = model.schedule.getTodayHours();
    if (msg.data.endsWith('::yes')) {
        var yesData = msg.data.split('::');
        if (yesData.length != 3) {
            return rejectedPromise('unknown query format');
        }
        var yesHour = yesData[1];
        if (yesHour == "0") {
            yesHour = 0;
        } else {
            yesHour = Number(yesHour);
        }
        if (!todayHours[yesHour]) {
            return tel.sendMessage(msg.from.id, 'אין שיעורים היום בשעה מבוקשת');
        }
        if (todayHours[yesHour].currently >= todayHours[yesHour].limit) {
            return tel.sendMessage(msg.from.id, 'ההרשמה נכשלה מהסיבה שכבר אין מקום');
        }
        return model.presence.add(msg.from.id, yesHour).then(function () {
            var options = {
                reply_markup: JSON.stringify({
                    inline_keyboard: [[
                        {
                            text: 'הסר',
                            callback_data: 'ans::' + yesHour + '::no'
                        }
                    ]]
                })
            };
            model.schedule.increaseCurrently(yesHour);
            return tel.sendMessage(msg.from.id, 'נרשמת ל-' + todayHours[yesHour].label, options);
        }).catch(function (reason) {
            if (reason == 101) {
                return tel.sendMessage(msg.from.id, 'ההרשמה נכשלה מהסיבה שכבר היית רשומה היום');
            }
        });
    } else if (msg.data.endsWith('::no')) {
        var noData = msg.data.split('::');
        if (noData.length != 3) {
            return rejectedPromise('unknown query format');
        }
        var noHour = noData[1];
        if (noHour == "0") {
            noHour = 0;
        } else {
            noHour = Number(noHour);
        }
        if (!todayHours[noHour]) {
            return rejectedPromise('אין שיעורים היום בשעה מבוקשת');
        }
        return model.presence.remove(msg.from.id, noHour).then(function () {
            var menu = isAdmin(msg.from.id) ? ADMIN_MAIN_MENU : MAIN_MENU;
            model.schedule.decreaseCurrently(noHour);
            return tel.sendMessage(msg.from.id, 'הסרת רשום מ-' + todayHours[noHour].label, menu);
        }).catch(function (reason) {
            if (reason == 201) {
                return tel.sendMessage(msg.from.id, 'הסרת רשום נכשל מהסיבה שאי אפשר להסיר רשום משעה שכבר עברה');
            }
        });
    }
    return rejectedPromise('unknown ans query');
}

function rejectedPromise(reason) {
    var d = Q.defer();
    d.reject(reason);
    return d.promise;
}

function sendSubscriptionSurvey() {
    var nowHour = new Date().getHours();
    var todayHours = model.schedule.getTodayHours();
    if (todayHours[nowHour + 1] && todayHours[nowHour + 1].currently < todayHours[nowHour + 1].limit) {
        sendHoueSubscriptionSurvey(todayHours[nowHour + 1].label, nowHour + 1);
    }
}

function sendHoueSubscriptionSurvey(label, hour) {
    var keyboard = [[
        {
            text: 'כן',
            callback_data: 'ans::' + hour + '::yes'
        }
    ]];
    var options = {
        reply_markup: JSON.stringify({
            inline_keyboard: keyboard
        })
    };
    var users = model.user.getAll();
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        if (!model.presence.isSubscribed(user.chatId) && !isAdmin(user.chatId)) {
            tel.sendMessage(user.chatId, 'רוצה להירשם ל-' + label + ' ?', options);
        }
    }
}

function isAdmin(chatId) {
    return !!admins[chatId];
}

function timer(iT) {
    if (iT) {
        clearTimeout(iT);
    }
    var nowDate = new Date();
    var roundDate = new Date();
    roundDate.setMinutes(1, 0, 0);
    roundDate.setHours(roundDate.getHours() + 1);
    var surveyTime = roundDate.getTime() - nowDate.getTime();
    // debug
    // var surveyTime = 5000;
    iT = setTimeout(function () {
        if (CRON_JOB_MESSAGE) {
            sendSubscriptionSurvey();
            timer(iT);
        }
    }, surveyTime);
}

function setListeners() {
    tel.onMessage(function (msg) {
        switch (msg.text) {
            case '/start':
                return;
            default:
                return tel.sendMessage(
                    msg.from.id,
                    'הקבוצה הינה אוטומטית שמטרתה היא הרשמה מסודר לשיעורים שלנו\n' +
                    'כדי להתכתב עם כל חברי Affect השתמשי בקבוצת ה-WhatsApp שלנו!',
                    MAIN_MENU
                );
        }
    });

    tel.onCallbackQuery(function (msg) {
        var M_TAG = '.onCallbackQuery';
        queryReaction(msg).then(function () {
            return tel.answerCallbackQuery(msg.id);
        }).catch(function (reason) {
            console.error(TAG + M_TAG, reason);
            tel.answerCallbackQuery(msg.id);
        });
    });

    tel.onText(/\/start/, function (msg) {
        if (!msg.from.is_bot) {
            model.user.add({
                chatId: msg.from.id,
                username: msg.from.username,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name,
                languageCode: msg.from.language_code
            });
            var user = model.user.get(msg.from.id);
            var menu = isAdmin(msg.from.id) ? ADMIN_MAIN_MENU : MAIN_MENU;
            tel.sendMessage(msg.from.id, 'היי ' + user.firstName + '!\n' + 'ברוכה הבאה לקבוצת רישום לשיעורים של Affect', menu);
        }
    });
}

function run() {
    var M_TAG = '.run';
    console.info('NODE_ENV:', process.env.NODE_ENV, 'NTBA_FIX_319:', process.env.NTBA_FIX_319);
    model.init().then(function () {
        setListeners();
        timer();
        console.info('Affect telegram bot started!');
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
    });
}

module.exports.run = run;