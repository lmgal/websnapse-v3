export type Rule = {
    latex: string,
    language: RegExp,
    consume: number,
    produce: number, 
    delay: number
}   

export const parseRule = (input: string) : Rule => {
    const ruleRegex = new RegExp(/^((a|\^([0-9]+|\*)|\(|\)|\+)+)(\/a(\^([1-9][0-9]*))?)?(\\to|\\rightarrow)( a(\^([1-9][0-9]*))?|\\lambda)(;([0-9]+))?$/g)
    const groups = ruleRegex.exec(input)

    if (!groups)
        throw new Error('Invalid rule format')

    let language : RegExp
    try {
        language = new RegExp(`^${groups[1].replace('^', '').replace(/(\d)/, '{$1}')}$`)
    } catch (e){
        throw new Error('Invalid language: ' + groups[1])
    }

    return {
        latex: input,
        language: language,
        consume: groups[6] ? Number.parseInt(groups[6]) :
            groups[4] ? 1 :
            groups[3] ? Number.parseInt(groups[3]) : 1,
        produce: groups[8] === '\\lambda' ? 0 : groups[10] ? Number.parseInt(groups[10]) : 1,
        delay: groups[12] ? Number.parseInt(groups[12]) : 0
    }
}
