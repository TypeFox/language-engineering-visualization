import { AstNode } from './index';
export declare class StateMachineTools {
    currentState: StateMachineState;
    ast: StateMachineAstNode;
    constructor(ast: StateMachineAstNode);
    /**
     * get the next state based on the event
     * @param event The event to get the next state for
     * @returns The next state or null if no transition is defined for the event
     */
    getNextState(event: StateMachineEvent): StateMachineState | null;
    /**
     * Get the states from the AST
     * @param ast The AST to get the states from
     * @returns The states
     */
    getStates(): StateMachineState[];
    /**
     * Set the current state
     * @param state The state to set
     */
    setState(state: StateMachineState): void;
    /**
     * Get the events from the AST
     * @param ast The AST to get the events from
     * @returns The events
     */
    getEvents(): StateMachineEvent[];
    /**
     * Change the state based on the event
     * @param event The event to change the state for
     */
    changeState(event: StateMachineEvent): void;
    /**
     * Get the current state
     * @returns The current state
     */
    getCurrentState(): StateMachineState;
    /**
     * Check if the current state is the given state
     * @param state The state to check
     * @returns True if the current state is the given state
    */
    isCurrentState(state: StateMachineState): boolean;
    /**
     * Check if the event is enabled
     * @param event The event to check
     * @returns True if the event is enabled
    */
    isEventEnabled(event: StateMachineEvent): boolean;
    /**
     * Get the event by name
     * @param name The name of the event
     * @returns The event or null if no event with the given name exists
     */
    getEventByName(name: string): StateMachineEvent | null;
    /**
     * Get the state by name
     * @param name The name of the state
     * @returns The state or null if no state with the given name exists
     */
    getStateByName(name: string): StateMachineState | null;
}
export interface StateMachineAstNode extends AstNode {
    events: StateMachineEvent[];
    states: StateMachineState[];
    init: InitalState;
}
export declare type StateMachineEvent = {
    name: string;
};
declare type InitalState = {
    ref: StateMachineState;
};
export declare type StateMachineState = {
    name: string;
    transitions: {
        event: {
            ref: StateMachineEvent;
        };
        state: {
            ref: StateMachineState;
        };
    }[];
};
export declare const defaultText = "// Create your own statemachine here!\nstatemachine TrafficLight\n\nevents\n    switchCapacity\n    next\n\ninitialState PowerOff\n\nstate PowerOff\n    switchCapacity => RedLight\nend\n\nstate RedLight\n    switchCapacity => PowerOff\n    next => GreenLight\nend\n\nstate YellowLight\n    switchCapacity => PowerOff\n    next => RedLight\nend\n\nstate GreenLight\n    switchCapacity => PowerOff\n    next => YellowLight\nend";
export {};
