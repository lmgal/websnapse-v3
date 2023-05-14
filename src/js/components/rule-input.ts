import generateRandomId from "../util/generate-random-id"


export class RuleInputBuilder {
    private ruleInput: DocumentFragment
    // @ts-ignore
    private MQ = MathQuill.getInterface(2)

    constructor(value?: string) {
        const ruleInputTemplate = document.getElementById('rule-input-container-template') as HTMLTemplateElement
        this.ruleInput = ruleInputTemplate.content.cloneNode(true) as DocumentFragment

        // Create MathQuill input
        const inputContainer = this.ruleInput.querySelector('.rule-input-container') as HTMLDivElement
        const input = document.createElement('div')
        if (value)
            input.innerHTML = value
            
        const mathField = this.MQ.MathField(input, {
            autoCommands: 'slash to rightarrow lambda ast'
        })
        inputContainer.insertBefore(input, inputContainer.firstChild)

        // Handle keydown event to avoid converting to fraction
        mathField.el().addEventListener('keydown', function (e: KeyboardEvent) {
            // Only accept printable keys
            if (e.key.length !== 1)
                return
            e.preventDefault()
            if (e.key === '/')
                mathField.cmd('\\slash')
            else if (e.key === '*')
                mathField.cmd('\\ast')
            else
                mathField.typedText(e.key)
        })
        
        // Handle button to remove this input
        const removeButton = this.ruleInput.querySelector('.icon-button') as HTMLButtonElement
        removeButton.addEventListener('click', () => {
            removeButton.parentElement?.remove()
        })
    }

    public build() {
        return this.ruleInput
    }
}