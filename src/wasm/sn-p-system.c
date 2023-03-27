#include <stdint.h>
#include <stdlib.h>
#include <emscripten/emscripten.h>

/**
 * Redefinition of the delay status vector from rule-wise to neuron-wise
 * Indicator vector is defined by chosen rules from applicable ones for each neuron
 */

/**
 * @brief Get the delay status vector in the next time step
 * 
 * @param delayStatusVector Current delay status vector. Also destination for the result
 * @param delayVector 
 * @param ruleCountVector 
 * @param indicatorVector
 * @param neuronCount 
 */
void getNextDelayStatusVector(
    int8_t delayStatusVector[],
    int8_t delayVector[],
    int8_t ruleCountVector[],
    int8_t indicatorVector[],
    int neuronCount
){
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++){
        int8_t delay = 0;
        for (int j = 0; j < ruleCountVector[i]; j++){
            if (indicatorVector[ruleIndex + j]){
                delay = delayVector[ruleIndex + j];
                break;
            }
        }

        delayStatusVector[i] = delayStatusVector[i] ? delayStatusVector[i] - 1 : delay;
        ruleIndex += ruleCountVector[i];
    }
}

/**
 * @brief Get the configuration vector in the next time step
 * 
 * @param configurationVector Current configuration vector. Also destination for the result
 * @param transposedTransitionMatrix 
 * @param nextDelayStatusVector 
 * @param indicatorVector 
 * @param ruleCount 
 * @param neuronCount 
 */
void getNextConfigurationVector(
    int8_t configurationVector[],
    int8_t transposedTransitionMatrix[],
    int8_t nextDelayStatusVector[],
    int8_t indicatorVector[],
    int ruleCount,
    int neuronCount
){
    for (int i = 0; i < neuronCount; i++){
        int8_t dotProduct = 0;
        for (int j = 0; j < ruleCount; j++){
            dotProduct += indicatorVector[i] * transposedTransitionMatrix[ruleCount * i + j];
        }

        int8_t nextStatus = nextDelayStatusVector[i] == 0;
        // Matrix representation revisited have an error. Corrected here
        configurationVector[i] = configurationVector[i] + nextStatus * dotProduct;
    }
}

/**
 * @brief Get the configuration and delay status vector for the next time step
 * 
 * @param configurationVector Current configuration vector. 
 * Also destination for next configuration vector
 * @param delayStatusVector Current delay status vector. Also destination for next delay status vector
 * @param transposedTransitionMatrix 
 * @param delayVector 
 * @param ruleCountVector 
 * @param indicatorVector 
 * @param ruleCount 
 * @param neuronCount 
 */
void getNext(
    int8_t configurationVector[],
    int8_t delayStatusVector[],
    int8_t transposedTransitionMatrix[],
    int8_t delayVector[],
    int8_t ruleCountVector[],
    int8_t indicatorVector[],
    int ruleCount,
    int neuronCount
){
    getNextDelayStatusVector(
        delayStatusVector,
        delayVector,
        ruleCountVector,
        indicatorVector,
        neuronCount
    );

    getNextConfigurationVector(
        configurationVector,
        transposedTransitionMatrix,
        delayStatusVector,
        indicatorVector,
        ruleCount,
        neuronCount
    );
}

/**
 * @brief Get the configuration vector for the previous time step
 * 
 * @param configurationVector Current configuration vector.
 * Also destination for previous configuration vector
 * @param transposedTransitionMatrix 
 * @param delayStatusVector 
 * @param prevIndicatorVector 
 * @param ruleCount 
 * @param neuronCount 
 */
void getPrevConfigurationVector(
    int8_t configurationVector[],
    int8_t transposedTransitionMatrix[],
    int8_t delayStatusVector[],
    int8_t prevIndicatorVector[],
    int ruleCount,
    int neuronCount
){
    
    for (int i = 0; i < neuronCount; i++){
        int8_t dotProduct = 0;
        for (int j = 0; j < ruleCount; j++){
            dotProduct += prevIndicatorVector[i] * transposedTransitionMatrix[ruleCount * i + j];
        }
        
        int8_t status = delayStatusVector[i] == 0;

        configurationVector[i] = configurationVector[i] - (status * dotProduct);
    }
}

int main() {
    return 0;
}