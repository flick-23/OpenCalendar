import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import TrieMap "mo:base/TrieMap"; // For event indexing by timestamp
import Result "mo:base/Result"; // For more structured error handling
import Option "mo:base/Option"; // For handling optional values
import Error "mo:base/Error";
import Nat "mo:base/Nat";
import Int "mo:base/Int"; // Required for Timestamp (Int) comparison if not using a specific Time library
import Types "../types"; // Corrected import path relative to this file

actor CalendarCanister {

    stable var calendars : HashMap.HashMap<Types.CalendarId, Types.Calendar> = HashMap.HashMap<Types.CalendarId, Types.Calendar>(0, Nat.equal, Nat.hash);
    stable var events : HashMap.HashMap<Types.EventId, Types.Event> = HashMap.HashMap<Types.EventId, Types.Event>(0, Nat.equal, Nat.hash);

    // Index: CalendarId -> Timestamp -> [EventId]
    // This allows fetching events for a specific calendar within a time range more efficiently.
    // The Timestamp key in the TrieMap refers to the event's startTime.
    stable var eventIndexByCalendar : HashMap.HashMap<Types.CalendarId, TrieMap.TrieMap<Types.Timestamp, [Types.EventId]>> =
        HashMap.HashMap<Types.CalendarId, TrieMap.TrieMap<Types.Timestamp, [Types.EventId]>>(0, Nat.equal, Nat.hash);

    stable var nextCalendarId : Types.CalendarId = 0;
    stable var nextEventId : Types.EventId = 0;

    // This function is intended to be called by UserRegistry or an admin.
    // It creates a new calendar record within this canister.
    public shared (msg) func create_calendar_internal(owner : Principal.Principal, name : Text, color : Text) : async Types.Calendar {
        let id = nextCalendarId;
        nextCalendarId += 1;

        let newCalendar : Types.Calendar = {
            id = id;
            owner = owner;
            name = name;
            color = color;
        };
        calendars.put(id, newCalendar);
        // Initialize an empty event index for this new calendar
        // Using Int.compare for Timestamps (Int)
        eventIndexByCalendar.put(id, TrieMap.TrieMap<Types.Timestamp, [Types.EventId]>(Int.compare));

        return newCalendar;
    };

    public shared (msg) func create_event(calendarId : Types.CalendarId, title : Text, description : Text, startTime : Types.Timestamp, endTime : Types.Timestamp, color : Text) : async Types.Event {
        let caller = msg.caller;

        let calendar = switch (calendars.get(calendarId)) {
            case (null) throw Error.reject("Calendar not found with ID: " # Nat.toText(calendarId));
            case (?cal) {
                // Optional: Check if caller is owner or has permissions
                // if (cal.owner != caller) { throw Error.reject("Unauthorized to create event in this calendar."); };
                cal;
            };
        };

        if (startTime >= endTime) {
            throw Error.reject("Event start time must be before end time.");
        };

        let id = nextEventId;
        nextEventId += 1;

        let newEvent : Types.Event = {
            id = id;
            calendarId = calendarId;
            title = title;
            description = description;
            startTime = startTime;
            endTime = endTime;
            color = color;
        };
        events.put(id, newEvent);

        let calendarEventsIndex = Nutzer.get_or_crash(eventIndexByCalendar.get(calendarId), "Internal error: Event index for calendar not found.");

        let eventsAtStartTime = Nutzer.get_or_default(calendarEventsIndex.get(startTime), []);
        calendarEventsIndex.put(startTime, Array.append(eventsAtStartTime, [id]));

        return newEvent;
    };

    public shared (msg) func get_event(eventId: Types.EventId) : async ?Types.Event {
        return events.get(eventId);
    };

    public shared (msg) func get_events_for_range(calendarId : Types.CalendarId, queryStartTime : Types.Timestamp, queryEndTime : Types.Timestamp) : async [Types.Event] {
        if (calendars.get(calendarId) == null) {
            throw Error.reject("Calendar not found with ID: " # Nat.toText(calendarId));
        };
        if (queryStartTime >= queryEndTime) {
            // Allow queryEndTime == queryStartTime for instantaneous checks if necessary, though typically range means start < end.
            // Depending on interpretation, could also throw: Error.reject("Query start time must be before end time for a range query.");
            if (queryStartTime > queryEndTime) {
                 throw Error.reject("Query start time cannot be after query end time.");
            }
        };

        var resultingEvents : [Types.Event] = [];
        let calendarEventsIndexOpt = eventIndexByCalendar.get(calendarId);

        let calendarEventsIndex = switch (calendarEventsIndexOpt) {
            case (null) return []; // No event index for this calendar, so no events.
            case (?index) index;
        };

        // Iterate over the TrieMap. For each timestamp (event start time) in the index:
        // 1. Check if the timestamp itself is within the broader query window [queryStartTime, queryEndTime).
        //    (This is a pre-filter; events could start outside but overlap).
        // 2. For each event ID at that timestamp, fetch the event.
        // 3. Perform an accurate overlap check: (event.startTime < queryEndTime && event.endTime > queryStartTime)
        for ((eventStamp, eventIds) in calendarEventsIndex.entries()) {
            // This outer check is an optimization: if an event's start time isn't even broadly related to the query window, skip.
            // The key condition is the overlap check below.
            // An event starting at `eventStamp` could overlap if `eventStamp < queryEndTime`.
            if (eventStamp < queryEndTime) { // Potential to overlap
                for (eventId in eventIds.vals()) {
                    match (events.get(eventId)) {
                        case (?event) {
                            // Precise overlap condition:
                            // An event [eS, eE) overlaps with query range [qS, qE) if:
                            // eS < qE AND eE > qS
                            if (event.startTime < queryEndTime && event.endTime > queryStartTime) {
                                resultingEvents := Array.append(resultingEvents, [event]);
                            }
                        };
                        case (null) {
                            // This case (event ID in index but not in events map) indicates an inconsistency.
                            // Should ideally log this or handle appropriately. For now, skip.
                        };
                    };
                };
            }
        };

        // Consider sorting results, e.g., by start time, if beneficial for the client.
        // Array.sort<T.Event>(resultingEvents, EventSorter.compareByStartTime);
        return resultingEvents;
    };

    public shared (msg) func update_event(
        eventId: Types.EventId,
        newTitle: ?Text,
        newDescription: ?Text,
        newStartTime: ?Types.Timestamp,
        newEndTime: ?Types.Timestamp,
        newColor: ?Text
    ) : async ?Types.Event {
        let currentEvent = switch(events.get(eventId)) {
            case (null) throw Error.reject("Event not found for update with ID: " # Nat.toText(eventId));
            case (?event) event;
        };

        let calendar = Nutzer.get_or_crash(calendars.get(currentEvent.calendarId), "Internal error: Calendar for event not found.");
        // Optional: Permission check (e.g., msg.caller == calendar.owner)

        let oldStartTime = currentEvent.startTime;

        let finalStartTime = Option.get(newStartTime, currentEvent.startTime);
        let finalEndTime = Option.get(newEndTime, currentEvent.endTime);

        if (finalStartTime >= finalEndTime) {
            throw Error.reject("Event start time must be before end time.");
        };

        let updatedEvent : Types.Event = {
            id = eventId;
            calendarId = currentEvent.calendarId;
            title = Option.get(newTitle, currentEvent.title);
            description = Option.get(newDescription, currentEvent.description);
            startTime = finalStartTime;
            endTime = finalEndTime;
            color = Option.get(newColor, currentEvent.color);
        };

        events.put(eventId, updatedEvent);

        // Update index if start time has changed
        if (newStartTime != null && newStartTime! != oldStartTime) { // Check actual change from old start time
            let calendarEventsIndex = Nutzer.get_or_crash(eventIndexByCalendar.get(currentEvent.calendarId), "Internal error: Event index for calendar not found.");

            // Remove from old start time list in index
            let eventsAtOldStartTime = Nutzer.get_or_default(calendarEventsIndex.get(oldStartTime), []);
            var filteredOld : [Types.EventId] = [];
            for (id_ in eventsAtOldStartTime.vals()) { if (id_ != eventId) { filteredOld := Array.append(filteredOld, [id_]); }; };

            if (Array.isEmpty(filteredOld)) {
                calendarEventsIndex.delete(oldStartTime);
            } else {
                calendarEventsIndex.put(oldStartTime, filteredOld);
            };

            // Add to new start time list in index
            let eventsAtNewStartTime = Nutzer.get_or_default(calendarEventsIndex.get(updatedEvent.startTime), []);
            calendarEventsIndex.put(updatedEvent.startTime, Array.append(eventsAtNewStartTime, [eventId]));
        };

        return ?updatedEvent;
    };

    public shared (msg) func delete_event(eventId : Types.EventId) : async Bool {
        let eventToDelete = switch(events.get(eventId)) {
            case (null) return false; // Event not found, nothing to delete.
            case (?event) event;
        };

        let calendar = Nutzer.get_or_crash(calendars.get(eventToDelete.calendarId), "Internal error: Calendar for event not found.");
        // Optional: Permission check (e.g., msg.caller == calendar.owner)

        events.delete(eventId);

        // Remove from index
        let calendarEventsIndex = Nutzer.get_or_crash(eventIndexByCalendar.get(eventToDelete.calendarId), "Internal error: Event index for calendar not found.");
        let eventsAtStartTime = Nutzer.get_or_default(calendarEventsIndex.get(eventToDelete.startTime), []);

        var filteredList : [Types.EventId] = [];
        for (id_ in eventsAtStartTime.vals()) {
            if (id_ != eventId) {
                filteredList := Array.append(filteredList, [id_]);
            };
        };

        if (Array.isEmpty(filteredList)) {
            calendarEventsIndex.delete(eventToDelete.startTime);
        } else {
            calendarEventsIndex.put(eventToDelete.startTime, filteredList);
        };

        return true;
    };

    module Nutzer {
        public func get_or_default<X>(optVal: ?X, defaultVal: X) : X {
          switch (optVal) {
            case (null) return defaultVal;
            case (?x) return x;
          };
        };
        public func get_or_crash<X>(optVal: ?X, message: Text) : X {
            switch (optVal) {
                case (null) throw Error.reject(message); // Make sure Error is available or use a custom error type
                case (?x) return x;
            };
        };
    };
}
