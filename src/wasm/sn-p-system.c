#include <stdint.h>
#include <stdlib.h>
#include <emscripten/emscripten.h>
#include <stdio.h>

/**
 * Redefinition of the delay status vector from rule-wise to neuron-wise
 * Indicator vector is defined if a rule is applicable or not (accounting if delayed or chosen)
 * Decision vector is defined if a rule is chosen or not
 * Delay indicator vector is defined if a rule is delayed or not
 * Firing vector is defined if a neuron fires or not (for edges)
 */

/**
 * @brief Get the indicator vector for the current time step
 *
 * @param indicatorVector
 * @param nextDelayStatusVector // Next delay status vector
 * @param decisionVector // Current decision vector
 * @param delayIndicatorVector // Current delay indicator vector
 * @param delayVector
 * @param ruleCountVector
 * @param neuronCount
 */
void getIndicatorVector(
    int16_t indicatorVector[],
    int16_t nextDelayStatusVector[],
    int16_t decisionVector[],
    int16_t delayIndicatorVector[],
    int16_t delayVector[],
    int16_t ruleCountVector[],
    int neuronCount)
{
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++)
    {
        for (int j = 0; j < ruleCountVector[i]; j++)
        {
            // If the neuron has no delay, then a rule is applicable (whether chosen or delayed)
            indicatorVector[ruleIndex + j] = (nextDelayStatusVector[i] == 0) &&
                ((decisionVector[ruleIndex + j] && delayVector[ruleIndex + j] == 0) 
                || delayIndicatorVector[ruleIndex + j]);
        }
        ruleIndex += ruleCountVector[i];
    }
}

/**
 * @brief Get the firing vector for the current time step
 *
 * @param firingVector
 * @param synapseUpdateVector
 * @param indicatorVector
 * @param spikeTrainVector
 * @param ruleCountVector
 * @param neuronCount
 */
void getFiringVector(
    int16_t firingVector[],
    int16_t synapseUpdateVector[],
    int16_t indicatorVector[],
    int16_t spikeTrainVector[],
    int16_t ruleCountVector[],
    int neuronCount)
{
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++)
    {
        int16_t oldFiring = firingVector[i];

        firingVector[i] = 0;
        for (int j = 0; j < ruleCountVector[i]; j++)
        {
            if (indicatorVector[ruleIndex + j] || spikeTrainVector[ruleIndex + j])
            {
                firingVector[i] = 1;
                break;
            }
        }

        synapseUpdateVector[i] = oldFiring != firingVector[i];
        ruleIndex += ruleCountVector[i];
    }
}

// Functions for computing the vectors for the next time step

/**
 * @brief Get the delayed indicator vector in the next time step
 *
 * @param delayIndicatorVector
 * @param indicatorVector
 * @param decisionVector
 * @param delayVector
 * @param ruleCount
 */
void getNextDelayIndicatorVector(
    int16_t delayIndicatorVector[],
    int16_t indicatorVector[],
    int16_t decisionVector[],
    int16_t delayVector[],
    int ruleCount)
{
    for (int i = 0; i < ruleCount; i++)
    {
        delayIndicatorVector[i] = (delayIndicatorVector[i] && !indicatorVector[i]) 
            || (decisionVector[i] && delayVector[i] > 0);
    }
}

/**
 * @brief Get the delay status vector in the next time step
 *
 * @param delayStatusVector Current delay status vector. Also destination for the result
 * @param neuronUpdateVector
 * @param delayVector
 * @param ruleCountVector
 * @param decisionVector
 * @param neuronCount
 */
void getNextDelayStatusVector(
    int16_t delayStatusVector[],
    int16_t neuronUpdateVector[],
    int16_t delayVector[],
    int16_t ruleCountVector[],
    int16_t decisionVector[],
    int neuronCount)
{
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++)
    {
        int16_t delay = 0;
        for (int j = 0; j < ruleCountVector[i]; j++)
        {
            if (decisionVector[ruleIndex + j])
            {
                delay = delayVector[ruleIndex + j];
                break;
            }
        }

        int16_t newDelayStatus = delayStatusVector[i] > 0 ? delayStatusVector[i] - 1 : delay;

        neuronUpdateVector[i] = newDelayStatus != delayStatusVector[i];
        delayStatusVector[i] = newDelayStatus;

        ruleIndex += ruleCountVector[i];
    }
}

/**
 * @brief Get the configuration vector in the next time step
 *
 * @param configurationVector
 * @param neuronUpdateVector
 * @param transposedTransitionMatrix
 * @param nextDelayStatusVector
 * @param indicatorVector
 * @param spikeTrainVector
 * @param ruleCount
 * @param neuronCount
 */
void getNextConfigurationVector(
    int16_t configurationVector[],
    int16_t neuronUpdateVector[],
    int16_t transposedTransitionMatrix[],
    int16_t nextDelayStatusVector[],
    int16_t indicatorVector[],
    int16_t spikeTrainVector[],
    int ruleCount,
    int neuronCount)
{
    for (int i = 0; i < neuronCount; i++)
    {
        int16_t netGain = 0;
        for (int j = 0; j < ruleCount; j++) 
        {
            netGain += ((indicatorVector[j] + spikeTrainVector[j]) 
                * transposedTransitionMatrix[ruleCount * i + j]);
        }
        int16_t nextStatus = nextDelayStatusVector[i] == 0;

        neuronUpdateVector[i] = neuronUpdateVector[i] || (
            nextStatus * netGain != 0
        );
        configurationVector[i] = configurationVector[i] + nextStatus * netGain;
    }
}

/**
 * @brief Get the vectors for the next time step
 *
 * @param configurationVector
 * @param delayStatusVector
 * @param firingVector
 * @param neuronUpdateVector
 * @param synapseUpdateVector
 * @param transposedTransitionMatrix
 * @param delayVector
 * @param ruleCountVector
 * @param decisionVector
 * @param delayIndicatorVector
 * @param spikeTrainVector
 * @param ruleCount
 * @param neuronCount
 */
void getNext(
    int16_t configurationVector[],
    int16_t delayStatusVector[],
    int16_t firingVector[],
    int16_t neuronUpdateVector[],
    int16_t synapseUpdateVector[],
    int16_t transposedTransitionMatrix[],
    int16_t delayVector[],
    int16_t ruleCountVector[],
    int16_t decisionVector[],
    int16_t delayIndicatorVector[],
    int16_t spikeTrainVector[],
    int ruleCount,
    int neuronCount)
{
    getNextDelayStatusVector(
        delayStatusVector,
        neuronUpdateVector,
        delayVector,
        ruleCountVector,
        decisionVector,
        neuronCount);

    int16_t *indicatorVector = malloc(ruleCount * sizeof(int16_t));
    getIndicatorVector(
        indicatorVector,
        delayStatusVector,
        decisionVector,
        delayIndicatorVector,
        delayVector,
        ruleCountVector,
        neuronCount);

    getFiringVector(
        firingVector,
        synapseUpdateVector,
        indicatorVector,
        spikeTrainVector,
        ruleCountVector,
        neuronCount);

    getNextConfigurationVector(
        configurationVector,
        neuronUpdateVector,
        transposedTransitionMatrix,
        delayStatusVector,
        indicatorVector,
        spikeTrainVector,
        ruleCount,
        neuronCount);

    getNextDelayIndicatorVector(
        delayIndicatorVector,
        indicatorVector,
        decisionVector,
        delayVector,
        ruleCount);

    free(indicatorVector);
}

void getPrevDelayStatusVector(
    int16_t delayStatusVector[],
    int16_t neuronUpdateVector[],
    int16_t prevDelayIndicatorVector[],
    int16_t ruleCountVector[],
    int neuronCount)
{
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++)
    {
        int16_t oldDelayStatus = delayStatusVector[i];

        for (int j = 0; j < ruleCountVector[i]; j++)
        {
            if (prevDelayIndicatorVector[ruleIndex + j])
            {
                delayStatusVector[i] = delayStatusVector[i] + 1;
                goto nextNeuron;
            }
        }
        delayStatusVector[i] = 0;

    nextNeuron:
        neuronUpdateVector[i] = neuronUpdateVector[i] || (
            oldDelayStatus != delayStatusVector[i]
        );
        ruleIndex += ruleCountVector[i];
    }
}

void getPrevConfigurationVector(
    int16_t configurationVector[],
    int16_t neuronUpdateVector[],
    int16_t transposedTransitionMatrix[],
    int16_t delayStatusVector[],
    int16_t prevIndicatorVector[],
    int16_t prevSpikeTrainVector[],
    int ruleCount,
    int neuronCount)
{
    for (int i = 0; i < neuronCount; i++)
    {
        int16_t netGain = 0;
        for (int j = 0; j < ruleCount; j++) 
        {
            netGain += ((prevIndicatorVector[j] + prevSpikeTrainVector[j]) 
                * transposedTransitionMatrix[ruleCount * i + j]);
        }
        int16_t status = delayStatusVector[i] == 0;

        neuronUpdateVector[i] = status * netGain != 0;
        configurationVector[i] = configurationVector[i] - status * netGain;
    }
}

void getPrev(
    int16_t configurationVector[],
    int16_t delayStatusVector[],
    int16_t neuronUpdateVector[],
    int16_t transposedTransitionMatrix[],
    int16_t delayVector[],
    int16_t ruleCountVector[],
    int16_t prevDecisionVector[],
    int16_t prevDelayIndicatorVector[],
    int16_t prevSpikeTrainVector[],
    int ruleCount,
    int neuronCount
) {

    int16_t *indicatorVector = malloc(ruleCount * sizeof(int16_t));
    getIndicatorVector(
        indicatorVector,
        delayStatusVector,
        prevDecisionVector,
        prevDelayIndicatorVector,
        delayVector,
        ruleCountVector,
        neuronCount);

    getPrevConfigurationVector(
        configurationVector,
        neuronUpdateVector,
        transposedTransitionMatrix,
        delayStatusVector,
        indicatorVector,
        prevSpikeTrainVector,
        ruleCount,
        neuronCount);
    
    getPrevDelayStatusVector(
        delayStatusVector,
        neuronUpdateVector,
        prevDelayIndicatorVector,
        ruleCountVector,
        neuronCount);

    free(indicatorVector);
}


int main()
{
    return 0;
}