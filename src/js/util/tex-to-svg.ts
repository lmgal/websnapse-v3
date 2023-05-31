// @ts-nocheck

export function tex2Svg(tex: string) {
    let wrapper = MathJax.tex2svg(`\\displaylines{${tex}}`, {
        em: 10,
        ex: 5,
        display: true
    })
    
    return wrapper.querySelector('svg') as SVGElement
}

export function getTexSvgSize(svg: SVGElement) {
    const factor = 65.41 / 8.050000190734863

    return {
        width: svg.width.baseVal.valueInSpecifiedUnits * factor,
        height: svg.height.baseVal.valueInSpecifiedUnits * factor
    }
}