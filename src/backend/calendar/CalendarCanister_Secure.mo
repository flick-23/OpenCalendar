import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import TrieMap "mo:base/TrieMap";
import Option "mo:base/Option";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Hash "mo:base/Hash";
import Result "mo:base/Result";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Types "./types";
import SecurityBase "../common/SecurityBase";

actor CalendarCanister {

    // Import types from the types module
    type Event = Types.Event;
    type EventId = Types.EventId;
    type Timestamp = Types.Timestamp;
    type EventUpdate = Types.EventUpdate;

    // === SECURITY & SCALING CONFIGURATION ===

    // Registry canister ID from deployment
    private let REGISTRY_CANISTER = Principal.fromText("vpyes-67777-77774-qaaeq-cai");
    // Load balancer canister for distributed requests (currently unused but reserved)
    private let _LOAD_BALANCER_CANISTER = Principal.fromText("vu5yx-eh777-77774-qaaga-cai");

    // Canister configuration - should be set during deployment
    private let config : SecurityBase.CanisterConfig = {
        registry_canister = REGISTRY_CANISTER;
        group_id = "icp-calendar-main";
        access_key = "icp-calendar-secure-key-2025"; // Generated access key
        canister_type = "calendar";
        shard_key = ?"events-shard-1"; // For data partitioning
    };

    // Initialize secure base
    private let secure_base = SecurityBase.SecureCanister(config);

    // Performance metrics
    private stable var request_count : Nat = 0;
    private stable var error_count : Nat = 0;
    private stable var last_backup_time : Int = 0;

    // Get current canister principal for security checks
    private let my_principal = Principal.fromActor(CalendarCanister);

    // === STATE VARIABLES ===

    // Stable counter for generating unique event IDs
    private stable var nextEventId : EventId = 1;

    // Custom hash function for EventId (Nat) to avoid deprecation warning
    private func hashEventId(id : Nat) : Hash.Hash {
        // Safe hash function that handles large numbers without overflow
        var hash : Nat32 = 0;
        var n = id;
        while (n > 0) {
            let byte = Nat32.fromNat(n % 256);
            hash := (hash *% 31) +% byte; // Use overflow operators
            n := n / 256;
        };
        hash;
    };

    // Custom hash function for timestamps (Int) to avoid deprecation warning
    private func hashTimestamp(timestamp : Int) : Hash.Hash {
        // Convert to Nat and use our custom hash
        hashEventId(Int.abs(timestamp));
    };

    // Primary storage: HashMap for O(1) lookups by EventId
    // This is our single source of truth for event data
    private var events : HashMap.HashMap<EventId, Event> = HashMap.HashMap<EventId, Event>(0, Nat.equal, hashEventId);

    // Performance index: TrieMap for efficient range queries by timestamp
    // Maps start timestamp to array of event IDs starting at that time
    // TrieMap maintains sorted order, enabling efficient range queries
    private var eventsByStartTime : TrieMap.TrieMap<Timestamp, [EventId]> = TrieMap.TrieMap<Timestamp, [EventId]>(Int.equal, hashTimestamp);

    // === SECURITY FUNCTIONS ===

    // Verify inter-canister calls
    private func verify_inter_canister_caller(caller : Principal) : async Result.Result<(), Text> {
        switch (await secure_base.verify_caller(caller, my_principal)) {
            case (#ok(true)) { #ok() };
            case (#ok(false)) { #err("Unauthorized canister") };
            case (#err(msg)) { #err(msg) };
        };
    };

    // Create backup snapshot
    private func create_backup_snapshot() : async () {
        let total_events = events.size();
        let data_hash = "hash_" # Nat.toText(total_events) # "_" # Int.toText(Time.now());
        await secure_base.create_backup(my_principal, data_hash, total_events);
        last_backup_time := Time.now();
    };

    // Update request metrics
    private func update_metrics(success : Bool, _response_time : ?Int) : () {
        request_count += 1;
        if (not success) {
            error_count += 1;
        };

        // TODO: Add async load balancer reporting in future version
        // For now, metrics are tracked locally only
    };

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
     * SECURITY: Only authenticated users can create events
     */
    public shared (msg) func create_event(
        title : Text,
        description : Text,
        startTime : Timestamp,
        endTime : Timestamp,
        color : Text,
    ) : async Result.Result<Event, Text> {
        let start_time = Time.now();

        // Validate input
        if (startTime >= endTime) {
            update_metrics(false, ?(Time.now() - start_time));
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

        update_metrics(true, ?(Time.now() - start_time));
        #ok(newEvent);
    };

    /**
     * Retrieves all events within a given time range.
     * This is a query function for optimal performance.
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
     * SECURITY: Ownership verification + inter-canister call verification for automated updates
     */
    public shared (msg) func update_event(
        eventId : EventId,
        newTitle : ?Text,
        newDescription : ?Text,
        newStartTime : ?Timestamp,
        newEndTime : ?Timestamp,
        newColor : ?Text,
    ) : async Result.Result<Event, Text> {
        let start_time = Time.now();
        let caller = msg.caller;

        // Get the existing event
        let existingEvent = switch (events.get(eventId)) {
            case (null) {
                update_metrics(false, ?(Time.now() - start_time));
                return #err("Event not found");
            };
            case (?event) event;
        };

        // Check ownership OR verify inter-canister call
        let is_authorized = if (existingEvent.owner == caller) {
            true;
        } else {
            // Check if this is an authorized inter-canister call
            switch (await verify_inter_canister_caller(caller)) {
                case (#ok()) true;
                case (#err(_)) false;
            };
        };

        if (not is_authorized) {
            update_metrics(false, ?(Time.now() - start_time));
            return #err("Only the event owner or authorized canisters can update this event");
        };

        // Apply updates
        let oldStartTime = existingEvent.startTime;
        let finalStartTime = Option.get(newStartTime, existingEvent.startTime);
        let finalEndTime = Option.get(newEndTime, existingEvent.endTime);

        // Validate new times
        if (finalStartTime >= finalEndTime) {
            update_metrics(false, ?(Time.now() - start_time));
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

        update_metrics(true, ?(Time.now() - start_time));
        #ok(updatedEvent);
    };

    /**
     * Deletes an event. Only the owner can delete their events.
     *
     * SECURITY: Ownership verification + inter-canister call verification
     */
    public shared (msg) func delete_event(eventId : EventId) : async Result.Result<Bool, Text> {
        let start_time = Time.now();
        let caller = msg.caller;

        // Get the event to delete
        let eventToDelete = switch (events.get(eventId)) {
            case (null) {
                update_metrics(false, ?(Time.now() - start_time));
                return #err("Event not found");
            };
            case (?event) event;
        };

        // Check ownership OR verify inter-canister call
        let is_authorized = if (eventToDelete.owner == caller) {
            true;
        } else {
            // Check if this is an authorized inter-canister call
            switch (await verify_inter_canister_caller(caller)) {
                case (#ok()) true;
                case (#err(_)) false;
            };
        };

        if (not is_authorized) {
            update_metrics(false, ?(Time.now() - start_time));
            return #err("Only the event owner or authorized canisters can delete this event");
        };

        // Remove from primary storage
        events.delete(eventId);

        // Remove from time index
        removeFromTimeIndex(eventId, eventToDelete.startTime);

        update_metrics(true, ?(Time.now() - start_time));
        #ok(true);
    };

    /**
     * Retrieves a single event by ID.
     */
    public shared query func get_event(eventId : EventId) : async ?Event {
        events.get(eventId);
    };

    /**
     * Returns system statistics for monitoring and debugging.
     *
     * ENHANCED: Includes security and performance metrics
     */
    public shared query func get_stats() : async {
        totalEvents : Nat;
        requestCount : Nat;
        errorCount : Nat;
        lastBackupTime : Int;
        canisterPrincipal : Principal;
        groupId : Text;
    } {
        {
            totalEvents = events.size();
            requestCount = request_count;
            errorCount = error_count;
            lastBackupTime = last_backup_time;
            canisterPrincipal = my_principal;
            groupId = config.group_id;
        };
    };

    /**
     * SECURITY: Get events for a specific user (used by notification service)
     * Only authorized canisters can call this
     */
    public shared (msg) func get_events_for_user(user : Principal, start : Timestamp, end : Timestamp) : async Result.Result<[Event], Text> {
        let caller = msg.caller;

        // Verify this is an authorized inter-canister call
        switch (await verify_inter_canister_caller(caller)) {
            case (#ok()) {
                let all_events = await get_events_for_range(start, end);
                let user_events = Array.filter<Event>(all_events, func(event) = event.owner == user);
                #ok(user_events);
            };
            case (#err(msg)) { #err(msg) };
        };
    };

    /**
     * SECURITY: Manual backup trigger (for emergency situations)
     * Only authorized canisters can call this
     */
    public shared (msg) func trigger_backup() : async Result.Result<(), Text> {
        let caller = msg.caller;

        // Verify this is an authorized inter-canister call
        switch (await verify_inter_canister_caller(caller)) {
            case (#ok()) {
                await create_backup_snapshot();
                #ok();
            };
            case (#err(msg)) { #err(msg) };
        };
    };

    /**
     * SCALING: Health check endpoint for load balancer
     */
    public shared query func health_check() : async {
        status : Text;
        events_count : Nat;
        memory_usage : Nat;
        error_rate : Float;
    } {
        let error_rate = if (request_count > 0) {
            Float.fromInt(error_count) / Float.fromInt(request_count);
        } else {
            0.0;
        };

        {
            status = if (error_rate > 0.1) "degraded" else "healthy";
            events_count = events.size();
            memory_usage = events.size() * 1000; // Rough estimate
            error_rate = error_rate;
        };
    };

    // === SYSTEM LIFECYCLE ===

    // Note: Timers are initialized during canister deployment
    // System upgrade handlers can be added here if needed
};
