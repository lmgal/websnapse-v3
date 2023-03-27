"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRule = void 0;
const parseRule = (input) => {
    const ruleRegex = new RegExp(/(a(\^[1-9][0-9]*|\+|\*)?(\(a(\^[1-9][0-9]*|\+|\*)?\)(\*|\+)?)?)(\/a(\^[1-9][0-9]*)?)?(\\to|\\rightarrow)( a(\^[1-9][0-9]*)?|\\lambda);([0-9]+)/g);
    const groups = ruleRegex.exec(input);
    return {
        latex: input,
        language: new RegExp(input.replace(new RegExp(/\^([1-9][0-9]+)/g), '{$1}')),
        consume: groups[7] ? Number.parseInt(groups[7].substring(1)) :
            groups[1].substring(2) === '' ? 1 : Number.parseInt(groups[1].substring(2)),
        produce: groups[9] === '\\lambda' ? 0 : groups[10] ? Number.parseInt(groups[10].substring(1)) : 1,
        delay: groups[12] ? Number.parseInt(groups[12]) : 0
    };
};
exports.parseRule = parseRule;
