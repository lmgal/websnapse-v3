import { ApplicableRule, RuleSelectBuilder } from "../components/rule-select"
import { RuleInputBuilder } from "../components/rule-input"

export type PanelButtonId = 'add-reg-neuron-btn' | 'add-input-neuron-btn' | 'add-output-neuron-btn' | 'add-synapse-btn'
export type SimulatorButtonId = 'next-btn' | 'prev-btn' | 'play-pause-btn' | 'stop-btn'

export class UIView {
    // @ts-ignore
    private MQ = MathQuill.getInterface(2)

    // Navigation bar
    private newSystemBtn = document.getElementById('new-system-btn') as HTMLLIElement
    private importSystemBtn = document.getElementById('import-system-btn') as HTMLLIElement
    private exportSystemBtn = document.getElementById('export-system-btn') as HTMLLIElement

    // Left panel
    private addRegNeuronBtn = document.getElementById('add-reg-neuron-btn') as HTMLButtonElement
    private addInputNeuronBtn = document.getElementById('add-input-neuron-btn') as HTMLButtonElement
    private addOutputNeuronBtn = document.getElementById('add-output-neuron-btn') as HTMLButtonElement
    private addSynapseBtn = document.getElementById('add-synapse-btn') as HTMLButtonElement

    // Simulator controls
    private nextBtn = document.getElementById('next-btn') as HTMLButtonElement
    private prevBtn = document.getElementById('prev-btn') as HTMLButtonElement
    private resetBtn = document.getElementById('reset-btn') as HTMLButtonElement
    private playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement
    private stopBtn = document.getElementById('stop-btn') as HTMLButtonElement

    // Decision controls
    private simulatorModeSelect = document.getElementById('simulator-mode-select') as HTMLSelectElement
    private decisionControls = document.getElementById('decision-controls') as HTMLDialogElement
    private decisionConfirmBtn = document.getElementById('decision-confirm-btn') as HTMLButtonElement
    private decisionCancelBtn = document.getElementById('decision-cancel-btn') as HTMLButtonElement

    // Neuron properties
    private neuronProperties = document.getElementById('neuron-properties') as HTMLDialogElement
    private neuronTitle = document.getElementById('neuron-properties-title') as HTMLHeadingElement
    private neuronSpikes = document.getElementById('neuron-spikes') as HTMLInputElement
    private neuronId = document.getElementById('neuron-id') as HTMLDivElement
    private neuronRuleList = document.getElementById('neuron-rule-list') as HTMLUListElement
    private neuronRuleAddBtn = document.getElementById('neuron-rule-add-btn') as HTMLButtonElement
    private neuronSpikeTrain = document.getElementById('neuron-spike-train') as HTMLDivElement
    private neuronConfirmBtn = document.getElementById('neuron-confirm-btn') as HTMLButtonElement
    private neuronCancelBtn = document.getElementById('neuron-cancel-btn') as HTMLButtonElement
    private neuronRegNeuronProperty = document.getElementsByClassName('reg-neuron-property') as HTMLCollectionOf<HTMLDivElement>
    private neuronNonRegNeuronProperty = document.getElementsByClassName('non-reg-neuron-property') as HTMLCollectionOf<HTMLDivElement>
    private neuronIdError = document.getElementById('neuron-id-error') as HTMLSpanElement
    private neuronSpikesError = document.getElementById('neuron-spikes-error') as HTMLSpanElement
    private neuronSpikeTrainError = document.getElementById('neuron-spike-train-error') as HTMLSpanElement


    // Synapse properties
    private synapseProperties = document.getElementById('synapse-properties') as HTMLDialogElement
    private synapsePropertiesTitle = document.getElementById('synapse-properties-title') as HTMLHeadingElement
    private synapseWeight = document.getElementById('synapse-weight') as HTMLInputElement
    private synapseConfirmBtn = document.getElementById('synapse-confirm-btn') as HTMLButtonElement
    private synapseCancelBtn = document.getElementById('synapse-cancel-btn') as HTMLButtonElement
    private synapseWeightError = document.getElementById('synapse-weight-error') as HTMLSpanElement

    // Neuron context menu
    private neuronContextMenu = document.getElementById('neuron-context-menu') as HTMLUListElement
    private neuronContextMenuEditBtn = document.getElementById('neuron-context-menu-edit-btn') as HTMLButtonElement
    private neuronContextMenuDeleteBtn = document.getElementById('neuron-context-menu-delete-btn') as HTMLButtonElement

    // Synapse context menu
    private synapseContextMenu = document.getElementById('synapse-context-menu') as HTMLUListElement
    private synapseContextMenuEditBtn = document.getElementById('synapse-context-menu-edit-btn') as HTMLButtonElement
    private synapseContextMenuDeleteBtn = document.getElementById('synapse-context-menu-delete-btn') as HTMLButtonElement

    public constructor() {
        // Convert necessary input to MathQuill input
        this.MQ.MathField(this.neuronId)
        this.MQ.MathField(this.neuronSpikeTrain)
    }

    // Interface methods
    // Panel
    /**
     * Toggle a button from the left panel
     * @param buttonId 
     */
    public togglePanelButton(buttonId : PanelButtonId) {
        const button = document.getElementById(buttonId) as HTMLButtonElement
        button.classList.toggle('active')
    }
    /**
     * Enable or disable left panel buttons
     * @param enabled 
     */
    public setPanelButtonsEnabled(enabled: boolean) {
        const leftPanel = document.getElementById('left-panel') as HTMLDivElement
        const buttons = leftPanel.getElementsByTagName('button')
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].disabled = !enabled
        }
    }

    // Simulator
    /**
     * Enable/disable a simulator button
     * @param buttonId 
     * @param disabled 
     */
    public setSimulatorButton(buttonId : SimulatorButtonId, disabled: boolean) {
        const button = document.getElementById(buttonId) as HTMLButtonElement
        button.disabled = disabled
    }
    public setPlayPauseBtnIcon(play: boolean) {
        this.playPauseBtn.children[0].innerHTML = play ? 'play_arrow' : 'pause'
    }

    // Decision
    /**
     * Get the value of the simulator mode select
     * @returns 
     */
    public getSimulatorMode () {
        return this.simulatorModeSelect.value as 'Pseudo-random' | 'Guided'
    }
    /**
     * Show the decision controls modal, constructing necessary rule selects
     * @param neuronRulesArray 
     */
    public showDecisionControls(neuronIds: Array<string>, neuronRulesArray : Array<Array<ApplicableRule>>) {
        neuronRulesArray.forEach((neuronRules, i) => {
            const ruleSelect = new RuleSelectBuilder()
                .setNeuronName(neuronIds[i])
                .setOptions(neuronRules)
                .build()
            this.decisionControls.getElementsByClassName('modal-content')[0].appendChild(ruleSelect)
        })
        this.decisionControls.showModal()
    }
    /**
     * Hide the decision controls modal
     */
    public hideDecisionControls() {
        this.decisionControls.close()
        this.decisionControls.getElementsByClassName('modal-content')[0].innerHTML = ''
    }
    /**
     * Gets the indices of selected rules from the decision controls 
     * @returns
     */
    public getSelectedRuleIndices() {
        const selectedRuleIndices : Array<number> = []
        document.querySelectorAll('.drop-down-toggle').forEach((select, i) => {
            selectedRuleIndices.push(
                Number.parseInt(select.getAttribute('data-selected')!)
            )
        })
        return selectedRuleIndices
    }

    // Neuron properties
    /**
     * Show the neuron properties modal
     * @param properties For reg neuron, spike train is left undefined. For input neuron,
     * spikes and rules are left undefined. For output neuron, all of them are left undefined
     */
    public showNeuronProperties(properties: {
        id: string,
        title: string,
        type: string,
        spikes?: number,
        rules?: string[],
        spikeTrain?: string
    }, isNew: boolean
    ) {
        // Set data attributes
        this.neuronProperties.setAttribute('data-type', properties.type ?? 'regular')
        this.neuronProperties.setAttribute('data-new', isNew ? 'true' : 'false')

        // Set title
        this.neuronTitle.innerText = properties?.title

        // Set id. Editing id is disabled
        this.MQ.MathField(this.neuronId).latex(properties.id)
        if (isNew) {
            this.neuronId.parentElement!.style.display = 'flex'
        } else
            this.neuronId.parentElement!.style.display = 'none'

        // Set rules and spikes if regular
        if (properties.type === 'regular') {
            for (const property of this.neuronRegNeuronProperty) {
                property.style.display = 'block'
            }
            this.neuronSpikes.value = properties?.spikes?.toString() ?? ''
            properties.rules!.forEach(rule => {
                this.addRuleInput(rule)
            })
        } else {
            for (const property of this.neuronRegNeuronProperty) {
                property.style.display = 'none'
            }
        }

        // Set spike train if input
        if (properties.type === 'input') {
            for (const property of this.neuronNonRegNeuronProperty) {
                property.style.display = 'block'
            }
            this.MQ.MathField(this.neuronSpikeTrain).latex(properties.spikeTrain ?? '')
        } else {
            for (const property of this.neuronNonRegNeuronProperty) {
                property.style.display = 'none'
            }
        }

        // Show neuron properties
        this.neuronProperties.showModal()
    }
    /**
     * Hide neuron properties modal
     */
    public hideNeuronProperties() {
        this.neuronProperties.close()
        this.neuronRuleList.innerHTML = ''
        this.setNeuronPropertiesError({
            id: '',
            spikes: '',
            rules: [],
            spikeTrain: ''
        })
    }
    /**
     * Add rule input
     * @param value Defined if editing an existing rule
     */
    public addRuleInput(value?: string) {
        const ruleInput = new RuleInputBuilder(value).build()
        this.neuronRuleList.appendChild(ruleInput)
    }
    /**
     * Remove a rule input
     * @param id Rule input id
     */
    public removeRuleInput(id : string) {
        const inputContainer = document.getElementById(id)
        if (inputContainer) {
            this.neuronRuleList.removeChild(inputContainer)
        }
    }
    /**
     * Set error message on neuron properties inputs, if there are any
     * @param error Empty string on an attribute if no error
     */
    public setNeuronPropertiesError(error: {
        id: string,
        spikes: string,
        rules?: string[],
        spikeTrain: string
    }) {
        this.neuronIdError.innerHTML = error.id
        this.neuronSpikesError.innerHTML = error.spikes
        const ruleErrors = this.neuronRuleList.getElementsByClassName("error-msg")
        if (error.rules) {
            for (let i = 0; i < ruleErrors.length; i++){
                ruleErrors[i].innerHTML = error.rules[i]
            }
        }
        this.neuronSpikeTrainError.innerHTML = error.spikeTrain
    }

    // Synapse properties
    /**
     * Show the synapse properties modal
     * @param properties Properties to show
     */
    public showSynapseProperties(properties: {
        title: string,
        weight: number
    }, isNew: boolean) {
        // Set data attribute
        this.synapseProperties.setAttribute('data-new', isNew ? 'true' : 'false')
        // Set title
        this.synapsePropertiesTitle.innerText = properties.title ?? 'Add synapse'
        // Set weight
        this.synapseWeight.value = properties.weight.toString() ?? ''

        // Show synapse properties
        this.synapseProperties.showModal()
    }
    /**
     * Hide synapse properties modal
     */
    public hideSynapseProperties() {
        this.synapseProperties.close()
        this.synapseWeight.value = ''
        this.setSynapsePropertiesError({
            weight: ''
        })
    }
    /**
     * Set error message on synapse properties inputs, if there are any
     * @param error 
     */
    public setSynapsePropertiesError(error: {
        weight: string
    }) {
        this.synapseWeightError.innerHTML = error.weight
    }

    // Neuron context menu
    /**
     * Show the neuron context menu
     * @param x x coordinate of the click
     * @param y y coordinate of the click
     * @param editDisabled Disable the edit option
     */
    public showNeuronContextMenu(x: number, y: number, editDisabled: boolean) {
        this.neuronContextMenu.hidden = false
        this.neuronContextMenu.style.left = `${x}px`
        this.neuronContextMenu.style.top = `${y}px`
        this.neuronContextMenuEditBtn.disabled = editDisabled

        // Hide the context menu if clicked outside
        const neuronContextMenu = this.neuronContextMenu
        document.addEventListener('click', function hideContextMenu(e) {
            neuronContextMenu.hidden = true
            document.removeEventListener('click', hideContextMenu) 
        }, { once: true })
    }

    /**
     * Hide the neuron context menu
     */
    public hideNeuronContextMenu() {
        this.neuronContextMenu.style.display = 'none'
    }

    // Synapse context menu
    /**
     * Show the synapse context menu
     * @param x x coordinates of the click
     * @param y y coordinates of the click
     */
    public showSynapseContextMenu(x: number, y: number) {
        this.synapseContextMenu.hidden = false
        this.synapseContextMenu.style.left = `${x}px`
        this.synapseContextMenu.style.top = `${y}px`

        // Hide the context menu if clicked outside
        const synapseContextMenu = this.synapseContextMenu
        document.addEventListener('click', function hideContextMenu(e) {
            synapseContextMenu.hidden = true
            document.removeEventListener('click', hideContextMenu) 
        }, { once: true })
    }

    /**
     * Hide the synapse context menu
     */
    public hideSynapseContextMenu() {
        this.synapseContextMenu.style.display = 'none'
    }

    // Handler methods
    // Navigation bar
    public handleNewSystemBtn(handler: () => void) {
        this.newSystemBtn.addEventListener('click', handler)
    }
    public handleImportSystemBtn(handler: () => void) {
        this.importSystemBtn.addEventListener('click', handler)
    }
    public handleExportSystemBtn(handler: () => void) {
        this.exportSystemBtn.addEventListener('click', handler)
    }

    // Panel
    public handleAddInputNeuronBtn(handler: () => void) {
        this.addInputNeuronBtn.addEventListener('click', handler)
    }
    public handleAddOutputNeuron(handler: () => void) {
        this.addOutputNeuronBtn.addEventListener('click', handler)
    }
    public handleAddRegNeuronBtn(handler: () => void) {
        this.addRegNeuronBtn.addEventListener('click', handler)
    }
    public handleAddSynapseBtn(handler: () => void) {
        this.addSynapseBtn.addEventListener('click', handler)
    }

    // Simulator
    public handleNextBtn(handler: () => void) {
        this.nextBtn.addEventListener('click', handler)
    }
    public handlePrevBtn(handler: () => void) {
        this.prevBtn.addEventListener('click', handler)
    }
    public handleResetBtn(handler: () => void) {
        this.resetBtn.addEventListener('click', handler)
    }
    public handlePlayPauseBtn(handler: (isPlayBtn: boolean) => void) {
        this.playPauseBtn.addEventListener('click', (e) => {
            handler(this.playPauseBtn.children[0].innerHTML === 'play_arrow')
        })
    }
    public handleStopBtn(handler: () => void) {
        this.stopBtn.addEventListener('click', handler)
    }

    // Decision controls
    public handleDecisionConfirmBtn(handler: (selectedIndices: number[]) => void) {
        this.decisionConfirmBtn.addEventListener('click', e => {
            handler(this.getSelectedRuleIndices())
        })
    }
    public handleDecisionCancelBtn(handler: () => void) {
        this.decisionCancelBtn.addEventListener('click', handler)
    }

    // Neuron properties
    public handleNeuronRuleAddBtn(handler: () => void) {
        this.neuronRuleAddBtn.addEventListener('click', handler)
    }
    public handleNeuronConfirm(handler: (
        properties: {
            id: string,
            type: string,
            spikes: string,
            rules? : Array<string>,
            spikeTrain: string
        },
        isNew: boolean
    ) => void) {
        this.neuronConfirmBtn.addEventListener('click', (e) => {
            // Get if new
            const isNew = this.neuronProperties.getAttribute('data-new')! === 'true'
            // Get properties
            const id = this.MQ.MathField(this.neuronId).latex()
            const type = this.neuronProperties.getAttribute('data-type')!
            const spikes = this.neuronSpikes.value
            const rules = Array.from(this.neuronRuleList.getElementsByClassName("rule-input-container")).map(
                (inputContainer) => {
                    const input = inputContainer.querySelector('.mq-editable-field')
                    const mathField = this.MQ.MathField(input)
                    return mathField.latex()
                }
            )
            const spikeTrain = this.MQ.MathField(this.neuronSpikeTrain).latex()

            handler({
                id,
                type,
                spikes,
                rules,
                spikeTrain
            }, isNew)
        })
    }
    public handleNeuronCancel(handler: () => void) {
        this.neuronCancelBtn.addEventListener('click', handler)
    }

    // Synapse properties
    public handleSynapseConfirm(handler: (weight: string, isNew: boolean) => void) {
        this.synapseConfirmBtn.addEventListener('click', (e) => {
            // Get data from attribute
            const isNew = this.synapseProperties.getAttribute('data-new')! === 'true'
            // Get properties
            const weight = this.synapseWeight.value
            // Call handler
            handler(weight, isNew)
        })
    }
    public handleSynapseCancelBtn(handler: () => void) {
        this.synapseCancelBtn.addEventListener('click', handler)
    }
    // Neuron context menu
    public handleNeuronContextMenuEditBtn(handler: () => void) {
        this.neuronContextMenuEditBtn.addEventListener('click', handler)
    }
    public handleNeuronContextMenuDeleteBtn(handler: () => void) {
        this.neuronContextMenuDeleteBtn.addEventListener('click', handler)
    }
    // Synapse context menu
    public handleSynapseContextMenuEditBtn(handler: () => void) {
        this.synapseContextMenuEditBtn.addEventListener('click', handler)
    }
    public handleSynapseContextMenuDeleteBtn(handler: () => void) {
        this.synapseContextMenuDeleteBtn.addEventListener('click', handler)
    }
}