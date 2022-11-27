import { objectTraps, PROXY_STATE } from "./traps.mjs";

const { isArray } = Array;

let proxies = null

function each(value, cb) {
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) cb(i, value[i]);
    } else {
        for (let key in value) cb(key, value[key]);
    }
}

const arrayTraps = {};
each(objectTraps, (key, fn) => {
    arrayTraps[key] = function () {
        arguments[0] = arguments[0][0];
        return fn.apply(this, arguments);
    }
})

function produceProxy(base, recipe) {
    const previousProxies = proxies;
    proxies = [];
    try {
        // create proxy for root
        const rootProxy = createProxy(undefined, base);
        // 将 callback 进行调用 （其中所有对 base 内容执行的部份将会被 proxy 的 traps 处理）
        recipe.call(rootProxy, rootProxy); // expected no return values
        const res = finalize(rootProxy);
        // revoke all proxies
        each(proxies, (_, p) => p.revoke());
        return res;
    } finally {
        proxies = previousProxies; // CAN run even when function is returned
    }
}

function createProxy(parentState, base) {
    const state = createState(parentState, base);
    // 1. apply traps to the proxy as to listen to all changes
    // 2. proxy is revocable so as to release memories after use (when finalized)
    const proxy = isArray(base)
        ? Proxy.revocable([state], arrayTraps)
        : Proxy.revocable(state, objectTraps);
    // proxies 变量用于存储所有注册用于监听对象变化的 proxy，之后将所有 proxy 销毁掉，调用 proxy.revoke() 释放内存
    proxies.push(proxy);
    return proxy.proxy;
}

function createState(parent, base) {
    return {
        parent,
        base,
        modified: false,
        finalized: false,
        copy: undefined, // new changes will be applied to copy
        proxies: {} // object/array child elements will be treated as new proxies
    }
}

/**
 * given a base object, returns it if unmodified, or return the changed cloned if modified
 * @param {*} base 
 */
function finalize(base) {
    if (isProxy(base)) {
        const state = base[PROXY_STATE];
        console.log("{{{{state}}}}", state, base, PROXY_STATE)
        if (state.modified === true) {
            return state.finalized 
            ? state.copy 
            : (state.finalized = true, finalizeObject(state.copy, state))
        } else {
            return state.base;
        }
    }
    finalizeNonProxiedObject(base);
    return base;
}

function finalizeObject(copy, state) {
    const base = state.base;
    each(copy, (prop, value) => {
        if(value !== base[prop]) copy[prop] = finalize(value);
    });
    return copy;
}

function finalizeNonProxiedObject(parent) {
    if(!isProxyable(parent)) return
    if(Object.isFrozen(parent)) return
    each(parent, (i, child) => {
        if(isProxy(child)) {
            parent[i] = finalize(child);
        } else {
            finalizeNonProxiedObject(child);
        }
    });
}

function isProxyable(state) {
    return Array.isArray(state) || Object.prototype.toString.call(state) === '[object Object]';
}


/**
 * 判断某个对象是否已经被使用 createProxy 来初始化了
 * @param {*} value 
 */
 function isProxy(value) {
    return !!value && !!value[PROXY_STATE]; // 如果被初始化了，get trap 调用 value[PROXY_STATE] 会返回 state 的
}

export { produceProxy, createProxy, isProxyable, isProxy }