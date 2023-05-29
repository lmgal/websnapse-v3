export class RuleInputBuilder {
    private static _specialKeys = {
        '/' : '\\slash',
        '*' : '\\ast'
    }

    private _ruleInput: DocumentFragment
    // @ts-ignore
    private _MQ = MathQuill.getInterface(2)

    constructor(value?: string) {
        const ruleInputTemplate = document.getElementById('rule-input-container-template') as HTMLTemplateElement
        this._ruleInput = ruleInputTemplate.content.cloneNode(true) as DocumentFragment

        // Create MathQuill input
        const inputContainer = this._ruleInput.querySelector('.rule-input-container') as HTMLDivElement
        const input = document.createElement('div')
        if (value)
            input.innerHTML = value
            
        const mathField = this._MQ.MathField(input, {
            autoCommands: 'slash to rightarrow lambda ast'
        })
        inputContainer.insertBefore(input, inputContainer.firstChild)

        // Handle keydown event to avoid converting to fraction
        mathField.el().addEventListener('keydown', function (e: KeyboardEvent) {
            if (Object.keys(RuleInputBuilder._specialKeys).includes(e.key)) {
                e.preventDefault()
                mathField.cmd(RuleInputBuilder._specialKeys[e.key])
            }
        })
        
        // Handle button to remove this input
        const removeButton = this._ruleInput.querySelector('.icon-button') as HTMLButtonElement
        removeButton.addEventListener('click', () => {
            removeButton.parentElement?.remove()
        })
    }

    public build() {
        return this._ruleInput
    }
}