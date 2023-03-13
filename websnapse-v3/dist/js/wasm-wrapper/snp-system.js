"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNPSystemModule = void 0;
class SNPSystemModule {
    constructor(memory) {
        this.offset = 0;
        this.allocateInt8Array = (sourceArray) => {
            const array = new Int8Array(this.memory.buffer, this.offset, sourceArray.length);
            array.set(sourceArray);
            this.offset += sourceArray.length * Int8Array.BYTES_PER_ELEMENT;
            return array;
        };
        (() => __awaiter(this, void 0, void 0, function* () {
            const { instance } = yield WebAssembly.instantiateStreaming(fetch(SNPSystemModule.source), { js: { mem: memory } });
            this.getNext = instance.exports.getNext;
            this.getPrevConfigurationVector
                = instance.exports.getPrevConfigurationVector;
        }))();
        this.memory = memory;
    }
}
exports.SNPSystemModule = SNPSystemModule;
SNPSystemModule.source = '../wasm/snp-system.wasm';
