import { SNPSystemModel } from "./models/system"
import { SimulatorModel } from "./models/simulator"
import { GraphView } from "./views/graph-view"
import { UIView, PanelButtonId } from "./views/ui-view"
import { Neuron, REG_NEURON, INPUT_NEURON, OUTPUT_NEURON, NeuronBuilder } from "./models/neuron"
import { Rule, parseRule } from "./models/rule"
import { ApplicableRule } from "./components/rule-select"
import generateRandomId from "./util/generate-random-id"
import { SystemJSON } from "./models/system-import"

export class Presenter {
    // States for mediating models and views
    private lastGraphClickPos = { x: 0, y: 0 }
    private activePanelButtonId: PanelButtonId | null = null
    private focusedNeuronId: string | null = null
    private focusedSynapseIds: { fromId: string, toId: string } | null = null
    // For adding synapses
    private fromNeuronId: string | null = null
    private toNeuronId: string | null = null
    // State for simulation
    private isNewSystem = true
    private isAuto = false
    // For alerting if it is not yet
    private isSaved = true // Since empty initially

    constructor(
        system: SNPSystemModel,
        simulator: SimulatorModel,
        graphView: GraphView,
        uiView: UIView) {

        // Bind system and graph view
        system.handleAddNeuron((neuron: Neuron) => {
            const spikeTrain = this._spikeTrainToString(neuron.getSpikeTrain())

            graphView.addNode(neuron.getId(), {
                spikes: neuron.getSpikes(),
                rules: neuron.getRules().map(rule => rule.latex).join('\\\\'),
                delay: neuron.getType() === REG_NEURON ? 0 : undefined,
                spikeTrain: spikeTrain,
                pos: this.lastGraphClickPos
            })

            this.isNewSystem = true
            this.isSaved = false
        })
        system.handleRemoveNeuron((neuron: Neuron) => {
            graphView.removeNode(neuron.getId())
            this.isNewSystem = true
        })
        system.handleEditNeuron((neuronId: string, neuron: Neuron) => {
            const spikeTrain = this._spikeTrainToString(neuron.getSpikeTrain())

            graphView.editNode(neuronId, {
                spikes: neuron.getSpikes(),
                rules: neuron.getRules().map(rule => rule.latex).join('\\\\'),
                delay: neuron.getType() === REG_NEURON ? 0 : undefined,
                spikeTrain: spikeTrain
            })

            this.isNewSystem = true
            this.isSaved = false
        })
        system.handleAddSynapse((fromId: string, toId: string, weight: number) => {
            graphView.addEdge(fromId, toId, weight)
            this.isNewSystem = true
            this.isSaved = false
        })
        system.handleRemoveSynapse((fromId: string, toId: string) => {
            graphView.removeEdge(fromId, toId)
            this.isNewSystem = true
            this.isSaved = false
        })
        system.handleEditSynapse((fromId: string, toId: string, weight: number) => {
            graphView.editEdge(fromId, toId, {
                weight: weight
            })
            this.isNewSystem = true
            this.isSaved = false
        })
        system.handleReset(() => {
            graphView.reset()
        })

        // Bind simulator and graph view
        simulator.handleChange(async (configurationVector: Int8Array, delayStatusVector: Int8Array,
            firingVector: Int8Array, outputSpikeTrains: Map<number, Array<number>>,
            decisionVectorStack: Int8Array[], neuronUpdateVector: Int8Array,
            synapseUpdateVector: Int8Array) => {

            console.timeEnd('Compute')
            console.time('Render')

            // Change neuron states
            const renderNeuronUpdate = async () => {
                for (let i = 0; i < configurationVector.length; i++) {
                    if (neuronUpdateVector[i] !== 1)
                        continue

                    if (system.getNeurons()[i].getType() === REG_NEURON) {
                        graphView.editNode(system.getNeurons()[i].getId(), {
                            spikes: configurationVector[i],
                            delay: delayStatusVector[i]
                        })
                    }
                }
            }

            // Change output spike trains
            const renderOutputNeuronUpdate = async () => {
                for (const [index, spikeTrain] of outputSpikeTrains.entries()) {
                    graphView.editNode(system.getNeurons()[index].getId(), {
                        spikeTrain: this._spikeTrainToString(spikeTrain)
                    })
                }
            }

            // Change synapses if source neuron is spiking. Othwerwise, remove spiking
            const renderSynapseUpdate = async () => {
                for (let i = 0; i < firingVector.length; i++) {
                    if (synapseUpdateVector[i] !== 1)
                        continue

                    const synapses = system.getSynapses().get(system.getNeurons()[i].getId())!
                    for (const synapse of synapses) {
                        graphView.editEdge(system.getNeurons()[i].getId(), synapse.toId, {
                            spiking: firingVector[i] === 1
                        })
                    }
                }
            }

            const renderGraphUpdate = async () => {
                graphView.beginUpdate()
                const neuronUpdatePromise = renderNeuronUpdate()
                const outputUpdatePromise = renderOutputNeuronUpdate()
                const synapseUpdatePromise = renderSynapseUpdate()
                await Promise.all([neuronUpdatePromise, outputUpdatePromise, synapseUpdatePromise])
                graphView.endUpdate()
            }

            // Update decision history table
            const renderDecisionHistoryUpdate = async () => {
                const ruleCountVector = system.getRuleCountVector()
                uiView.setDecisionHistoryBody(await Promise.all(decisionVectorStack
                    .map(async (decisionVector, time) => {
                        let ruleIndex = 0
                        return system.getNeurons().map((neuron, i) => {
                            if (neuron.getType() === REG_NEURON) {
                                for (let j = 0; j < ruleCountVector[i]; j++) {
                                    if (decisionVector[ruleIndex + j]) {
                                        ruleIndex += ruleCountVector[i]
                                        return {
                                            rule: neuron.getRules()[j].latex
                                        }
                                    }
                                }
                            } else if (neuron.getType() === INPUT_NEURON) {
                                ruleIndex += ruleCountVector[i]
                                return {
                                    spikeTrain: neuron.getSpikeTrain()[time]?.toString() ?? '0'
                                }
                            }
                            ruleIndex += ruleCountVector[i]
                            return {}
                        })
                    })))
            }

            await Promise.all([
                renderGraphUpdate(),
                renderDecisionHistoryUpdate()
            ])

            // If simulation is stopped, enable all simulator buttons
            if (!simulator.isSimulating()) {
                uiView.setSimulatorButton('prev-btn', false)
                uiView.setSimulatorButton('next-btn', false)
                uiView.setSimulatorButton('play-pause-btn', false)
                uiView.setSimulatorButton('stop-btn', false)
                return
            }

            // If simulator has reached t=0, disable previous button
            if (simulator.getState().time === 0)
                uiView.setSimulatorButton('prev-btn', true)
            else
                uiView.setSimulatorButton('prev-btn', false)

            // If simulator has reached final configuration, disable next button
            // If simulator is on auto, toggle play button and disable it
            if (simulator.hasReachedFinalConfiguration(system.getNeurons())) {
                uiView.setSimulatorButton('next-btn', true)
                uiView.setPlayPauseBtnIcon(true)
                uiView.setSimulatorButton('play-pause-btn', true)
            }
            else {
                uiView.setSimulatorButton('next-btn', false)
                uiView.setSimulatorButton('play-pause-btn', false)
            }
            // Enable stop button since it was previously disabled 
            // to prevent multiple clicks
            uiView.setSimulatorButton('stop-btn', false)

            console.timeEnd('Render')
        })

        // Handle events from graph view
        graphView.handleGraphClick((x, y) => {
            this.lastGraphClickPos = { x: x, y: y }

            if (this.activePanelButtonId === null)
                return

            switch (this.activePanelButtonId) {
                case 'add-reg-neuron-btn':
                    uiView.showNeuronProperties({
                        id: generateRandomId(5),
                        title: 'Add regular neuron',
                        type: 'regular',
                        spikes: 0,
                        rules: ['']
                    }, true)
                    break
                case 'add-input-neuron-btn':
                    uiView.showNeuronProperties({
                        id: generateRandomId(5),
                        title: 'Add input neuron',
                        type: 'input',
                        spikeTrain: ''
                    }, true)
                    break
                case 'add-output-neuron-btn':
                    uiView.showNeuronProperties({
                        id: generateRandomId(5),
                        title: 'Add output neuron',
                        type: 'output'
                    }, true)
                    break
                case 'add-synapse-btn':
                    // This is not handled here, but in the node click handler
                    return
            }

            // Reset active panel button
            uiView.togglePanelButton(this.activePanelButtonId)
            this.activePanelButtonId = null
            graphView.setGraphCursor('default')
        })
        graphView.handleNodeClick((nodeId) => {
            if (this.activePanelButtonId !== 'add-synapse-btn')
                return

            if (this.fromNeuronId === null) {
                // If the neuron is an output neuron, ignore
                if (system.getNeurons().find(neuron => neuron.getId() === nodeId)!
                    .getType() === OUTPUT_NEURON) {
                    uiView.showSnackbar(
                        'Cannot have an output neuron as synapse source',
                        3000
                    )
                    return
                }

                this.fromNeuronId = nodeId
                return
            }

            // Check if there is already an existing synapse
            if (system.getSynapses().get(this.fromNeuronId)!.find(synapse =>
                synapse.toId === nodeId)) {
                // Show snackbar error
                uiView.showSnackbar('Cannot have two synapses with the same connection', 3000)
                return
            }

            // Check if trying to connect to itself
            if (this.fromNeuronId === nodeId) {
                // Show snackbar error
                uiView.showSnackbar('Cannot connect a neuron to itself', 3000)
                return
            }

            this.toNeuronId = nodeId
            uiView.showSynapseProperties({
                title: `Add synapse from ${this.fromNeuronId} to ${this.toNeuronId}`,
                weight: 1,
            }, true)

            // Reset active panel button
            this.activePanelButtonId = null
            uiView.togglePanelButton('add-synapse-btn')
            graphView.setGraphCursor('default')
        })
        graphView.handleNodeRightClick((nodeId, x, y) => {
            // Disable opening neuron properties when simulating
            if (simulator.isSimulating()) return

            this.focusedNeuronId = nodeId
            uiView.showNeuronContextMenu(x, y, system.getNeuronById(nodeId)!.getType() === OUTPUT_NEURON)
        })
        graphView.handleEdgeRightClick((fromId, toId, x, y) => {
            // Disable opening synapse properties when simulating
            if (simulator.isSimulating()) return

            this.focusedSynapseIds = {
                fromId: fromId,
                toId: toId
            }
            uiView.showSynapseContextMenu(x, y)
        })

        // Handle events from UI View
        // Navigation button handler
        uiView.handleNewSystemBtn(() => {
            // Stop simulation if it is running
            if (simulator.isSimulating()) {
                simulator.stopAutoSimulation()
                simulator.setSimulating(false)
                uiView.setPanelButtonsEnabled(true)
                this.isNewSystem = true
            }
            system.reset()
        })
        uiView.handleImportSystemBtn(() => {
            // Stop simulation if it is running
            if (simulator.isSimulating()) {
                simulator.stopAutoSimulation()
                simulator.setSimulating(false)
                uiView.setPanelButtonsEnabled(true)
                this.isNewSystem = true
            }

            // Open file dialog
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json'
            input.click()

            input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files![0]
                const reader = new FileReader()

                reader.onload = (e) => {
                    const data = SystemJSON.import((e.target as FileReader).result as string)
                    this._handleImport(data, system, graphView, uiView)
                }

                reader.readAsText(file)
            }
        })
        uiView.handleExportSystemBtn(() => {
            // Open file dialog
            const a = document.createElement('a')
            a.href = URL.createObjectURL(
                new Blob([
                    SystemJSON.export(system, graphView)],
                    { type: 'application/json' })
            )

            a.download = 'system.json'
            a.click()

            this.isSaved = true
        })

        // Left panel button handler
        const panelButtonHandler = (buttonId: PanelButtonId, cursor: string) => {
            if (this.activePanelButtonId) {
                if (this.activePanelButtonId === buttonId) {
                    this.activePanelButtonId = null
                    graphView.setGraphCursor('default')
                } else {
                    uiView.togglePanelButton(this.activePanelButtonId)
                    this.activePanelButtonId = buttonId
                    graphView.setGraphCursor(cursor)
                }
            } else {
                this.activePanelButtonId = buttonId
                graphView.setGraphCursor(cursor)
            }
            uiView.togglePanelButton(buttonId)
        }
        uiView.handleAddRegNeuronBtn(() => {
            panelButtonHandler('add-reg-neuron-btn', 'copy')
        })
        uiView.handleAddInputNeuronBtn(() => {
            panelButtonHandler('add-input-neuron-btn', 'copy')
        })
        uiView.handleAddOutputNeuron(() => {
            panelButtonHandler('add-output-neuron-btn', 'copy')
        })
        uiView.handleAddSynapseBtn(() => {
            panelButtonHandler('add-synapse-btn', 'crosshair')
            this.fromNeuronId = null
            this.toNeuronId = null
        })

        // Decision controls handler
        uiView.handleDecisionConfirmBtn((selectedIndices) => {
            const decisionVector = Array(system.getRuleCount()).fill(0).map((_, i) => {
                return selectedIndices.includes(i) ? 1 : 0
            })
            simulator.next(new Int8Array(decisionVector))
            // Hide decision controls
            uiView.hideDecisionControls()
        })
        uiView.handleDecisionCancelBtn(() => {
            uiView.hideDecisionControls()
        })

        // Simulator button handler
        uiView.handlePlayPauseBtn((isPlayBtn) => {
            if (this.isNewSystem) {
                simulator.setSystem(system)
                uiView.setDecisionHistoryHeader(
                    system.getNeurons().map(neuron => neuron.getId())
                )
                this.isNewSystem = false
            }

            if (!simulator.isSimulating()) {
                simulator.setSimulating(true)
                uiView.setPanelButtonsEnabled(false)
            }

            if (isPlayBtn) {
                const mode = uiView.getSimulatorMode()
                if (mode === 'Pseudo-random')
                    simulator.startAutoRandomSimulation(system.getNeurons())
                else
                    simulator.startAutoGuidedSimulation(system.getNeurons())

                uiView.setPlayPauseBtnIcon(false)
            } else {
                uiView.setPlayPauseBtnIcon(true)
                simulator.stopAutoSimulation()
            }
        })
        uiView.handleStopBtn(() => {
            console.time('Compute')

            if (!simulator.isSimulating())
                return

            // Disable simulator buttons to prevent multiple clicks
            uiView.setSimulatorButton('prev-btn', true)
            uiView.setSimulatorButton('next-btn', true)
            uiView.setSimulatorButton('stop-btn', true)
            uiView.setSimulatorButton('play-pause-btn', true)

            simulator.stopAutoSimulation()
            simulator.setSimulating(false)
            simulator.reset()

            uiView.setPanelButtonsEnabled(true)
        })
        uiView.handleNextBtn(() => {
            console.time('Compute')
            // Disable simulator buttons to prevent multiple clicks
            uiView.setSimulatorButton('prev-btn', true)
            uiView.setSimulatorButton('next-btn', true)
            uiView.setSimulatorButton('stop-btn', true)
            uiView.setSimulatorButton('play-pause-btn', true)

            // If not yet simulating, set up the simulator with the system
            // and start simulating')
            if (this.isNewSystem) {
                simulator.setSystem(system)
                uiView.setDecisionHistoryHeader(
                    system.getNeurons().map(neuron => neuron.getId())
                )
                this.isNewSystem = false
            }
            if (!simulator.isSimulating()) {
                simulator.setSimulating(true)
                uiView.setPanelButtonsEnabled(false)
            }

            // If currently on auto, stop it
            if (this.isAuto)
                simulator.stopAutoSimulation()

            const state = simulator.getState()
            const neurons = system.getNeurons()
            if (uiView.getSimulatorMode() === 'Guided') {
                let globalRuleIndex = 0
                const applicableRules: Array<Array<ApplicableRule>> = []
                let hasRegularNeuron = false

                neurons.forEach((neuron, i) => {
                    if (neuron.getType() !== REG_NEURON)
                        return

                    hasRegularNeuron = true
                    if (state.delayStatusVector[i] > 0) {
                        applicableRules.push([])
                    } else {
                        applicableRules.push(
                            neuron.getApplicableRules(state.configurationVector[i])
                                .map(index => ({
                                    latex: neuron.getRules()[index].latex,
                                    index: globalRuleIndex + index
                                }))
                        )
                    }

                    globalRuleIndex += neuron.getRules().length
                })

                // If no regular neuron, just simulate. No need to show decision control
                if (!hasRegularNeuron) {
                    simulator.next(
                        simulator.getRandomDecisionVector(system.getNeurons())
                    )
                    return
                }

                uiView.showDecisionControls(
                    system.getNeurons()
                        .map((neuron, i) => ({
                            id: neuron.getId(),
                            isClosed: state.delayStatusVector[i] > 0,
                        }))
                        .filter((_, i) => neurons[i].getType() === REG_NEURON),
                    applicableRules
                )
            } else {
                simulator.next(
                    simulator.getRandomDecisionVector(system.getNeurons())
                )
            }
        })
        uiView.handlePrevBtn(() => {
            // If not yet simulating, ignore
            if (!simulator.isSimulating())
                return

            // Disable panel buttons to prevent multiple clicks
            uiView.setSimulatorButton('prev-btn', true)
            uiView.setSimulatorButton('next-btn', true)
            uiView.setSimulatorButton('stop-btn', true)
            uiView.setSimulatorButton('play-pause-btn', true)

            // If currently on auto, stop it
            if (simulator.isAuto())
                simulator.stopAutoSimulation()

            simulator.prev()
        })

        // Neuron properties handler
        uiView.handleNeuronRuleAddBtn(() => {
            uiView.addRuleInput()
        })
        uiView.handleNeuronConfirm(({ id, type, spikes, rules, spikeTrain }, isNew) => {
            let neuron: Neuron
            // Initialize error
            const error = {
                id: '',
                spikes: '',
                rules: rules?.map(rule => ''),
                spikeTrain: ''
            }
            let hasError = false

            // Validate id
            if (id.length === 0) {
                hasError = true
                error.id = 'ID is required'
            } else if (id.length > 8) {
                hasError = true
                error.id = 'ID must be at most 8 characters'
            } else if (system.getNeuronById(id)) {
                hasError = true
                error.id = 'Cannot have duplicate ID'
            }

            switch (type) {
                case 'regular':
                    // Spikes are required
                    if (spikes.length === 0) {
                        error.spikes = 'Spike/s must be defined'
                        hasError = true
                    }

                    // Parse rules. If a rule can't be parsed, set the error
                    const parsedRules: Array<Rule> = []
                    for (let i = 0; i < rules!.length; i++) {
                        const rule = rules![i]
                        const parsedRule = parseRule(rule)

                        if (!parsedRule) {
                            error.rules![i] = 'Invalid rule'
                            hasError = true
                        } else
                            parsedRules.push(parsedRule)
                    }

                    if (hasError) {
                        uiView.setNeuronPropertiesError(error)
                        return
                    }

                    neuron = new NeuronBuilder(REG_NEURON)
                        .setId(id)
                        .setSpikes(parseInt(spikes!))
                        .setRules(parsedRules)
                        .build()
                    break
                case 'input':
                    // Convert latex string to array of boolean
                    const spikeTrainArray = this._stringToSpikeTrain(spikeTrain!)

                    if (!spikeTrainArray) {
                        error.spikeTrain = 'Invalid spike train'
                        uiView.setNeuronPropertiesError(error)
                        return
                    }

                    neuron = new NeuronBuilder(INPUT_NEURON)
                        .setId(id)
                        .setSpikeTrain(spikeTrainArray)
                        .build()
                    break
                default: // Must be output neuron
                    if (hasError) {
                        uiView.setNeuronPropertiesError(error)
                        return
                    }

                    neuron = new NeuronBuilder(OUTPUT_NEURON).setId(id).build()
                    break
            }

            if (isNew)
                system.addNeuron(neuron)
            else
                system.editNeuron(this.focusedNeuronId!, neuron)

            uiView.hideNeuronProperties()
        })
        uiView.handleNeuronCancel(() => {
            uiView.hideNeuronProperties()
        })

        uiView.handleSynapseConfirm((weight, isNew) => {
            // Validate weight
            if (weight.length === 0) {
                uiView.setSynapsePropertiesError({
                    weight: 'Weight is required'
                })
                return
            }

            if (isNew)
                system.addSynapse(
                    this.fromNeuronId!,
                    this.toNeuronId!,
                    parseInt(weight)
                )
            else
                system.editSynapse(
                    this.focusedSynapseIds!.fromId,
                    this.focusedSynapseIds!.toId,
                    parseInt(weight)
                )

            // Reset focused synapse
            this.fromNeuronId = null
            this.toNeuronId = null
            uiView.hideSynapseProperties()
        })
        uiView.handleSynapseCancelBtn(() => {
            uiView.hideSynapseProperties()
        })

        // Neuron context menu handler
        uiView.handleNeuronContextMenuEditBtn(() => {
            const neuron = system.getNeuronById(this.focusedNeuronId!)!
            if (neuron.getType() === REG_NEURON) {
                uiView.showNeuronProperties({
                    id: neuron.getId(),
                    title: `Edit regular neuron ${this.focusedNeuronId}`,
                    type: 'regular',
                    spikes: neuron.getSpikes(),
                    rules: neuron.getRules().map(rule => rule.latex)
                }, false)
            } else if (neuron.getType() === INPUT_NEURON) {
                uiView.showNeuronProperties({
                    id: neuron.getId(),
                    title: `Edit input neuron ${this.focusedNeuronId}`,
                    type: 'input',
                    spikeTrain: this._spikeTrainToString(neuron.getSpikeTrain())
                }, false)
            } else {
                uiView.showNeuronProperties({
                    id: neuron.getId(),
                    title: `Edit output neuron ${this.focusedNeuronId}`,
                    type: 'output'
                }, false)
            }
        })
        uiView.handleNeuronContextMenuDeleteBtn(() => {
            system.removeNeuron(this.focusedNeuronId!)
        })

        // Synapse context menu handler
        uiView.handleSynapseContextMenuEditBtn(() => {
            uiView.showSynapseProperties({
                title: `Edit synapse from ${this.focusedSynapseIds!.fromId} to ${this.focusedSynapseIds!.toId}`,
                weight: system.getSynapses().get(this.focusedSynapseIds!.fromId)!.find(
                    synapse => synapse.toId === this.focusedSynapseIds!.toId)!.weight
            }, false)
        })
        uiView.handleSynapseContextMenuDeleteBtn(() => {
            system.removeSynapse(this.focusedSynapseIds!.fromId, this.focusedSynapseIds!.toId)
        })

        // Decision history handler
        uiView.handleDecisionHistoryShowBtn(() => {
            uiView.showDecisionHistory()
        })
        uiView.handleDecisionHistoryCloseBtn(() => {
            uiView.hideDecisionHistory()
        })

        // Help dialog handler
        uiView.handleHelpDialogShowBtn(() => {
            uiView.showHelpDialog()
        })
        uiView.handleHelpDialogCloseBtn(() => {
            uiView.hideHelpDialog()
        })

        // Add event handler to warn user before exiting with unsaved changes
        window.addEventListener('beforeunload', e => {
            if (!this.isSaved) {
                const confirmMsg = 'If you leave before saving, your changes will be lost';

                (e || window.event).returnValue = confirmMsg
                return confirmMsg
            }
        })
    }

    private _stringToSpikeTrain(latexString: string) {
        const regex = /(\d)(\^(\d|\{(\d+)\}))?/g;
        const matches = latexString.matchAll(regex);

        let parsedLength = 0
        const spikeTrain: number[] = []
        for (const match of matches) {
            const [group, base, __, singleExp, bracketExp] = match

            const spike = Number.parseInt(base)
            const exp = Number.isNaN(parseInt(singleExp)) ? parseInt(bracketExp) : parseInt(singleExp)
            if (!Number.isNaN(exp))
                spikeTrain.push(...Array(exp).fill(spike))
            else
                spikeTrain.push(spike)

            parsedLength += group.length
        }

        // Must have at least one spike
        if (spikeTrain.length === 0)
            return null

        // Must match entire string
        if (parsedLength !== latexString.length)
            return null

        return spikeTrain
    }

    private _spikeTrainToString(spikeTrain: Array<number>) {
        let latexString = '';

        if (spikeTrain.length === 0)
            return latexString;

        let currentBool = spikeTrain[0];
        let count = 1;

        for (let i = 1; i < spikeTrain.length; i++) {
            if (spikeTrain[i] === currentBool) {
                count++;
            } else {
                latexString += this._formatSpikeCount(currentBool, count);
                currentBool = spikeTrain[i];
                count = 1;
            }
        }

        latexString += this._formatSpikeCount(currentBool, count);

        return latexString;
    }

    private _formatSpikeCount(spike: number, count: number) {
        if (count === 1)
            return spike.toString()
        else if (count <= 9)
            return `${spike}^${count}`
        else
            return `${spike}^{${count}}`
    }

    private async _handleImport(
        data: ReturnType<typeof SystemJSON.import>,
        system: SNPSystemModel,
        graphView: GraphView,
        uiView: UIView) {

        // Clear system and prepare graph view
        system.reset()
        system.setCallHandler(false) // Only for nodes
        graphView.beginUpdate()

        await Promise.all(data.neurons.map(async (neuronJSON) => {
            const builder = new NeuronBuilder(neuronJSON.type).setId(neuronJSON.id)

            if (neuronJSON.type === REG_NEURON) {
                builder.setSpikes(neuronJSON.content as number)
                // Parse rules
                for (const latex of neuronJSON.rules!) {
                    const parsedRule = parseRule(latex)
                    if (parsedRule)
                        builder.addRule(parsedRule)
                    else
                        throw new Error(`Invalid rule: ${latex}`)
                }

                // Create node in graph view
                graphView.addNode(neuronJSON.id, {
                    spikes: neuronJSON.content as number,
                    rules: neuronJSON.rules!.join('\\\\'),
                    delay: 0,
                    pos: neuronJSON.pos
                })
            } else if (neuronJSON.type === INPUT_NEURON) {
                const spikeTrain = this._stringToSpikeTrain(neuronJSON.content as string)
                if (!spikeTrain)
                    throw new Error(`Invalid spike train: ${neuronJSON.content}`)
                builder.setSpikeTrain(spikeTrain)
                // Create node in graph view
                graphView.addNode(neuronJSON.id, {
                    spikeTrain: this._spikeTrainToString(spikeTrain!),
                    pos: neuronJSON.pos
                })
            } else {
                // Create output node in graph view
                graphView.addNode(neuronJSON.id, {
                    pos: neuronJSON.pos
                })
            }

            system.addNeuron(builder.build())
        }))

        system.setCallHandler(true)
        data.synapses.map(async (synapse) => {
            system.addSynapse(
                synapse.from,
                synapse.to,
                synapse.weight
            )
        })

        graphView.endUpdate()
    }

}