"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatorModel = void 0;
const snp_system_1 = require("../wasm-wrapper/snp-system");
class SimulatorModel {
    constructor(model) {
        // WASM memory
        this.memory = new WebAssembly.Memory({
            initial: 10
        });
        // History
        this.indicatorVectorStack = [];
        this.delayStatusVectorStack = [];
        const wasmModule = new snp_system_1.SNPSystemModule(this.memory);
        this.transposedSpikingTransitionMatrix =
            wasmModule.allocateInt8Array(model.getTransposedSpikingTransitionMatrix());
        this.initialConfigurationVector = model.getInitialConfigurationVector();
        this.configurationVector =
            wasmModule.allocateInt8Array(model.getInitialConfigurationVector());
        this.delayStatusVector =
            wasmModule.allocateInt8Array(model.getInitialDelayStatusVector());
        this.delayVector =
            wasmModule.allocateInt8Array(model.getDelayVector());
        this.ruleCountVector =
            wasmModule.allocateInt8Array(model.getRuleCountVector());
        this.indicatorVector =
            wasmModule.allocateInt8Array(this.configurationVector.fill(0));
        this.wasmModule = wasmModule;
    }
    next(indicatorVector) {
        this.indicatorVectorStack.push(indicatorVector);
        this.delayStatusVectorStack.push(new Int8Array(this.delayStatusVector));
        this.indicatorVector.set(indicatorVector);
        this.wasmModule.getNext(this.configurationVector.byteOffset, this.delayStatusVector.byteOffset, this.transposedSpikingTransitionMatrix.byteOffset, this.delayVector.byteOffset, this.ruleCountVector.byteOffset, this.indicatorVector.byteOffset, this.indicatorVector.length, this.configurationVector.length);
    }
    prev() {
        const prevIndicatorVector = this.indicatorVectorStack.pop();
        if (!prevIndicatorVector)
            throw new Error('Reached starting configuration');
        this.indicatorVector.set(prevIndicatorVector);
        this.wasmModule.getPrevConfigurationVector(this.configurationVector.byteOffset, this.transposedSpikingTransitionMatrix.byteOffset, this.delayStatusVector.byteOffset, this.indicatorVector.byteOffset, this.indicatorVector.length, this.configurationVector.length);
        const prevDelayStatusVector = this.delayStatusVectorStack.pop();
        this.delayStatusVector.set(prevDelayStatusVector);
    }
    reset() {
        if (!this.initialConfigurationVector || !this.delayStatusVector)
            throw new Error('Model not set');
        this.configurationVector.set(this.initialConfigurationVector);
        this.delayStatusVector.set(this.delayStatusVector.map(_ => 0));
    }
}
exports.SimulatorModel = SimulatorModel;
