#include <stdint.h>
#include <stdlib.h>
#include <emscripten/emscripten.h>
#include <stdio.h>

/**
 * Redefinition of the delay status vector from rule-wise to neuron-wise
 * Indicator vector is defined if a rule is applicable or not (accounting if delayed or chosen)
 * Decision vector is defined if a rule is chosen or not
 * Delayed spiking vector is defined if a rule is delayed or not
 */

/**
 * @brief Get the indicator vector for the current time step
 * 
 * @param indicatorVector 
 * @param delayStatusVector 
 * @param decisionVector 
 * @param delayedSpikingVector 
 * @param delayVector 
 * @param ruleCountVector 
 * @param neuronCount 
 */
void getIndicatorVector(
    int8_t indicatorVector[],
    int8_t delayStatusVector[],
    int8_t decisionVector[],
    int8_t delayedSpikingVector[],
    int8_t delayVector[],
    int8_t ruleCountVector[],
    int neuronCount
){
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++){
        for (int j = 0; j < ruleCountVector[i]; j++){
            // If the neuron has no delay, then a rule is applicable (whether chosen or delayed)
            indicatorVector[ruleIndex + j] = (delayStatusVector[i] == 0) && 
                ((decisionVector[ruleIndex + j] && delayVector[ruleIndex + j] == 0) 
                || delayedSpikingVector[ruleIndex + j]);
        }
        ruleIndex += ruleCountVector[i];
    }
}

/**
 * @brief Get the delayed spiking vector in the next time step
 * 
 * @param delayedSpikingVector 
 * @param indicatorVector 
 * @param decisionVector 
 * @param delayVector 
 * @param ruleCount 
 */
void getNextDelayedSpikingVector(
    int8_t delayedSpikingVector[],
    int8_t indicatorVector[],
    int8_t decisionVector[],
    int8_t delayVector[],
    int ruleCount
){
    for (int i = 0; i < ruleCount; i++){
        delayedSpikingVector[i] = (delayedSpikingVector[i] && !indicatorVector[i]) 
            || (decisionVector[i] && delayVector[i]);
    }
}

/**
 * @brief Get the delay status vector in the next time step
 * 
 * @param delayStatusVector Current delay status vector. Also destination for the result
 * @param delayVector 
 * @param ruleCountVector 
 * @param decisionVector
 * @param neuronCount 
 */
void getNextDelayStatusVector(
    int8_t delayStatusVector[],
    int8_t delayVector[],
    int8_t ruleCountVector[],
    int8_t decisionVector[],
    int neuronCount
){
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++){
        int8_t delay = 0;
        for (int j = 0; j < ruleCountVector[i]; j++){
            if (decisionVector[ruleIndex + j]){
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
 * @param configurationVector 
 * @param transposedTransitionMatrix 
 * @param nextDelayStatusVector 
 * @param indicatorVector 
 * @param spikeTrainVector 
 * @param ruleCount 
 * @param neuronCount 
 */
void getNextConfigurationVector(
    int8_t configurationVector[],
    int8_t transposedTransitionMatrix[],
    int8_t nextDelayStatusVector[],
    int8_t indicatorVector[],
    int8_t spikeTrainVector[],
    int ruleCount,
    int neuronCount
){
    for (int i = 0; i < neuronCount; i++){
        int8_t dotProduct = 0;
        for (int j = 0; j < ruleCount; j++){
            dotProduct += ((indicatorVector[j] + spikeTrainVector[j]) * transposedTransitionMatrix[ruleCount * i + j]);
        }
        int8_t nextStatus = nextDelayStatusVector[i] == 0;
        // Matrix representation revisited has an error (Theorem 4). Corrected here
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
 * @param decisionVector 
 * @param spikeTrainVector
 * @param ruleCount 
 * @param neuronCount 
 */
void getNext (
    int8_t configurationVector[],
    int8_t delayStatusVector[],
    int8_t transposedTransitionMatrix[],
    int8_t delayVector[],
    int8_t ruleCountVector[],
    int8_t decisionVector[],
    int8_t delayedSpikingVector[],
    int8_t spikeTrainVector[],
    int ruleCount,
    int neuronCount
){
    int8_t *indicatorVector = malloc(ruleCount * sizeof(int8_t));
    getIndicatorVector(
        indicatorVector,
        delayStatusVector,
        decisionVector,
        delayedSpikingVector,
        delayVector,
        ruleCountVector,
        neuronCount
    );

    getNextDelayedSpikingVector(
        delayedSpikingVector,
        indicatorVector,
        decisionVector,
        delayVector,
        ruleCount
    );

    getNextDelayStatusVector(
        delayStatusVector,
        delayVector,
        ruleCountVector,
        decisionVector,
        neuronCount
    );

    getNextConfigurationVector(
        configurationVector,
        transposedTransitionMatrix,
        delayStatusVector,
        indicatorVector,
        spikeTrainVector,
        ruleCount,
        neuronCount
    );

    free(indicatorVector);
}

int main() {
    return 0;
}