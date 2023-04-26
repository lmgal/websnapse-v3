export interface PhysicsSettings {
    /**
     * Ideal length for links (springs in physical model).
     */
    springLength: number;

    /**
     * Hook's law coefficient. 1 - solid spring.
     */
    springCoefficient: number;

    /**
     * Coulomb's law coefficient. It's used to repel nodes thus should be negative
     * if you make it positive nodes start attract each other :).
     */
    gravity: number;

    /**
     * Theta coefficient from Barnes Hut simulation. Ranged between (0, 1).
     * The closer it's to 1 the more nodes algorithm will have to go through.
     * Setting it to one makes Barnes Hut simulation no different from
     * brute-force forces calculation (each node is considered).
     */
    theta: number;

    /**
     * Drag force coefficient. Used to slow down system, thus should be less than 1.
     * The closer it is to 0 the less tight system will be.
     */
    dragCoefficient: number;

    /**
     * Default time step (dt) for forces integration
     */
    timeStep: number;

    /**
     * Adaptive time step uses average spring length to compute actual time step:
     * See: https://twitter.com/anvaka/status/1293067160755957760
     */
    adaptiveTimeStepWeight: number;

    /**
     * This parameter defines number of dimensions of the space where simulation
     * is performed.
     */
    dimensions: number;

    /**
     * In debug mode more checks are performed, this will help you catch errors
     * quickly, however for production build it is recommended to turn off this flag
     * to speed up computation.
     */
    debug: boolean;
}