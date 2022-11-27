import { isProxyable, produceProxy } from "./proxy.mjs";

class ImmerOne {
    constructor() {}

    produce(baseState, recipe) {
        {
            // base should be array or plain object
            if (!isProxyable(baseState)) throw new Error("the first argument to produce should be a plain object or array, got " + (typeof baseState))
            if (typeof recipe !== "function") throw new Error("the second argument to produce should be a function");
        }
        const proxy = produceProxy(baseState, recipe);
        return proxy;
    }
}

export default ImmerOne;