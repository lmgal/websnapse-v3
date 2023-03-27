var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// @ts-ignore
import SNPModule from '../wasm/sn-p-system.js';
export class SimulatorModel {
    constructor(model) {
        // History
        this.time = 0;
        this.configurationVectorStack = [];
        this.decisionVectorStack = [];
        this.delayStatusVectorStack = [];
        this.outputSpikeTrains = [];
        (() => __awaiter(this, void 0, void 0, function* () {
            this.module = yield SNPModule();
            const wasmMalloc = (array) => {
                const offset = this.module._malloc(array.length * Int8Array.BYTES_PER_ELEMENT);
                this.module.HEAP8.set(array, offset);
                return {
                    data: this.module.HEAP8.subarray(offset, offset + array.length),
                    offset: offset
                };
            };
            this.model = model;
            this.transposedSpikingTransitionMatrix = wasmMalloc(model.getTransposedSpikingTransitionMatrix());
            this.initialConfigurationVector = model.getInitialConfigurationVector();
            this.delayVector = wasmMalloc(model.getDelayVector());
            this.ruleCountVector = wasmMalloc(model.getRuleCountVector());
            this.outputNeuronIndices = model.getOutputNeuronIndices();
            this.configurationVector = wasmMalloc(this.initialConfigurationVector);
            this.delayStatusVector = wasmMalloc(this.initialConfigurationVector.map(_ => 0));
            this.delayedSpikingVector = wasmMalloc(this.delayVector.data.map(_ => 0));
            this.decisionVector = wasmMalloc(new Int8Array(model.getRuleCount()));
            this.spikeTrainVector = wasmMalloc(new Int8Array(model.getRuleCount()));
            this.spikeTrainVectors = model.getSpikeTrainVectors();
            for (const _ of this.outputNeuronIndices) {
                this.outputSpikeTrains.push([]);
            }
        }))();
    }
    next(decisionVector) {
        var _a;
        if (!this.configurationVector.data.some((spike) => spike > 0))
            throw new Error('Reached final configuration');
        this.configurationVectorStack.push(new Int8Array(this.configurationVector.data));
        this.decisionVectorStack.push(decisionVector);
        this.delayStatusVectorStack.push(new Int8Array(this.delayStatusVector.data));
        this.decisionVector.data.set(decisionVector);
        this.spikeTrainVector.data.set((_a = this.spikeTrainVectors[this.time++]) !== null && _a !== void 0 ? _a : this.spikeTrainVector.data.fill(0));
        this.module._getNext(this.configurationVector.offset, this.delayStatusVector.offset, this.transposedSpikingTransitionMatrix.offset, this.delayVector.offset, this.ruleCountVector.offset, this.decisionVector.offset, this.delayedSpikingVector.offset, this.spikeTrainVector.offset, this.decisionVector.data.length, this.configurationVector.data.length);
        for (let i = 0; i < this.outputNeuronIndices.length; i++) {
            const index = this.outputNeuronIndices[i];
            this.outputSpikeTrains[i].push(this.configurationVector.data[index] > 0);
        }
    }
    prev() {
        var _a;
        if (this.time === 0)
            throw new Error('Reached starting configuration');
        const prevConfigurationVector = this.configurationVectorStack.pop();
        this.configurationVector.data.set(prevConfigurationVector);
        this.decisionVectorStack.pop();
        this.spikeTrainVector.data.set((_a = this.spikeTrainVectors[--this.time]) !== null && _a !== void 0 ? _a : this.spikeTrainVector.data.fill(0));
        const prevDelayStatusVector = this.delayStatusVectorStack.pop();
        this.delayStatusVector.data.set(prevDelayStatusVector);
    }
    getCurrentVectors() {
        return {
            time: this.time,
            configurationVector: this.configurationVector.data,
            delayStatusVector: this.delayStatusVector.data
        };
    }
    getApplicableRules() {
        return this.model.getApplicableRules(this.configurationVector.data, this.delayStatusVector.data, this.delayedSpikingVector.data);
    }
    reset() {
        this.configurationVector.data.set(this.initialConfigurationVector);
        this.delayStatusVector.data.set(this.delayStatusVector.data.map(_ => 0));
    }
    destroy() {
        this.module._free(this.transposedSpikingTransitionMatrix.offset);
        this.module._free(this.configurationVector.offset);
        this.module._free(this.delayStatusVector.offset);
        this.module._free(this.delayVector.offset);
        this.module._free(this.ruleCountVector.offset);
        this.module._free(this.decisionVector.offset);
        this.module._free(this.delayedSpikingVector.offset);
        this.module._free(this.spikeTrainVector.offset);
    }
}
