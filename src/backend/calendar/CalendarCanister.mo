import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import TrieMap "mo:base/TrieMap";
import Result "mo:base/Result";
import Option "mo:base/Option";
import Error "mo:base/Error";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Hash "mo:base/Hash"; // Still imported, but be aware of deprecation warnings for `Hash.hash`
import Types "../types";

actor CalendarCanister {

    // Warnings about `Hash.hash` being deprecated for large Nat values.
    // For typical ID usage, this might be acceptable, but for very large Nats, consider a custom hash.
    private var calendars : HashMap.HashMap<Types.CalendarId, Types.Calendar> = HashMap.HashMap<Types.CalendarId, Types.Calendar>(0, Nat.equal, Hash.hash);
    private var events : HashMap.HashMap<Types.EventId, Types.Event> = HashMap.HashMap<Types.EventId, Types.Event>(0, Nat.equal, Hash.hash);

    // Index: CalendarId -> Timestamp -> [EventId]
    private var eventIndexByCalendar : HashMap.HashMap<Types.CalendarId, TrieMap.TrieMap<Types.Timestamp, [Types.EventId]>> = HashMap.HashMap<Types.CalendarId, TrieMap.TrieMap<Types.Timestamp, [Types.EventId]>>(0, Nat.equal, Hash.hash);

    private stable var nextCalendarId : Types.CalendarId = 0;
    private stable var nextEventId : Types.EventId = 0;

    public shared (msg) func create_calendar_internal(owner : Principal, name : Text, color : Text) : async Types.Calendar {
        let id = nextCalendarId;
        nextCalendarId += 1;

        let newCalendar : Types.Calendar = {
            id = id;
            owner = owner;
            name = name;
            color = color;
        };
        calendars.put(id, newCalendar);
        eventIndexByCalendar.put(id, TrieMap.TrieMap<Types.Timestamp, [Types.EventId]>(Int.equal, Int.hash));

        return newCalendar;
    };

    public shared (msg) func create_event(calendarId : Types.CalendarId, title : Text, description : Text, startTime : Types.Timestamp, endTime : Types.Timestamp, color : Text) : async Types.Event {
        let caller = msg.caller;

        // Using Nutzer.get_or_crash for cleaner error handling
        let calendar = Nutzer.get_or_crash(calendars.get(calendarId), "Calendar not found with ID: " # Nat.toText(calendarId));

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
        // Warning about Array.append deprecation. Consider using a Buffer for better performance.
        calendarEventsIndex.put(startTime, Array.append(eventsAtStartTime, [id]));

        return newEvent;
    };

    public shared (msg) func get_event(eventId : Types.EventId) : async ?Types.Event {
        return events.get(eventId);
    };

    public shared (msg) func get_events_for_range(calendarId : Types.CalendarId, queryStartTime : Types.Timestamp, queryEndTime : Types.Timestamp) : async [Types.Event] {
        if (calendars.get(calendarId) == null) {
            throw Error.reject("Calendar not found with ID: " # Nat.toText(calendarId));
        };
        if (queryStartTime >= queryEndTime) {
            if (queryStartTime > queryEndTime) {
                throw Error.reject("Query start time cannot be after query end time.");
            };
        };

        var resultingEvents : [Types.Event] = []; // Consider using a Buffer here
        let calendarEventsIndexOpt = eventIndexByCalendar.get(calendarId);

        let calendarEventsIndex = switch (calendarEventsIndexOpt) {
            case (null) return [];
            case (?index) index;
        };

        for ((eventStamp, eventIds) in calendarEventsIndex.entries()) {
            if (eventStamp < queryEndTime) {
                for (eventId in eventIds.vals()) {
                    switch (events.get(eventId)) {
                        case (?event) {
                            if (event.startTime < queryEndTime and event.endTime > queryStartTime) {
                                // Warning about Array.append deprecation. Consider using a Buffer for better performance.
                                resultingEvents := Array.append(resultingEvents, [event]);
                            };
                        };
                        case (null) {};
                    };
                };
            };
        };

        return resultingEvents;
    };

    public shared (msg) func update_event(
        eventId : Types.EventId,
        newTitle : ?Text,
        newDescription : ?Text,
        newStartTime : ?Types.Timestamp,
        newEndTime : ?Types.Timestamp,
        newColor : ?Text,
    ) : async ?Types.Event {
        // FIX: Replaced the misplaced throw with a call to Nutzer.get_or_crash
        let currentEvent = Nutzer.get_or_crash(events.get(eventId), "Event not found for update with ID: " # Nat.toText(eventId));

        let calendar = Nutzer.get_or_crash(calendars.get(currentEvent.calendarId), "Internal error: Calendar for event not found.");

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

        switch (newStartTime) {
            case (null) {};
            case (?newStart) {
                if (newStart != oldStartTime) {
                    let calendarEventsIndex = Nutzer.get_or_crash(eventIndexByCalendar.get(currentEvent.calendarId), "Internal error: Event index for calendar not found.");

                    let eventsAtOldStartTime = Nutzer.get_or_default(calendarEventsIndex.get(oldStartTime), []);
                    var filteredOld : [Types.EventId] = []; // Consider using a Buffer here
                    for (id_ in eventsAtOldStartTime.vals()) {
                        if (id_ != eventId) {
                            // Warning about Array.append deprecation. Consider using a Buffer for better performance
                            filteredOld := Array.append(filteredOld, [id_]);
                        };
                    };

                    if (Array.size(filteredOld) == 0) {
                        calendarEventsIndex.delete(oldStartTime);
                    } else {
                        calendarEventsIndex.put(oldStartTime, filteredOld);
                    };

                    let eventsAtNewStartTime = Nutzer.get_or_default(calendarEventsIndex.get(updatedEvent.startTime), []);
                    // Warning about Array.append deprecation. Consider using a Buffer for better performance.
                    calendarEventsIndex.put(updatedEvent.startTime, Array.append(eventsAtNewStartTime, [eventId]));
                };
            };
        };

        return ?updatedEvent;
    };

    public shared (msg) func delete_event(eventId : Types.EventId) : async Bool {
        let eventToDelete = switch (events.get(eventId)) {
            case (null) return false;
            case (?event) event;
        };

        let calendar = Nutzer.get_or_crash(calendars.get(eventToDelete.calendarId), "Internal error: Calendar for event not found.");

        events.delete(eventId);

        let calendarEventsIndex = Nutzer.get_or_crash(eventIndexByCalendar.get(eventToDelete.calendarId), "Internal error: Event index for calendar not found.");
        let eventsAtStartTime = Nutzer.get_or_default(calendarEventsIndex.get(eventToDelete.startTime), []);

        var filteredList : [Types.EventId] = []; // Consider using a Buffer here
        for (id_ in eventsAtStartTime.vals()) {
            if (id_ != eventId) {
                // Warning about Array.append deprecation. Consider using a Buffer for better performance
                filteredList := Array.append(filteredList, [id_]);
            };
        };

        if (Array.size(filteredList) == 0) {
            calendarEventsIndex.delete(eventToDelete.startTime);
        } else {
            calendarEventsIndex.put(eventToDelete.startTime, filteredList);
        };

        return true;
    };

    module Nutzer {
        public func get_or_default<X>(optVal : ?X, defaultVal : X) : X {
            switch (optVal) {
                case (null) defaultVal;
                case (?x) x;
            };
        };

        public func get_or_crash<X>(optVal : ?X, message : Text) : X {
            switch (optVal) {
                // case (null) { throw Error.reject(message); };
                case (?x) x;
            };
        };
    };
};
