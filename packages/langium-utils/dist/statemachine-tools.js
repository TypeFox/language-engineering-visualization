"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultText = exports.StateMachineTools = void 0;
class StateMachineTools {
    constructor(ast) {
        this.ast = ast;
        // get the initial state from the AST
        this.currentState = ast.init.ref;
    }
    /**
     * get the next state based on the event
     * @param event The event to get the next state for
     * @returns The next state or null if no transition is defined for the event
     */
    getNextState(event) {
        const transition = this.currentState.transitions.find(t => t.event.ref === event);
        if (transition) {
            return transition.state.ref;
        }
        return null;
    }
    /**
     * Get the states from the AST
     * @param ast The AST to get the states from
     * @returns The states
     */
    getStates() {
        return this.ast.states;
    }
    /**
     * Set the current state
     * @param state The state to set
     */
    setState(state) {
        this.currentState = state;
    }
    /**
     * Get the events from the AST
     * @param ast The AST to get the events from
     * @returns The events
     */
    getEvents() {
        return this.ast.events;
    }
    /**
     * Change the state based on the event
     * @param event The event to change the state for
     */
    changeState(event) {
        const nextState = this.getNextState(event);
        if (nextState) {
            this.setState(nextState);
        }
    }
    /**
     * Get the current state
     * @returns The current state
     */
    getCurrentState() {
        return this.currentState;
    }
    /**
     * Check if the current state is the given state
     * @param state The state to check
     * @returns True if the current state is the given state
    */
    isCurrentState(state) {
        return this.currentState === state;
    }
    /**
     * Check if the event is enabled
     * @param event The event to check
     * @returns True if the event is enabled
    */
    isEventEnabled(event) {
        return !this.getNextState(event);
    }
    /**
     * Get the event by name
     * @param name The name of the event
     * @returns The event or null if no event with the given name exists
     */
    getEventByName(name) {
        return this.ast.events.find(e => e.name === name) || null;
    }
    /**
     * Get the state by name
     * @param name The name of the state
     * @returns The state or null if no state with the given name exists
     */
    getStateByName(name) {
        return this.ast.states.find(s => s.name === name) || null;
    }
}
exports.StateMachineTools = StateMachineTools;
exports.defaultText = `// Create your own statemachine here!
statemachine TrafficLight

events
    switchCapacity
    next

initialState PowerOff

state PowerOff
    switchCapacity => RedLight
end

state RedLight
    switchCapacity => PowerOff
    next => GreenLight
end

state YellowLight
    switchCapacity => PowerOff
    next => RedLight
end

state GreenLight
    switchCapacity => PowerOff
    next => YellowLight
end`;
//# sourceMappingURL=statemachine-tools.js.map