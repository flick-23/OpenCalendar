import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import TrieMap "mo:base/TrieMap";
import Option "mo:base/Option";
import Error "mo:base/Error";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Hash "mo:base/Hash";
import Debug "mo:base/Debug";
import Result "mo:base/Result";
import Buffer "mo:base/Buffer";
import Types "./types";

actor CalendarCanister {

    // Import types from the types module
    type Event = Types.Event;
    type EventId = Types.EventId;
    type Timestamp = Types.Timestamp;
    type EventUpdate = Types.EventUpdate;

    // === STATE VARIABLES ===

    // Stable counter for generating unique event IDs
    private stable var nextEventId : EventId = 1;

    // Primary storage: HashMap for O(1) lookups by EventId
    // This is our single source of truth for event data
    private var events : HashMap.HashMap<EventId, Event> = HashMap.HashMap<EventId, Event>(0, Nat.equal, Hash.hash);

    // Performance index: TrieMap for efficient range queries by timestamp
    // Maps start timestamp to array of event IDs starting at that time
    // TrieMap maintains sorted order, enabling efficient range queries
    private var eventsByStartTime : TrieMap.TrieMap<Timestamp, [EventId]> = TrieMap.TrieMap<Timestamp, [EventId]>(Int.equal, Int.hash);

    // === HELPER FUNCTIONS ===

    // Helper to add an event ID to the timestamp index
    private func addToTimeIndex(eventId : EventId, timestamp : Timestamp) : () {
        let existingIds = switch (eventsByStartTime.get(timestamp)) {
            case (null) [];
            case (?ids) ids;
        };
        let newIds = Array.append(existingIds, [eventId]);
        eventsByStartTime.put(timestamp, newIds);
    };

    // Helper to remove an event ID from the timestamp index
    private func removeFromTimeIndex(eventId : EventId, timestamp : Timestamp) : () {
        switch (eventsByStartTime.get(timestamp)) {
            case (null) {}; // Nothing to remove
            case (?existingIds) {
                let filteredIds = Array.filter<EventId>(existingIds, func(id) { id != eventId });
                if (Array.size(filteredIds) == 0) {
                    eventsByStartTime.delete(timestamp);
                } else {
                    eventsByStartTime.put(timestamp, filteredIds);
                };
            };
        };
    };

    // === CORE EVENT CRUD OPERATIONS ===

    /**
     * Creates a new event and stores it in both the primary storage and time index.
     * The caller becomes the owner of the event.
     *
     * @param title - Event title
     * @param description - Event description
     * @param startTime - Start timestamp in nanoseconds
     * @param endTime - End timestamp in nanoseconds
     * @param color - Event color (hex code or color name)
     * @returns Result with the created Event or error message
     */
    public shared (msg) func create_event(
        title : Text,
        description : Text,
        startTime : Timestamp,
        endTime : Timestamp,
        color : Text,
    ) : async Result.Result<Event, Text> {

        // Validate input
        if (startTime >= endTime) {
            return #err("Event start time must be before end time");
        };

        let owner = msg.caller;
        let eventId = nextEventId;
        nextEventId += 1;

        // Create the new event
        let newEvent : Event = {
            id = eventId;
            title = title;
            description = description;
            startTime = startTime;
            endTime = endTime;
            color = color;
            owner = owner;
        };

        // Store in primary storage
        events.put(eventId, newEvent);

        // Store in time index for efficient range queries
        addToTimeIndex(eventId, startTime);

        #ok(newEvent);
    };

    /**
     * Retrieves all events within a given time range.
     * This is a query function for optimal performance.
     *
     * @param start - Range start timestamp in nanoseconds
     * @param end - Range end timestamp in nanoseconds
     * @returns Array of events that overlap with the time range
     */
    public shared query func get_events_for_range(start : Timestamp, end : Timestamp) : async [Event] {
        if (start >= end) {
            return [];
        };

        let resultBuffer = Buffer.Buffer<Event>(0);

        // Iterate through the sorted time index to find relevant events
        for ((timestamp, eventIds) in eventsByStartTime.entries()) {
            // Only check timestamps that could contain relevant events
            if (timestamp < end) {
                for (eventId in eventIds.vals()) {
                    switch (events.get(eventId)) {
                        case (?event) {
                            // Check if event overlaps with query range
                            if (event.startTime < end and event.endTime > start) {
                                resultBuffer.add(event);
                            };
                        };
                        case (null) {
                            // Event ID exists in index but not in primary storage - data inconsistency
                            // In production, we might want to clean this up
                        };
                    };
                };
            };
        };

        Buffer.toArray(resultBuffer);
    };

    /**
     * Updates an existing event. Only the owner can update their events.
     *
     * @param eventId - ID of the event to update
     * @param newTitle - Optional new title
     * @param newDescription - Optional new description
     * @param newStartTime - Optional new start time
     * @param newEndTime - Optional new end time
     * @param newColor - Optional new color
     * @returns Result with updated Event or error message
     */
    public shared (msg) func update_event(
        eventId : EventId,
        newTitle : ?Text,
        newDescription : ?Text,
        newStartTime : ?Timestamp,
        newEndTime : ?Timestamp,
        newColor : ?Text,
    ) : async Result.Result<Event, Text> {
        let caller = msg.caller;

        // Get the existing event
        let existingEvent = switch (events.get(eventId)) {
            case (null) return #err("Event not found");
            case (?event) event;
        };

        // Check ownership
        if (existingEvent.owner != caller) {
            return #err("Only the event owner can update this event");
        };

        // Apply updates
        let oldStartTime = existingEvent.startTime;
        let finalStartTime = Option.get(newStartTime, existingEvent.startTime);
        let finalEndTime = Option.get(newEndTime, existingEvent.endTime);

        // Validate new times
        if (finalStartTime >= finalEndTime) {
            return #err("Event start time must be before end time");
        };

        let updatedEvent : Event = {
            id = existingEvent.id;
            title = Option.get(newTitle, existingEvent.title);
            description = Option.get(newDescription, existingEvent.description);
            startTime = finalStartTime;
            endTime = finalEndTime;
            color = Option.get(newColor, existingEvent.color);
            owner = existingEvent.owner;
        };

        // Update primary storage
        events.put(eventId, updatedEvent);

        // Update time index if start time changed
        if (oldStartTime != finalStartTime) {
            removeFromTimeIndex(eventId, oldStartTime);
            addToTimeIndex(eventId, finalStartTime);
        };

        #ok(updatedEvent);
    };

    /**
     * Deletes an event. Only the owner can delete their events.
     *
     * @param eventId - ID of the event to delete
     * @returns Result with success boolean or error message
     */
    public shared (msg) func delete_event(eventId : EventId) : async Result.Result<Bool, Text> {
        let caller = msg.caller;

        // Get the event to delete
        let eventToDelete = switch (events.get(eventId)) {
            case (null) return #err("Event not found");
            case (?event) event;
        };

        // Check ownership
        if (eventToDelete.owner != caller) {
            return #err("Only the event owner can delete this event");
        };

        // Remove from primary storage
        events.delete(eventId);

        // Remove from time index
        removeFromTimeIndex(eventId, eventToDelete.startTime);

        #ok(true);
    };

    /**
     * Retrieves a single event by ID.
     *
     * @param eventId - ID of the event to retrieve
     * @returns Optional Event
     */
    public shared query func get_event(eventId : EventId) : async ?Event {
        events.get(eventId);
    };

    /**
     * Returns system statistics for monitoring and debugging.
     */
    public shared query func get_stats() : async { totalEvents : Nat } {
        {
            totalEvents = events.size();
        };
    };
};
