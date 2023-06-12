# WebSnapse v3
A web-based visual simulator of spiking neural P systems optimized using matrix representations and WebAssembly, supporting variants such as:
- Rules with delays
- Weighted synapses
- Extended rules

## How to run on local machine
1. Install npm (Comes with [Node.js](https://nodejs.org/en/download))
2. Run `npm install`
3. Run on local machine 
    - Run `npm run dev` to run a local development server (watch mode)
    - Run `npm run build` to build a static website optimized for production 

## How to compile WASM 
1. Install [Emscripten](https://emscripten.org/docs/getting_started/downloads.html)
2. Add emcc to PATH
3. Run `npm run wasm-compile`