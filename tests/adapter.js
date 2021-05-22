const MyPromise = require("../index");

module.exports = {
    resolved: value => MyPromise.resolve(value),
    rejected: reason => MyPromise.reject(reason),
    deferred: function () {
        let resolve, reject;
        return {
            promise: new MyPromise((rel, rej) => {
                resolve = rel;
                reject = rej;
            }),
            resolve,
            reject,
        };
    },
};
