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
    int8_t indicatorVector[],
    int8_t nextDelayStatusVector[],
    int8_t decisionVector[],
    int8_t delayIndicatorVector[],
    int8_t delayVector[],
    int8_t ruleCountVector[],
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
 * @param indicatorVector
 * @param spikeTrainVector
 * @param ruleCountVector
 * @param neuronCount
 */
void getFiringVector(
    int8_t firingVector[],
    int8_t indicatorVector[],
    int8_t spikeTrainVector[],
    int8_t ruleCountVector[],
    int neuronCount)
{
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++)
    {
        firingVector[i] = 0;
        for (int j = 0; j < ruleCountVector[i]; j++)
        {
            if (indicatorVector[ruleIndex + j] || spikeTrainVector[ruleIndex + j])
            {
                firingVector[ruleIndex + j] = 1;
                break;
            }
        }
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
    int8_t delayIndicatorVector[],
    int8_t indicatorVector[],
    int8_t decisionVector[],
    int8_t delayVector[],
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
    int neuronCount)
{
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++)
    {
        int8_t delay = 0;
        for (int j = 0; j < ruleCountVector[i]; j++)
        {
            if (decisionVector[ruleIndex + j])
            {
                delay = delayVector[ruleIndex + j];
                break;
            }
        }

        delayStatusVector[i] = delayStatusVector[i] > 0 ? delayStatusVector[i] - 1 : delay;
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
    int neuronCount)
{
    for (int i = 0; i < neuronCount; i++)
    {
        int8_t dotProduct = 0;
        for (int j = 0; j < ruleCount; j++) 
        {
            dotProduct += ((indicatorVector[j] + spikeTrainVector[j]) 
                * transposedTransitionMatrix[ruleCount * i + j]);
        }
        int8_t nextStatus = nextDelayStatusVector[i] == 0;
        configurationVector[i] = configurationVector[i] + nextStatus * dotProduct;
    }
}

/**
 * @brief Get the vectors for the next time step
 *
 * @param configurationVector
 * @param delayStatusVector
 * @param firingVector
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
    int8_t configurationVector[],
    int8_t delayStatusVector[],
    int8_t firingVector[],
    int8_t transposedTransitionMatrix[],
    int8_t delayVector[],
    int8_t ruleCountVector[],
    int8_t decisionVector[],
    int8_t delayIndicatorVector[],
    int8_t spikeTrainVector[],
    int ruleCount,
    int neuronCount)
{
    getNextDelayStatusVector(
        delayStatusVector,
        delayVector,
        ruleCountVector,
        decisionVector,
        neuronCount);

    int8_t *indicatorVector = malloc(ruleCount * sizeof(int8_t));
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
        indicatorVector,
        spikeTrainVector,
        ruleCountVector,
        neuronCount);

    getNextConfigurationVector(
        configurationVector,
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
    int8_t delayStatusVector[],
    int8_t prevDelayIndicatorVector[],
    int8_t ruleCountVector[],
    int neuronCount)
{
    int ruleIndex = 0;
    for (int i = 0; i < neuronCount; i++)
    {
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
        ruleIndex += ruleCountVector[i];
    }
}

void getPrevConfigurationVector(
    int8_t configurationVector[],
    int8_t transposedTransitionMatrix[],
    int8_t delayStatusVector[],
    int8_t prevIndicatorVector[],
    int8_t prevSpikeTrainVector[],
    int ruleCount,
    int neuronCount)
{
    for (int i = 0; i < neuronCount; i++)
    {
        int8_t dotProduct = 0;
        for (int j = 0; j < ruleCount; j++) 
        {
            dotProduct += ((prevIndicatorVector[j] + prevSpikeTrainVector[j]) 
                * transposedTransitionMatrix[ruleCount * i + j]);
        }
        int8_t status = delayStatusVector[i] == 0;
        configurationVector[i] = configurationVector[i] - status * dotProduct;
    }
}

void getPrev(
    int8_t configurationVector[],
    int8_t delayStatusVector[],
    int8_t firingVector[],
    int8_t transposedTransitionMatrix[],
    int8_t delayVector[],
    int8_t ruleCountVector[],
    int8_t prevDecisionVector[],
    int8_t prevDelayIndicatorVector[],
    int8_t prevSpikeTrainVector[],
    int ruleCount,
    int neuronCount
) {

    int8_t *indicatorVector = malloc(ruleCount * sizeof(int8_t));
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
        transposedTransitionMatrix,
        delayStatusVector,
        indicatorVector,
        prevSpikeTrainVector,
        ruleCount,
        neuronCount);
    
    getPrevDelayStatusVector(
        delayStatusVector,
        prevDelayIndicatorVector,
        ruleCountVector,
        neuronCount);

    // Compute the prev previous indicator vector for prev firing vector
    getFiringVector(
        firingVector,
        indicatorVector,
        prevSpikeTrainVector,
        ruleCountVector,
        neuronCount);

    free(indicatorVector);
}


int main()
{
    return 0;
}