var TAG = 'bot';
var Q = require('q');
var tel = require('./handler/telegram');
var model = require('./db/model');
var CRON_JOB_MESSAGE = true;
var admins = {
    505761652: {
        chatId: 505761652
    }
};
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
                text: 'השיעורים של היום',
                callback_data: 'menu::todaylessons'
            }
        ]]
    })
};

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
    if (yesData.length != 2) {
        return rejectedPromise('unknown query format');
    }
    var nowDate = new Date();
    var nowDay = nowDate.getDay();
    var sch = model.schedule.getAll();
    if (msg.data.endsWith('::mysubscription')) {
        var result = model.presence.getStatus(msg.from.id, sch[nowDay]);
        if (!result.options) {
            result.options = isAdmin(msg.from.id) ? ADMIN_MAIN_MENU : MAIN_MENU;
        }
        return tel.sendMessage(msg.from.id, result.msg, result.options);
    }
    if (msg.data.endsWith('::todaylessons')) {
        if (isAdmin(msg.from.id)) {
            return tel.sendMessage(msg.from.id, model.presence.getNext(sch[nowDay]));
        } else {
            var keyboard = [[]];
            var nowHour = nowDate.getHours();
            for (var hour in sch[nowDay]) {
                if (sch[nowDay].hasOwnProperty(hour)) {
                    if (sch[nowDay][hour] && nowHour < hour) {
                        if (keyboard[keyboard.length - 1].length > 0) {
                            keyboard.push([]);
                        }
                        keyboard[keyboard.length - 1].push(
                            {
                                text: sch[nowDay][hour],
                                callback_data: 'ans::' + hour + '::yes'
                            }
                        );
                    }
                }
            }
            var options = {
                reply_markup: JSON.stringify({
                    inline_keyboard: keyboard
                })
            };
            return tel.sendMessage(msg.from.id, 'תלחצי על שיעור על מנת להירשם אליו', options);
        }
    }
    return rejectedPromise('unknown menu query');
}

function queryAnsReaction(msg) {
    var nowDay = new Date().getDay();
    var sch = model.schedule.getAll();
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
        if (!sch[nowDay][yesHour]) {
            return tel.sendMessage(msg.from.id, 'אין שיעורים היום בשעה מבוקשת');
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
            return tel.sendMessage(msg.from.id, 'נרשמת ל-' + sch[nowDay][yesHour], options);
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
        if (!sch[nowDay][noHour]) {
            return rejectedPromise('אין שיעורים היום בשעה מבוקשת');
        }
        return model.presence.remove(msg.from.id, noHour).then(function () {
            var menu = isAdmin(msg.from.id) ? ADMIN_MAIN_MENU : MAIN_MENU;
            return tel.sendMessage(msg.from.id, 'הסרת רשום מ-' + sch[nowDay][noHour], menu);
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
    var nowDate = new Date();
    var nowHour = nowDate.getHours();
    var nowDay = new Date().getDay();
    var sch = model.schedule.getAll();
    if (sch[nowDay][nowHour + 1]) {
        sendHoueSubscriptionSurvey(sch[nowDay][nowHour + 1], nowHour + 1);
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
    var surveyTime = roundDate - nowDate;
    // debug
    // var surveyTime = 5000;
    iT = setTimeout(function () {
        if (CRON_JOB_MESSAGE) {
            sendSubscriptionSurvey();
            timer(iT);
        }
    }, surveyTime);
}

function run() {
    var M_TAG = '.run';
    console.info('NODE_ENV:', process.env.NODE_ENV, 'NTBA_FIX_319:', process.env.NTBA_FIX_319);
    model.init().then(function () {
        console.info('Affect telegram bot started!');
        timer();
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
    });
}

module.exports.run = run;