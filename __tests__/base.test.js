import ImmerOne from "../src/index.mjs";

const baseObj = createBaseState();

const imo = new ImmerOne();

const changedObj = imo.produce(baseObj, (draft) => {
    // console.log("[debug] draft before -> ", draft)
    draft.anObject.total += 1;
    delete draft.anObject.extra;
    draft.anObject.nested.yummie = false;
    draft.anArray.push("Johnny");
    draft.aSet.add("github");
    draft.aMap.set("force", "of no use");
    draft.anInstance.name = "Nameless";
});

console.log("[debug] base object: ", baseObj);
console.log("[debug] changed object: ", changedObj);




function Foo() {}

function createBaseState() {
    const data = {
        anInstance: new Foo(),
        anArray: [3, 2, {c: 3}, 1],
        aMap: new Map([
            ["jedi", {name: "Luke", skill: 10}],
            ["jediTotal", 42],
            ["force", "these aren't the droids you're looking for"]
        ]),
        aSet: new Set([
            "Luke",
            42,
            {
                jedi: "Yoda"
            }
        ]),
        aProp: "hi",
        anObject: {
            nested: {
                yummie: true
            },
            coffee: false,
            extra: "false",
            total: 2
        }
    }
    return data
}
