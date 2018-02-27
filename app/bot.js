var TAG = 'bot';
var config = require('config');
var Q = require('q');
var tel = require('./handler/telegram');
var model = require('./db/model');
var utils = require('./utils');
var CRON_JOB_MESSAGE = true;
var admins = {};
for (var a = 0; a < config.admins.length; a++) {
    admins[config.admins[a]] = {chatId: config.admins[a]};
}
var SSTART_STR = '/start';
var ASK_NICK_STR = 'תשאלי את ניק!';
var ADMIN_CANNOT_SUBSCRIBE_TO_LESSON_STR = 'מנהל אינו יכול להירשם לשיעור!';
var MAIN_MENU_STR = 'תפריט הראשי';
var BACK_MAIN_MENU_STR = 'חזרה לתפריט הראשי';
var I_AM_SUBSCRIBE_STR = 'השיעורים שאני רשומה';
var LESSON_SUBSCRIBE_STR = 'הרשמה לשיעור';
var TODAY_LESSON_SUBSCRIBE_STR = 'הרשמה לשיעור של היום';
var PRESS_LESSON_TO_SUBSCRIBE_STR = 'כדי להירשם, תלחצי על השיעור המבוקש!';
var PRESS_LESSON_TO_UNSUBSCRIBE_STR = 'כדי להסיר רישום, תלחצי על השיעור המבוקש';
var NEXT_DAY_LESSON_SUBSCRIBE_STR = 'הרשמה לשיעור של מחר';
var WHO_SUBSCRIBE_TODAY_STR = 'מי רשומה להיום';
var WHO_SUBSCRIBE_NEXT_DAY_STR = 'מי רשומה למחר';
var WHAT_STRS = ['מה?', 'לא יודע איך לענות!', 'אולי דריה תוכל לעזור?'];
var MAIN_MENU = {
    reply_markup: JSON.stringify({
        remove_keyboard: true,
        keyboard: [
            [{
                text: I_AM_SUBSCRIBE_STR
            }], [{
                text: LESSON_SUBSCRIBE_STR
            }], [{
                text: WHO_SUBSCRIBE_TODAY_STR
            }, {
                text: WHO_SUBSCRIBE_NEXT_DAY_STR
            }]
        ]
    })
};
var ADMIN_MAIN_MENU = {
    reply_markup: JSON.stringify({
        remove_keyboard: true,
        keyboard: [
            [{
                text: WHO_SUBSCRIBE_TODAY_STR
            }, {
                text: WHO_SUBSCRIBE_NEXT_DAY_STR
            }]
        ]
    })
};
var lessonTimers = [];

function runSubscriptionSurvey(subscriptionLesson) {
    var lessons = model.getTodayClosestLessons();
    var keyboard = [];
    for (var i = 0; i < lessons.length; i++) {
        var lesson = lessons[i];
        var minuteStr = lesson.minute;
        if (minuteStr == '0') {
            minuteStr = '00';
        }
        var text = '"' + lesson.label + '" היום ב ' + lesson.hour + ':' + minuteStr;
        keyboard.push([{
            text: text
        }]);
    }
    keyboard.push([{
        text: NEXT_DAY_LESSON_SUBSCRIBE_STR
    }]);
    keyboard.push([{
        text: BACK_MAIN_MENU_STR
    }]);
    var menu = {
        reply_markup: JSON.stringify({
            remove_keyboard: true,
            keyboard: keyboard
        })
    };
    var users = model.getAllUsers();
    for (var u = 0; u < users.length; u++) {
        var user = users[u];
        if (!model.isSubscribedUserForToday(user) && !isAdmin(user.chatId)) {
            sendSubscriptionSurvey(user, subscriptionLesson, menu);
        }
    }
}

function sendSubscriptionSurvey(user, lesson, menu) {
    var text = 'עוד שעה מתקיים שיעור "' + lesson.label + '" רוצה להירשם עליו? או לשיעור אחר שמתקיים היום...';
    tel.sendMessage(user.chatId, text, menu);
}

function isAdmin(chatId) {
    return !!admins[chatId];
}

function cleanLessonTimers() {
    for (var i = 0; i < lessonTimers.length; i++) {
        var lessonTimer = lessonTimers[i];
        if (lessonTimer && lessonTimer.id) {
            clearTimeout(lessonTimer.id);
        }
    }
    lessonTimers = [];
}

function setLessonTimer(lesson) {
    var nowDate = new Date();
    var date = new Date(nowDate.getTime());
    date.setHours(parseInt(lesson.hour), parseInt(lesson.minute), 0, 0);
    date.setHours(date.getHours() - 1);
    var time = date.getTime() - nowDate.getTime();
    if (time > 0) {
        var id = setTimeout(function () {
            runSubscriptionSurvey(lesson);
            clearTimeout(id);
        }, time);
        lessonTimers.push({id: id, lesson: lesson});
    }
}

function resetLessonTimers() {
    var M_TAG = '.resetLessonTimers';
    cleanLessonTimers();
    model.reload().then(function () {
        var lessons = model.getTodayClosestLessons();
        for (var i = 0; i < lessons.length; i++) {
            var lesson = lessons[i];
            setLessonTimer(lesson);
        }
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
    })
}

function resetMainTimer(iT) {
    if (iT) {
        clearTimeout(iT);
    }
    var nowDate = new Date();
    var roundDate = new Date();
    roundDate.setHours(0, 0, 1, 0);
    roundDate.setDate(roundDate.getDate() + 1);
    var surveyTime = roundDate.getTime() - nowDate.getTime();
    if (config.debug && config.debug.survey) {
        surveyTime = 5000;
    }
    iT = setTimeout(function () {
        resetTimers(iT)
    }, surveyTime);
}

function resetTimers(mainTimerId) {
    if (CRON_JOB_MESSAGE) {
        resetLessonTimers();
        resetMainTimer(mainTimerId);
    }
}
function setListeners() {
    tel.onMessage(function (msg) {
        if (!msg.from.is_bot) {
            switch (msg.text) {
                case SSTART_STR:
                    startAns(msg);
                    return;
                case I_AM_SUBSCRIBE_STR:
                    iAmSubscribe(msg);
                    return;
                case LESSON_SUBSCRIBE_STR:
                case TODAY_LESSON_SUBSCRIBE_STR:
                    lessonSubscribe(msg);
                    return;
                case NEXT_DAY_LESSON_SUBSCRIBE_STR:
                    nextDayLessonSubscribe(msg);
                    return;
                case WHO_SUBSCRIBE_TODAY_STR:
                    whoSubscribeToday(msg);
                    return;
                case WHO_SUBSCRIBE_NEXT_DAY_STR:
                    whoSubscribeNextDay(msg);
                    return;
                case BACK_MAIN_MENU_STR:
                    backMainMenuAns(msg);
                    return;
                default:
                    if (msg.text.indexOf(' היום ב ') != -1) {
                        subscribeMeForToday(msg);
                    } else if (msg.text.indexOf(' מחר ב ') != -1) {
                        subscribeMeForNextDay(msg);
                    } else if (msg.text.indexOf(' להיום ב ') != -1) {
                        if (msg.text.indexOf(' רשומות ') != -1) {
                            whoSubscribeTodayList(msg);
                        } else {
                            unsubscribeMeFromToday(msg);
                        }
                    } else if (msg.text.indexOf(' למחר ב ') != -1) {
                        if (msg.text.indexOf(' רשומות ') != -1) {
                            whoSubscribeNextDayList(msg);
                        } else {
                            unsubscribeMeFromNextDay(msg);
                        }
                    } else {
                        defaultAns(msg);
                    }
                    return;
            }
        }
    });
}

function startAns(msg) {
    model.addUser({
        chatId: msg.from.id,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
        languageCode: msg.from.language_code
    });
    var user = model.getUser(msg.from.id);
    var menu = isAdmin(msg.from.id) ? ADMIN_MAIN_MENU : MAIN_MENU;
    tel.sendMessage(msg.from.id, 'היי ' + user.firstName + '!\n' + 'ברוכה הבאה לקבוצת רישום לשיעורים של Affect', menu);
}

function defaultAns(msg) {
    if (isAdmin(msg.from.id)) {
        tel.sendMessage(msg.from.id, ASK_NICK_STR, ADMIN_MAIN_MENU);
    } else {
        var randomI = Math.floor(Math.random() * Math.floor(WHAT_STRS.length));
        tel.sendMessage(msg.from.id, WHAT_STRS[randomI], MAIN_MENU);
    }
}

function backMainMenuAns(msg) {
    var menu = isAdmin(msg.from.id) ? ADMIN_MAIN_MENU : MAIN_MENU;
    tel.sendMessage(msg.from.id, MAIN_MENU_STR, menu);
}

function iAmSubscribe(msg) {
    if (isAdmin(msg.from.id)) {
        tel.sendMessage(msg.from.id, ADMIN_CANNOT_SUBSCRIBE_TO_LESSON_STR, ADMIN_MAIN_MENU);
    } else {
        var lessons = model.getUserSubscription(msg.from.id);
        if (!lessons || lessons.length < 1) {
            tel.sendMessage(msg.from.id, 'עדיין לא נרשמת להיום ולא למחר');
        } else {
            var keyboard = [];
            for (var i = 0; i < lessons.length; i++) {
                var lesson = lessons[i];
                var minuteStr = lesson.minute;
                if (minuteStr == '0') {
                    minuteStr = '00';
                }
                var dayLabel = '" למחר ב ';
                if (lesson.isToday) {
                    dayLabel = '" להיום ב ';
                }
                var text = '"' + lesson.label + dayLabel + lesson.hour + ':' + minuteStr;
                keyboard.push([{
                    text: text
                }]);
            }
            keyboard.push([{
                text: BACK_MAIN_MENU_STR
            }]);
            var menu = {
                reply_markup: JSON.stringify({
                    remove_keyboard: true,
                    keyboard: keyboard
                })
            };
            tel.sendMessage(msg.from.id, PRESS_LESSON_TO_UNSUBSCRIBE_STR, menu);
        }
    }
}

function lessonSubscribe(msg) {
    if (isAdmin(msg.from.id)) {
        tel.sendMessage(msg.from.id, ADMIN_CANNOT_SUBSCRIBE_TO_LESSON_STR, ADMIN_MAIN_MENU);
    } else {
        var lessons = model.getTodayClosestLessons();
        var keyboard = [];
        for (var i = 0; i < lessons.length; i++) {
            var lesson = lessons[i];
            var minuteStr = lesson.minute;
            if (minuteStr == '0') {
                minuteStr = '00';
            }
            var text = '"' + lesson.label + '" היום ב ' + lesson.hour + ':' + minuteStr;
            keyboard.push([{
                text: text
            }]);
        }
        keyboard.push([{
            text: NEXT_DAY_LESSON_SUBSCRIBE_STR
        }]);
        keyboard.push([{
            text: BACK_MAIN_MENU_STR
        }]);
        var menu = {
            reply_markup: JSON.stringify({
                remove_keyboard: true,
                keyboard: keyboard
            })
        };
        tel.sendMessage(msg.from.id, PRESS_LESSON_TO_SUBSCRIBE_STR, menu);
    }
}

function nextDayLessonSubscribe(msg) {
    if (isAdmin(msg.from.id)) {
        tel.sendMessage(msg.from.id, ADMIN_CANNOT_SUBSCRIBE_TO_LESSON_STR, ADMIN_MAIN_MENU);
    } else {
        var lessons = model.getNextDayClosestLessons();
        var keyboard = [];
        for (var i = 0; i < lessons.length; i++) {
            var lesson = lessons[i];
            var minuteStr = lesson.minute;
            if (minuteStr == '0') {
                minuteStr = '00';
            }
            var text = '"' + lesson.label + '" מחר ב ' + lesson.hour + ':' + minuteStr;
            keyboard.push([{
                text: text
            }]);
        }
        keyboard.push([{
            text: TODAY_LESSON_SUBSCRIBE_STR
        }]);
        keyboard.push([{
            text: BACK_MAIN_MENU_STR
        }]);
        var menu = {
            reply_markup: JSON.stringify({
                remove_keyboard: true,
                keyboard: keyboard
            })
        };
        tel.sendMessage(msg.from.id, PRESS_LESSON_TO_SUBSCRIBE_STR, menu);
    }
}

function subscribeMeForToday(msg) {
    if (isAdmin(msg.from.id)) {
        tel.sendMessage(msg.from.id, ADMIN_CANNOT_SUBSCRIBE_TO_LESSON_STR, ADMIN_MAIN_MENU);
    } else {
        var txtSplit = msg.text.split(' היום ב ');
        if (txtSplit.length != 2) {
            defaultAns(msg);
        } else {
            var timeSplit = txtSplit[1].split(':');
            if (timeSplit.length != 2) {
                defaultAns(msg);
            } else {
                var h = parseInt(timeSplit[0]);
                var m = parseInt(timeSplit[1]);
                var label = utils.replaceAll(txtSplit[0], '"', '');
                model.subscribeUserForToday(msg.from.id, label, h, m).then(function (text) {
                    tel.sendMessage(msg.from.id, text, MAIN_MENU);
                }).catch(function (err) {
                    tel.sendMessage(msg.from.id, err.text);
                });
            }
        }
    }
}

function subscribeMeForNextDay(msg) {
    if (isAdmin(msg.from.id)) {
        tel.sendMessage(msg.from.id, ADMIN_CANNOT_SUBSCRIBE_TO_LESSON_STR, ADMIN_MAIN_MENU);
    } else {
        var txtSplit = msg.text.split(' מחר ב ');
        if (txtSplit.length != 2) {
            defaultAns(msg);
        } else {
            var timeSplit = txtSplit[1].split(':');
            if (timeSplit.length != 2) {
                defaultAns(msg);
            } else {
                var h = parseInt(timeSplit[0]);
                var m = parseInt(timeSplit[1]);
                var label = utils.replaceAll(txtSplit[0], '"', '');
                model.subscribeUserForNextDay(msg.from.id, label, h, m).then(function (text) {
                    tel.sendMessage(msg.from.id, text, MAIN_MENU);
                }).catch(function (err) {
                    tel.sendMessage(msg.from.id, err.text);
                });
            }
        }
    }
}

function unsubscribeMeFromToday(msg) {
    if (isAdmin(msg.from.id)) {
        tel.sendMessage(msg.from.id, ADMIN_CANNOT_SUBSCRIBE_TO_LESSON_STR, ADMIN_MAIN_MENU);
    } else {
        model.unsubscribeUserFromToday(msg.from.id).then(function (text) {
            tel.sendMessage(msg.from.id, text, MAIN_MENU);
        }).catch(function (err) {
            tel.sendMessage(msg.from.id, err.text);
        });
    }
}

function unsubscribeMeFromNextDay(msg) {
    if (isAdmin(msg.from.id)) {
        tel.sendMessage(msg.from.id, ADMIN_CANNOT_SUBSCRIBE_TO_LESSON_STR, ADMIN_MAIN_MENU);
    } else {
        model.unsubscribeUserFromNextDay(msg.from.id).then(function (text) {
            tel.sendMessage(msg.from.id, text, MAIN_MENU);
        }).catch(function (err) {
            tel.sendMessage(msg.from.id, err.text);
        });
    }
}

function whoSubscribeToday(msg) {
    var lessons = model.getSubscribeLessonsForToday();
    if (lessons.length < 1) {
        tel.sendMessage(msg.from.id, 'עדיין אין רשומות להיום');
    } else {
        var keyboard = [];
        for (var i = 0; i < lessons.length; i++) {
            var lesson = lessons[i];
            var minuteStr = lesson.minute;
            if (minuteStr == '0') {
                minuteStr = '00';
            }
            var text = '[' + lesson.count + '] רשומות ' + '"' + lesson.label + '" להיום ב ' + lesson.hour + ':' + minuteStr;
            keyboard.push([{
                text: text
            }]);
        }
        keyboard.push([{
            text: BACK_MAIN_MENU_STR
        }]);
        var menu = {
            reply_markup: JSON.stringify({
                remove_keyboard: true,
                keyboard: keyboard
            })
        };
        tel.sendMessage(msg.from.id, 'כדי לראות את רשימת הרשומת, תלחצי על השיער', menu);
    }
}

function whoSubscribeNextDay(msg) {
    var lessons = model.getSubscribeLessonsForNextDay();
    if (lessons.length < 1) {
        tel.sendMessage(msg.from.id, 'עדיין אין רשומות למחר');
    } else {
        var keyboard = [];
        for (var i = 0; i < lessons.length; i++) {
            var lesson = lessons[i];
            var minuteStr = lesson.minute;
            if (minuteStr == '0') {
                minuteStr = '00';
            }
            var text = '[' + lesson.count + '] רשומות ' + '"' + lesson.label + '" למחר ב ' + lesson.hour + ':' + minuteStr;
            keyboard.push([{
                text: text
            }]);
        }
        keyboard.push([{
            text: BACK_MAIN_MENU_STR
        }]);
        var menu = {
            reply_markup: JSON.stringify({
                remove_keyboard: true,
                keyboard: keyboard
            })
        };
        tel.sendMessage(msg.from.id, 'כדי לראות את רשימת הרשומת, תלחצי על השיער', menu);
    }
}

function whoSubscribeTodayList(msg) {
    var M_TAG = '.whoSubscribeTodayList';
    var txtSplit = msg.text.split(' להיום ב ');
    if (txtSplit.length != 2) {
        tel.sendMessage(msg.from.id, msg.text.split(' רשומות ')[1] + ' עדיין אין רשומות');
    } else {
        var timeSplit = txtSplit[1].split(':');
        if (timeSplit.length != 2) {
            tel.sendMessage(msg.from.id, msg.text.split(' רשומות ')[1] + ' עדיין אין רשומות');
        } else {
            var h = parseInt(timeSplit[0]);
            var m = parseInt(timeSplit[1]);
            var tmp = txtSplit[0].split(' רשומות ');
            var label = utils.replaceAll(tmp[1], '"', '');
            model.getSubscribersForToday(label, h, m).then(function (users) {
                var text = msg.text.split(' רשומות ')[1] + ' רשימת רשומות';
                for (var chatId in users) {
                    if (users.hasOwnProperty(chatId)) {
                        var user = users[chatId];
                        text += '\n' + user.firstName + ' ' + user.lastName;
                    }
                }
                tel.sendMessage(msg.from.id, text);
            }).catch(function (reason) {
                console.error(TAG + M_TAG, reason);
                tel.sendMessage(msg.from.id, msg.text.split(' רשומות ')[1] + ' עדיין אין רשומות');
            });
        }
    }
}

function whoSubscribeNextDayList(msg) {
    var M_TAG = '.whoSubscribeNextDayList';
    var txtSplit = msg.text.split(' למחר ב ');
    if (txtSplit.length != 2) {
        tel.sendMessage(msg.from.id, msg.text.split(' רשומות ')[1] + ' עדיין אין רשומות');
    } else {
        var timeSplit = txtSplit[1].split(':');
        if (timeSplit.length != 2) {
            tel.sendMessage(msg.from.id, msg.text.split(' רשומות ')[1] + ' עדיין אין רשומות');
        } else {
            var h = parseInt(timeSplit[0]);
            var m = parseInt(timeSplit[1]);
            var tmp = txtSplit[0].split(' רשומות ');
            var label = utils.replaceAll(tmp[1], '"', '');
            model.getSubscribersForNextDay(label, h, m).then(function (users) {
                var text = msg.text.split(' רשומות ')[1] + ' רשימת רשומות';
                for (var chatId in users) {
                    if (users.hasOwnProperty(chatId)) {
                        var user = users[chatId];
                        text += '\n' + user.firstName + ' ' + user.lastName;
                    }
                }
                tel.sendMessage(msg.from.id, text);
            }).catch(function (reason) {
                console.error(TAG + M_TAG, reason);
                tel.sendMessage(msg.from.id, msg.text.split(' רשומות ')[1] + ' עדיין אין רשומות');
            });
        }
    }
}

function run() {
    var M_TAG = '.run';
    console.info('NODE_ENV:', process.env.NODE_ENV, 'NTBA_FIX_319:', process.env.NTBA_FIX_319);
    model.init().then(function () {
        return model.reload();
    }).then(function () {
        setListeners();
        resetTimers();
        console.info('Affect telegram bot started!');
    }).catch(function (reason) {
        console.error(TAG + M_TAG, reason);
    });
}

module.exports.run = run;