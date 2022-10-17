const isPromise = val => val instanceof MyPromise;
const isObject = val => val && typeof val === 'object';
const isFunction = val => typeof val === 'function';

const doAsync = fn => setTimeout(fn, 0);

const InnerStatus = {
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
};

const resolvePromise = (promise, x, resolve, reject) => {
  if (x === promise) {
    reject(new TypeError('value is the same promise'));
  } else if (isPromise(x)) {
    x.then(
      y => resolvePromise(promise, y, resolve, reject),
      r => reject(r)
    );
  } else if (isObject(x) || isFunction(x)) {
    let called = false;
    try {
      const xThen = x.then;
      if (isFunction(xThen)) {
        const wrappedResolve = y => {
          if (called) return;
          called = true;
          resolvePromise(promise, y, resolve, reject);
        };
        const wrappedRejected = r => {
          if (called) return;
          called = true;
          reject(r);
        };
        try {
          xThen.call(x, wrappedResolve, wrappedRejected);
        } catch (error) {
          if (!called) reject(error);
        }
      } else {
        resolve(x);
        called = true;
      }
    } catch (error) {
      reject(error);
      called = true;
    }
  } else {
    resolve(x);
  }
};

const identity = val => val;

class MyPromise {
  constructor(executor) {
    this.pendingThenCallback = [];
    this.status = InnerStatus.PENDING;
    this.finalValue;
    this.rejectedReason;

    const _reject = reason => {
      if (this.status !== InnerStatus.PENDING) return;
      this.rejectedReason = reason;
      this.status = InnerStatus.REJECTED;

      for (let i = 0; i < this.pendingThenCallback.length; i++) {
        const { resolve, reject, fulfilledHandler, rejectedHandler, promise } =
          this.pendingThenCallback[i];
        doAsync(() => {
          if (isFunction(rejectedHandler)) {
            try {
              const x = rejectedHandler(this.rejectedReason);
              resolvePromise(promise, x, resolve, reject);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(this.rejectedReason);
          }
        });
      }
    };

    const _resolve = value => {
      if (this.status !== InnerStatus.PENDING) return;
      if (value === this) {
        _reject(new TypeError('value is the same promise'));
      } else {
        this.finalValue = value;
        this.status = InnerStatus.FULFILLED;

        for (let i = 0; i < this.pendingThenCallback.length; i++) {
          const { resolve, reject, fulfilledHandler, rejectedHandler, promise } =
            this.pendingThenCallback[i];
          doAsync(() => {
            if (isFunction(fulfilledHandler)) {
              try {
                const x = fulfilledHandler(this.finalValue);
                resolvePromise(promise, x, resolve, reject);
              } catch (error) {
                reject(error);
              }
            } else {
              resolve(this.finalValue);
            }
          });
        }
      }
    };

    try {
      executor(_resolve, _reject);
    } catch (error) {
      _reject(error);
    }
  }

  then(onFulfilled, onRejected) {
    let thenPromiseResolve, thenPromiseReject;
    const p = new MyPromise((resolve, reject) => {
      thenPromiseResolve = resolve;
      thenPromiseReject = reject;
    });

    if (this.status === InnerStatus.FULFILLED) {
      doAsync(() => {
        if (isFunction(onFulfilled)) {
          try {
            const x = onFulfilled(this.finalValue);
            resolvePromise(p, x, thenPromiseResolve, thenPromiseReject);
          } catch (error) {
            thenPromiseReject(error);
          }
        } else {
          thenPromiseResolve(this.finalValue);
        }
      });
    } else if (this.status === InnerStatus.REJECTED) {
      doAsync(() => {
        if (isFunction(onRejected)) {
          try {
            const x = onRejected(this.rejectedReason);
            resolvePromise(p, x, thenPromiseResolve, thenPromiseReject);
          } catch (error) {
            thenPromiseReject(error);
          }
        } else {
          thenPromiseReject(this.rejectedReason);
        }
      });
    } else {
      this.pendingThenCallback.push({
        resolve: thenPromiseResolve,
        reject: thenPromiseReject,
        fulfilledHandler: onFulfilled,
        rejectedHandler: onRejected,
        promise: p,
      });
    }

    return p;
  }
}

MyPromise.resolve = val => {
  return new MyPromise(resolve => resolve(val));
};

MyPromise.reject = reason => {
  return new MyPromise((_, reject) => reject(reason));
};

module.exports = MyPromise;
