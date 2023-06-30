export type Rule = {
    latex: string,
    language: RegExp,
    consume: number,
    produce: number, 
    delay: number
}   

export const parseRule = (input: string) : Rule | null => {
    const ruleRegex = new RegExp(/^([a|^()[\]+*\d\{\}(\\left)(\\right)(\\ast)]+)(\/a(\^[1-9]\d*|\^\{\d+\})?)?(\\to|\\rightarrow)( a(\^\d|\^\{\d+\})?|\\lambda)(;(\d+))?$/)
    const groups = ruleRegex.exec(input)
    if (!groups)
        return null

    let language : RegExp
    try {
        language = new RegExp(`^${groups[1].replace(/\^|\{|\}|(\\left)|(\\right)/g, '')
            .replace(/(\d+)/g, '{$1}').replace(/\\ast/g, '*')}$`)
    } catch (e){
        return null
    }
    
    // Forgetting rules cannot have delay
    if (groups[12] && groups[8] === '\\lambda')
        return null

    // Consume
    let consume : number
    if (groups[3]) {
        if (groups[3].includes('{'))
            // a/a^{n}
            consume = Number.parseInt(groups[3].slice(2, -1))
        else
            // a/a^n
            consume = Number.parseInt(groups[3].slice(1))
    } else if (groups[2]) {
        // a/a
        consume = 1
    } else if (groups[1] && groups[1].slice(2).length) {
        // a^{n} or a^n
        console.log(groups[1])
        if (groups[1].includes('{'))
            consume = Number.parseInt(groups[1].slice(3, -1))
        else
            consume = Number.parseInt(groups[1].slice(2))
    } else {
        // a
        consume = 1
    }

    // Produce
    let produce : number
    if (groups[6]) {
        if (groups[6].includes('{'))
            // \to a^{n}
            produce = Number.parseInt(groups[6].slice(2, -1))
        else
            // \to a^n
            produce = Number.parseInt(groups[6].slice(1))
    } else if (groups[5] === '\\lambda') {
        // \to\lambda
        produce = 0
    } else {
        // \to a
        produce = 1
    }

    const rule = {
        latex: input,
        language: language,
        consume: consume,
        produce: produce,
        delay: groups[8] ? Number.parseInt(groups[8]) : 0
    }

    return rule
}
