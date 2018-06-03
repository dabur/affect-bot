var singleton = function singleton() {
    var TAG = 'db.model';
    var Q = require('q');
    var config = require('config');
    var admins = {};
    for (var a = 0; a < config.admins.length; a++) {
        admins[config.admins[a]] = {chatId: config.admins[a]};
    }
    var sheet = require('../handler/spreadsheet');
    var users = require('./users');
    var lessons = require('./lessons');
    var presence = require('./presence');

    var USER_SUB_QUOTA_PER_WEEK = 3;

    // Public //------------------------------------------------------------------------------------------------------//
    this.init = init;
    this.isAdmin = isAdmin;
    this.addUser = addUser;
    this.getUser = getUser;
    this.getUsers = getUsers;
    this.getLesson = getLesson;
    this.getUserSubQuotaPerWeek = getUserSubQuotaPerWeek;
    this.subUser = subUser;
    this.unsubUser = unsubUser;
    this.getLessons = getLessons;
    this.getLessonsByDay = getLessonsByDay;
    this.getLessonsByChatId = getLessonsByChatId;
    this.getSubUser = getSubUser;
    this.getSubLesson = getSubLesson;
    this.getSubLessons = getSubLessons;
    this.getSubUsersByLessonId = getSubUsersByLessonId;
    this.getManualUsers = getManualUsers;

    function init() {
        return sheet.init().then(function () {
            return users.init().then(function () {
                return lessons.init().then(function () {
                    return presence.init(users, lessons);
                });
            });
        });
    }

    function isAdmin(chatId) {
        return !!admins[chatId];
    }

    function addUser(obj) {
        return users.add(obj);
    }

    function getUser(id) {
        return users.get(id);
    }

    function getUsers() {
        return users.getAll();
    }

    function getLesson(id) {
        return lessons.getById(id);
    }

    function getUserSubQuotaPerWeek() {
        return USER_SUB_QUOTA_PER_WEEK;
    }

    function subUser(chatId, lessonId) {
        var d = Q.defer();
        var user = users.get(chatId);
        if (!user) {
            d.reject({code: 400});
        } else {
            var lesson = lessons.getById(lessonId);
            if (!lesson) {
                d.reject({code: 401});
            } else {
                if (getLessonsByChatId(user.chatId).length >= USER_SUB_QUOTA_PER_WEEK) {
                    d.reject({code: 300});
                } else {
                    if (!isSubOpen(lesson)) {
                        d.reject({code: 303});
                    } else {
                        if (isFull(lesson)) {
                            d.reject({code: 301});
                        } else {
                            presence.add(chatId, lessonId, true).then(function () {
                                d.resolve(true);
                            }).catch(function () {
                                d.reject({code: 500});
                            });
                        }
                    }
                }
            }
        }
        return d.promise;
    }

    function unsubUser(chatId, lessonId) {
        var d = Q.defer();
        var user = users.get(chatId);
        if (!user) {
            d.reject({code: 400});
        } else {
            var lesson = lessons.getById(lessonId);
            if (!lesson) {
                d.reject({code: 401});
            } else {
                if (!isUnsubOpen(lesson)) {
                    d.reject({code: 302});
                } else {
                    presence.remove(user.chatId, lesson.id, true).then(function () {
                        d.resolve(true);
                    }).catch(function () {
                        d.reject({code: 500});
                    });
                }
            }
        }
        return d.promise;
    }

    function getLessons() {
        return lessons.getAll();
    }

    function getLessonsByChatId(chatId) {
        var userPresence = presence.getByChatId(chatId);
        var ans = [];
        if (userPresence) {
            for (var i = 0; i < userPresence.arr.length; i++) {
                var lessonId = userPresence.arr[i].lessonId;
                ans.push(lessons.getById(lessonId));
            }
        }
        return ans;
    }

    function getSubUser(chatId) {
        return presence.getByChatId(chatId);
    }

    function getSubLesson(lessonId) {
        return presence.getByLessonId(lessonId);
    }

    function getSubLessons() {
        var subLessons = presence.getAll();
        var ans = [];
        for (var lessonId in subLessons) {
            if (subLessons.hasOwnProperty(lessonId)) {
                var lesson = lessons.getById(lessonId);
                lesson.count = subLessons[lessonId].arr.length;
                ans.push(lesson);
            }
        }
        return ans;
    }

    function getSubUsersByLessonId(lessonId) {
        var byLessonId = presence.getByLessonId(lessonId);
        var ans = [];
        if (byLessonId) {
            for (var i = 0; i < byLessonId.arr.length; i++) {
                ans.push(users.get(byLessonId.arr[i].chatId));
            }
        }
        return ans;
    }

    function getLessonsByDay(day) {
        return lessons.getByDay(day);
    }

    function isSubOpen(lesson) {
        var date = new Date();
        var day = date.getDay();
        if (lesson.day > day) {
            return true;
        } else if (lesson.day == day) {
            var lessonDate = new Date();
            lessonDate.setHours(lesson.hour, lesson.minute);
            if (lessonDate > date) {
                return true;
            }
        }
        return false;
    }

    function isUnsubOpen(lesson) {
        var date = new Date();
        var day = date.getDay();
        if (lesson.day > day) {
            return true;
        } else if (lesson.day == day) {
            var lessonDate = new Date();
            lessonDate.setHours(parseInt(lesson.hour) - 1, lesson.minute);
            if (lessonDate > date) {
                return true;
            }
        }
        return false;
    }

    function isFull(lesson) {
        var byLessonId = presence.getByLessonId(lesson.id);
        if (!byLessonId) {
            return false;
        }
        return !(byLessonId.arr.length < lesson.capacity);
    }

    function getManualUsers() {
        var ans = [];
        var manualUsers = users.getAll();
        for (var i = 0; i < manualUsers.length; i++) {
            var user = manualUsers[i];
            if (user.chatId && String(user.chatId).startsWith('manual_')) {
                ans.push(user);
            }
        }
        return ans;
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