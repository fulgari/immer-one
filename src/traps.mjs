import { createProxy, isProxyable, isProxy } from "./proxy.mjs";

export const PROXY_STATE = Symbol("immer-proxy-state");

const objectTraps = {
    /**
     * 获取属性： state.prop 访问某个属性
     * 暂不支持递归对象
     * @param {*} state 
     * @param {*} prop 
     * @returns 
     */
    get(state, prop) {
        // when state[PROXY_STATE] is called, return the state directly
        if (prop === PROXY_STATE) {
            return state;
        }
        if (state.modified) { // 内容有改动过
            const value = state.copy[prop];
            // 用于处理 nested object 的情况，如果是对象，需要继续使用 createProxy 创造一层监听
            if (value === state.base[prop] && isProxyable(value)) {
                return (state.copy[prop] = createProxy(state, value));
            }
            return value;
        } else {
            if (has(state.proxies, prop)) {
                return state.proxies[prop];
            }
            const value = state.base[prop];
            if (!isProxy(value) && isProxyable(value)) {
                return (state.proxies[prop] = createProxy(state, value));
            }
            return value;
        }
    },

    /**
     * 设置属性：state.prop = value 设置某个属性的值
     * @param {*} state 
     * @param {*} prop 
     * @param {*} value 
     */
    set(state, prop, value) {
        if (!state.modified) {
            // 设置的值等于原本的值
            if ((prop in state.base && state.base[prop] === value)
            ) {
                return true;
            }
            markChanged(state);
        }
        state.copy[prop] = value; // new changes will be applied to copy
        return true;
    },
    /**
     * delete state.prop
     * @param {*} state 
     * @param {*} prop 
     * @returns 
     */
    deleteProperty(state, prop) {
        markChanged(state);
        delete state.copy[prop];
        return true;
    },

    /**
     * getOwnPropertyDescriptor
     * @param {*} state 
     * @param {*} prop 
     * @returns 
     */
    getOwnPropertyDescriptor(state, prop) {
        const owner = state.modified ? state.copy :
            has(state.proxies, prop) ? state.proxies : state.base;
        const descriptor = Reflect.getOwnPropertyDescriptor(owner, prop);
        if (descriptor && !(Array.isArray(owner) && prop === "length")) {
            descriptor.configurable = true;
        }
        return descriptor;
    },

    /**
     * `in` keyword
     * @param {*} target 
     * @param {*} prop 
     * @returns 
     */
    has(target, prop) {
        const source = target.modified ? target.copy : target.base;
        return prop in source;
    },

    /**
     * Object.keys(target)
     * @param {*} target 
     * @returns 
     */
    ownKeys(target) {
        const source = target.modified ? target.copy : target.base;
        return Reflect.ownKeys(source);
    },

    defineProperty() {
        throw new Error("Does not support defineProperty on draft objects")
    },
    setPrototypeOf() {
        throw new Error("Don't even try this...");
    }
}

/**
 * Mark state as modified, supports bubbles up. Only set & deleteProperty fires this.
 * 标记 state 为已修改，支持冒泡式标记。只有 set 和 deleteProperty 会触发该方法。
 * @param {*} state 
 */
function markChanged(state) {
    if (!state.modified) {
        state.modified = true;
        state.copy = shallowCopy(state.base);
        Object.assign(state.copy, state.proxies);
        if (state.parent) markChanged(state.parent); // 冒泡式标记，bubbles up modifications
    }
}

function shallowCopy(value) {
    if (Array.isArray(value)) return value.slice();
    return Object.assign({}, value);
}

function has(thing, prop) {
    return Object.prototype.hasOwnProperty.call(thing, prop);
}


export { objectTraps }