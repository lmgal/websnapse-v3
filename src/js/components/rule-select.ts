import katex from 'katex'

export type ApplicableRule = {
    latex: string,
    index: number
}

export class RuleSelectBuilder {
    private ruleSelect: HTMLDivElement

    constructor() {
        const ruleSelectTemplate = document.getElementById('rule-select-template') as HTMLTemplateElement
        this.ruleSelect = (ruleSelectTemplate.content
            .cloneNode(true) as DocumentFragment).firstElementChild as HTMLDivElement
    }

    public setNeuronName(neuronId: string) {
        const neuronIndex = this.ruleSelect.querySelector('.neuron-index') as HTMLHeadingElement
        neuronIndex.innerText = `Neuron ${neuronId}`

        return this
    }

    public setOptions(applicableRules: Array<ApplicableRule>) {
        const dropDownToggle = this.ruleSelect.querySelector('.drop-down-toggle') as HTMLDivElement

        // If no applicable rules, return
        if (applicableRules.length === 0) {
            dropDownToggle.innerText = 'No applicable rules'
            return this
        }

        // Select the first option
        const { latex, index } = applicableRules[0]
        this._selectOption(latex, index.toString())

        // If only one applicable rule, don't add a drop down
        if (applicableRules.length === 1) {
            return this
        }

        // Add toggle event listener
        dropDownToggle.addEventListener('click', () => {
            this._toggleDropDown()
        })

        // Add list items
        const list = this.ruleSelect.querySelector('.drop-down-list') as HTMLUListElement
        applicableRules.forEach(({ latex, index }) => {
            const item = document.createElement('li')
            item.classList.add('katex-drop-down-item')
            item.addEventListener('click', () => {
                this._selectOption(latex, index.toString())
            })

            katex.render(latex, item, {
                throwOnError: false
            })

            list.appendChild(item)
        })

        // Add event handler to close drop down menu when clicked outside
        window.addEventListener('click', (e) => {
            if (!dropDownToggle.contains(e.target as Node)) {
                if (list.classList.contains('show')) {
                    list.classList.remove('show')
                }
            }
        })

        return this
    }

    public build() {
        return this.ruleSelect
    }

    private _toggleDropDown() {
        const dropDownList = this.ruleSelect.querySelector('.drop-down-list') as HTMLUListElement
        dropDownList.classList.toggle("show")
    }

    private _selectOption(option: string, value: string) {
        const dropDownToggle = this.ruleSelect.querySelector('.drop-down-toggle') as HTMLDivElement
        dropDownToggle.setAttribute('data-selected', value)
        katex.render(option, dropDownToggle, {
            throwOnError: false
        })
    }

}