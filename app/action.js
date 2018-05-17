/**
 * Created by nick on 14/05/18.
 */
var TAG = 'app.action';
var Q = require('q');
var moment = require('moment');
var model = require('./db/model');
var utils = require('./utils');

//text messages
var DEFAULT_TXT = ['מה?', 'לא יודע איך לענות!', 'אולי דריה תוכל לעזור?'];
var ADMIN_DEFAULT_TXT = 'תשאלי את ניק!';
var WELCOME_TXT = 'הי ' + '%FIRST_NAME%' + '!\n' + 'ברוכה הבאה לקבוצת רישום לשיעורים של Affect';
var SUB_TXT = 'תבחרי יום רצוי להרשמה';
var QUERY_SUB_TXT = 'תבחרי שיעור רצוי להרשמה';
var SUCCESS_SUB_TXT = 'הרישום עבר בהצלחה!';
var SUCCESS_UNSUB_TXT = 'הרישום הוסר בהצלחה!';
var SUB_LIST_TXT = 'לרשימה המלאה של הרשומות, לחצי על השיעור';
var MYSUB_TXT = 'רשימת השיעורים להם את רשומה';
var FAIL_SUB_TXT = 'הפעולה נכשלה. הסיבה:';
var YOU_R_NOT_SUB_YET_TXT = 'אינך רשומה עדיין';
var TO_UNSUB_PRESS_TXT = '(להסרה:לחצי על השיעור)';
var NO_SUB_YET_TXT = 'עדיין אין רשומות';
var FULL_SUB_LIST_TXT = 'רשימה מלאה של הרשומות ליום ';

//button labels
var MY_SUB_LABEL = 'השיעורים שאני רשומה';
var SUB_LABEL = 'הרשמה לשיעור';
var SUB_LIST_LABEL = 'רשימת הרשומות';
var ADMIN_CREATE_USER_LABEL = 'צור לקוחה חדש';
var ADMIN_SUB_USER_LABEL = 'לרשום לקוחה';

var SUB_FAIL_CODE = {
    500: {txt: 'שגיאת מערכת'},
    400: {txt: 'לקוח לא קיים במערכת'},
    401: {txt: 'שיעור לא קיים במערכת'}
};

var DAY_LABEL = {
    0: 'ראשון',
    1: 'שני',
    2: 'שלישי',
    3: 'רביעי',
    4: 'חמישי',
    5: 'שישי',
    6: 'שבת'
};

var qKeys = {};
var messages = {
    '/start': msgStart
};
messages[MY_SUB_LABEL] = mySub;
messages[SUB_LIST_LABEL] = subList;
messages[ADMIN_CREATE_USER_LABEL] = adminCreateUser;
messages[ADMIN_SUB_USER_LABEL] = adminSubUser;

//static keyboards
var MAIN_KEYBOARD = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{
                text: MY_SUB_LABEL
            }], [{
                text: SUB_LABEL
            }], [{
                text: SUB_LIST_LABEL
            }]
        ]
    })
};
var ADMIN_MAIN_KEYBOARD = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{
                text: ADMIN_CREATE_USER_LABEL
            }], [{
                text: ADMIN_SUB_USER_LABEL
            }], [{
                text: SUB_LIST_LABEL
            }]
        ]
    })
};

//dynamic keyboards
var SUB_INLINE_KEYBOARD = [];

// Public //----------------------------------------------------------------------------------------------------------//
module.exports = {
    init: init,
    query: query,
    isAutoMessage: isAutoMessage,
    message: message,
    defaultTxt: defaultTxt,
    defaultKeyboard: defaultKeyboard
};

function init() {
    return model.init().then(()=> {
        return initQuery();
    });
}

function query(key, msg) {
    var d = Q.defer();
    if (qKeys.hasOwnProperty(key)) {
        qKeys[key].fun(key, msg).then((result)=> {
            d.resolve(result);
        }).catch(d.reject);
    } else {
        d.reject(new Error('unknown query key:' + key));
    }
    return d.promise;
}

function isAutoMessage(txt) {
    return messages.hasOwnProperty(txt);
}

function message(txt, msg) {
    return messages[txt](msg);
}

function defaultTxt(msg) {
    return model.isAdmin(msg.from.id) ? ADMIN_DEFAULT_TXT : DEFAULT_TXT[Math.floor(Math.random() * Math.floor(DEFAULT_TXT.length))];
}

function defaultKeyboard(msg) {
    return model.isAdmin(msg.from.id) ? ADMIN_MAIN_KEYBOARD : MAIN_KEYBOARD;
}
//----------------------------------------------------------------------------------------------------------// Public //

// Message //---------------------------------------------------------------------------------------------------------//
function msgStart(msg) {
    var d = Q.defer();
    model.addUser({
        chatId: msg.from.id,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name
    });
    var user = model.getUser(msg.from.id);
    var txt = utils.replaceAll(WELCOME_TXT, '%FIRST_NAME%', user.firstName);
    d.resolve({
        txt: txt,
        keyboard: defaultKeyboard(msg)
    });
    return d.promise;
}

function mySub(msg) {
    var M_TAG = '.mySub';
    var d = Q.defer();
    model.getLessonsByChatId(msg.from.id).then((lessons)=> {
        var keyboard = [];
        var txt = MYSUB_TXT;
        for (var i = 0; i < lessons.length; i++) {
            var lesson = lessons[i];
            var unsubLessonKey = 'unsub::' + lesson.day + '::' + lesson.id;
            if (qKeys[unsubLessonKey]) {
                keyboard.push([{
                    text: qKeys[unsubLessonKey].label,
                    callback_data: qKeys[unsubLessonKey].key
                }]);
            }
        }
        if (keyboard.length > 0) {
            txt += '\n' + TO_UNSUB_PRESS_TXT;
        } else {
            txt += '\n' + YOU_R_NOT_SUB_YET_TXT;
        }
        var inlineKeyboard = {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard
            })
        };
        d.resolve({
            inline_txt: txt,
            inline_keyboard: inlineKeyboard
        });
    }).catch((reason)=> {
        var txt = FAIL_SUB_TXT;
        if (reason.code && SUB_FAIL_CODE[reason.code]) {
            txt += SUB_FAIL_CODE[reason.code].txt;
        } else {
            console.error(TAG + M_TAG, 'reason:', reason);
            txt += SUB_FAIL_CODE[500].txt;
        }
        d.resolve({
            txt: txt
        });
    });
    return d.promise;
}

function sub(msg) {
    var d = Q.defer();
    var inlineKeyboard = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                SUB_INLINE_KEYBOARD
            ]
        })
    };
    d.resolve({
        inline_txt: SUB_TXT,
        inline_keyboard: inlineKeyboard
    });
    return d.promise;
}

function subList(msg) {
    var M_TAG = '.subList';
    var d = Q.defer();
    model.getSubLessons().then((lessons)=> {
        var keyboard = [];
        var txt = SUB_LIST_TXT;
        for (var i = 0; i < lessons.length; i++) {
            var lesson = lessons[i];
            if (lesson.count > 0) {
                var key = 'fullsublist::' + lesson.day + '::' + lesson.id;
                var minute = lesson.minute;
                if (minute == '0') {
                    minute = '00';
                }
                var label = DAY_LABEL[lesson.day] + ': ' + lesson.label + ' ' + lesson.hour + ':' + minute;
                if (qKeys[key]) {
                    keyboard.push([{
                        text: label + ' רשומות:' + lesson.count,
                        callback_data: qKeys[key].key
                    }]);
                }
            }
        }
        if (keyboard.length < 1) {
            txt += NO_SUB_YET_TXT;
        }
        var inlineKeyboard = {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard
            })
        };
        d.resolve({
            inline_txt: txt,
            inline_keyboard: inlineKeyboard
        });
    }).catch((reason)=> {
        var txt = FAIL_SUB_TXT;
        if (reason.code && SUB_FAIL_CODE[reason.code]) {
            txt += SUB_FAIL_CODE[reason.code].txt;
        } else {
            console.error(TAG + M_TAG, 'reason:', reason);
            txt += SUB_FAIL_CODE[500].txt;
        }
        d.resolve({
            txt: txt
        });
    });
    return d.promise;
}

function adminCreateUser(msg) {
    var d = Q.defer();
    d.resolve({
        txt: msg.text,
        keyboard: defaultKeyboard(msg)
    });
    return d.promise;
}

function adminSubUser(msg) {
    var d = Q.defer();
    d.resolve({
        txt: msg.text,
        keyboard: defaultKeyboard(msg)
    });
    return d.promise;
}
//---------------------------------------------------------------------------------------------------------// Message //

// Query //-----------------------------------------------------------------------------------------------------------//
function initQuery() {
    var d = Q.defer();
    var lessons = model.getLessons();
    for (var i = 0; i < lessons.length; i++) {
        var lesson = lessons[i];
        var dayKey = 'sub::' + lesson.day;
        if (!qKeys[dayKey]) {
            qKeys[dayKey] = {
                key: dayKey,
                label: DAY_LABEL[lesson.day],
                keyboard: [],
                fun: queryFunction
            };
            SUB_INLINE_KEYBOARD.unshift({
                text: DAY_LABEL[lesson.day],
                callback_data: dayKey
            });
        }
        var subLessonKey = 'sub::' + lesson.day + '::' + lesson.id;
        var minute = lesson.minute;
        if (minute == '0') {
            minute = '00';
        }
        var lessonLabel = lesson.label + ' ' + lesson.hour + ':' + minute;
        qKeys[subLessonKey] = {
            key: subLessonKey,
            label: DAY_LABEL[lessonLabel],
            fun: queryFunction
        };
        qKeys[dayKey].keyboard.push([{
            text: lessonLabel,
            callback_data: subLessonKey
        }]);
        var unsubLessonKey = 'unsub::' + lesson.day + '::' + lesson.id;
        qKeys[unsubLessonKey] = {
            key: unsubLessonKey,
            label: DAY_LABEL[lesson.day] + ': ' + lessonLabel,
            fun: queryFunction
        };
        var fullsublistKey = 'fullsublist::' + lesson.day + '::' + lesson.id;
        qKeys[fullsublistKey] = {
            key: fullsublistKey,
            fun: queryFunction
        };
    }
    messages[SUB_LABEL] = sub;
    d.resolve(true);
    return d.promise;
}

function queryFunction(key, msg) {
    var d = Q.defer();
    var subKeys = key.split('::');
    var action = subKeys[0];
    if (action == 'sub') {
        if (subKeys.length == 2) {
            querySub(msg, key, d);
        } else if (subKeys.length == 3) {
            querySubLesson(msg, subKeys, d);
        } else {
            d.resolve({
                txt: defaultTxt(msg),
                keyboard: defaultKeyboard(msg)
            });
        }
    } else if (action == 'unsub') {
        if (subKeys.length == 3) {
            queryUnsubLesson(msg, subKeys, d);
        } else {
            d.resolve({
                txt: defaultTxt(msg),
                keyboard: defaultKeyboard(msg)
            });
        }
    } else if (action == 'fullsublist') {
        if (subKeys.length == 3) {
            queryFullSubLList(msg, subKeys, d);
        } else {
            d.resolve({
                txt: defaultTxt(msg),
                keyboard: defaultKeyboard(msg)
            });
        }
    } else {
        d.resolve({
            txt: defaultTxt(msg),
            keyboard: defaultKeyboard(msg)
        });
    }
    return d.promise;
}

function querySub(msg, key, d) {
    var inlineKeyboard = {
        reply_markup: JSON.stringify({
            inline_keyboard: qKeys[key].keyboard
        })
    };
    d.resolve({
        inline_txt: QUERY_SUB_TXT,
        inline_keyboard: inlineKeyboard
    });
}

function querySubLesson(msg, subKeys, d) {
    var M_TAG = '.querySubLesson';
    var lessonId = subKeys[2];
    subUser(msg.from.id, lessonId).then(()=> {
        d.resolve({
            txt: SUCCESS_SUB_TXT,
            keyboard: defaultKeyboard(msg)
        });
    }).catch((reason)=> {
        var txt = FAIL_SUB_TXT;
        if (reason.code && SUB_FAIL_CODE[reason.code]) {
            txt += SUB_FAIL_CODE[reason.code].txt;
        } else {
            console.error(TAG + M_TAG, 'reason:', reason);
            txt += SUB_FAIL_CODE[500].txt;
        }
        d.resolve({
            txt: txt
        });
    });
}

function queryUnsubLesson(msg, subKeys, d) {
    var M_TAG = '.queryUnsubLesson';
    var subLessonId = subKeys[2];
    unsubUser(msg.from.id, subLessonId).then(()=> {
        d.resolve({
            txt: SUCCESS_UNSUB_TXT,
            keyboard: defaultKeyboard(msg)
        });
    }).catch((reason)=> {
        var txt = FAIL_SUB_TXT;
        if (reason.code && SUB_FAIL_CODE[reason.code]) {
            txt += SUB_FAIL_CODE[reason.code].txt;
        } else {
            console.error(TAG + M_TAG, 'reason:', reason);
            txt += SUB_FAIL_CODE[500].txt;
        }
        d.resolve({
            txt: txt
        });
    });
}

function queryFullSubLList(msg, subKeys, d) {
    var M_TAG = '.queryFullSubLList';
    var lessonId = subKeys[2];
    var lesson = model.getLesson(lessonId);
    if (!lesson) {
        d.resolve({
            txt: FAIL_SUB_TXT + SUB_FAIL_CODE[401].txt
        });
    } else {
        model.getSubUsersByLessonId(lessonId).then((users)=> {
            var minute = lesson.minute;
            if (minute == '0') {
                minute = '00';
            }
            var label = DAY_LABEL[lesson.day] + ': ' + lesson.label + ' ' + lesson.hour + ':' + minute;
            var txt = FULL_SUB_LIST_TXT + label + '\n';
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                txt += user.firstName + ' ' + user.lastName + '\n';
            }
            d.resolve({
                txt: txt,
                keyboard: defaultKeyboard(msg)
            });
        }).catch((reason)=> {
            var txt = FAIL_SUB_TXT;
            if (reason.code && SUB_FAIL_CODE[reason.code]) {
                txt += SUB_FAIL_CODE[reason.code].txt;
            } else {
                console.error(TAG + M_TAG, 'reason:', reason);
                txt += SUB_FAIL_CODE[500].txt;
            }
            d.resolve({
                txt: txt
            });
        });
    }
}

function subUser(chatId, lessonId) {
    var M_TAG = 'subUser';
    var d = Q.defer();
    model.subUser(chatId, lessonId).then(()=> {
        d.resolve(true);
    }).catch((reason)=> {
        if (!reason.code) {
            console.warn(TAG + M_TAG, 'reason:', reason);
            d.resolve({code: 500});
        } else {
            d.resolve({code: reason.code});
        }
    });
    return d.promise;
}

function unsubUser(chatId, lessonId) {
    var M_TAG = 'unsubUser';
    var d = Q.defer();
    model.unsubUser(chatId, lessonId).then(()=> {
        d.resolve(true);
    }).catch((reason)=> {
        if (!reason.code) {
            console.warn(TAG + M_TAG, 'reason:', reason);
            d.resolve({code: 500});
        } else {
            d.resolve({code: reason.code});
        }
    });
    return d.promise;
}
//-----------------------------------------------------------------------------------------------------------// Query //