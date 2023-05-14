export type Rule = {
    latex: string,
    language: RegExp,
    consume: number,
    produce: number, 
    delay: number
}   

export const parseRule = (input: string) : Rule | null => {
    const ruleRegex = new RegExp(/^([a|^()[\]+*\d\{\}(\\left)(\\right)(\\ast)]+)(\/a(\^[1-9]\d*)?)?(\\to|\\rightarrow)( a|\\lambda)(;(\d+))?$/)
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

    const rule = {
        latex: input,
        language: language,
        consume: groups[3] ? Number.parseInt(groups[3].slice(1)) :
            groups[2] ? 1 :
            groups[1] && groups[1].slice(2).length ? Number.parseInt(groups[1].slice(2)) : 1,
        produce: groups[5] === ' a' ? 1 : 0,
        delay: groups[7] ? Number.parseInt(groups[7]) : 0
    }

    return rule
}
