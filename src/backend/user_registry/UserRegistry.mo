import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Types "../types";
import Array "mo:base/Array";
import Result "mo:base/Result"; // For more structured error handling if needed later
import Error "mo:base/Error"; // For error handling

actor UserRegistry {

    var userProfiles : HashMap.HashMap<Principal.Principal, Types.UserProfile> = HashMap.HashMap<Principal.Principal, Types.UserProfile>(0, Principal.equal, Principal.hash);
    // Stores a list of (CalendarId, CalendarName) tuples for each user.
    // CalendarName is stored here for convenience for get_my_calendars, reducing calls if only names are needed.
    var userCalendarsMap : HashMap.HashMap<Principal.Principal, [(Types.CalendarId, Text)]> = HashMap.HashMap<Principal.Principal, [(Types.CalendarId, Text)]>(0, Principal.equal, Principal.hash);

    // This counter is a simplification. In a robust system, CalendarCanister would generate its own IDs.
    // UserRegistry would then receive this ID from CalendarCanister upon successful creation.
    stable var simulatedNextCalendarId : Types.CalendarId = 0;

    // Replace with the actual Principal ID of calendar_canister_1 after deployment
    // let calendarCanister1 : actor {
    //   create_calendar_internal : shared (Principal.Principal, Text, Text) -> async Types.Calendar;
    //   // Potentially other functions like get_calendar_details if UserRegistry needs to fetch more info
    // } = actor ""; // Placeholder, will fail if called.

    public shared (msg) func register(name : Text) : async Types.UserProfile {
        let caller = msg.caller;
        if (userProfiles.get(caller) != null) {
            throw Error.reject("User already registered.");
        };

        let newUserProfile : Types.UserProfile = {
            principal = caller;
            name = name;
            // Initialize other fields if any in Types.UserProfile
        };
        userProfiles.put(caller, newUserProfile);
        // Initialize an empty list of calendars for the new user
        userCalendarsMap.put(caller, []);
        return newUserProfile;
    };

    public shared query (msg) func get_my_profile() : async ?Types.UserProfile {
        let caller = msg.caller;
        return userProfiles.get(caller);
    };

    public shared (msg) func create_calendar(name : Text, color : Text) : async Types.Calendar {
        let caller = msg.caller;
        if (userProfiles.get(caller) == null) {
            throw Error.reject("User not registered. Please register first.");
        };

        // --- Placeholder for Inter-Canister Call ---
        // To be replaced with:
        // let actualCalendar = await calendarCanister1.create_calendar_internal(caller, name, color);
        // -----------------------------------------

        // Simulate the call to calendar_canister_1 for now
        let newCalendarId = simulatedNextCalendarId;
        simulatedNextCalendarId += 1;

        let simulatedCalendar : Types.Calendar = {
            id = newCalendarId;
            owner = caller;
            name = name;
            color = color;
        };
        // --- End of Simulation ---

        // After successful creation (real or simulated), add to user's list
        let currentUserCalendars = Nutzer.get_or_default(userCalendarsMap.get(caller), []);
        // Store only ID and name, as the full Calendar object resides in CalendarCanister
        let updatedUserCalendars = Array.append(currentUserCalendars, [(simulatedCalendar.id, simulatedCalendar.name)]);
        userCalendarsMap.put(caller, updatedUserCalendars);

        return simulatedCalendar; // Return the (simulated) calendar object
    };

    public shared (msg) func get_my_calendars() : async [Types.Calendar] {
        let caller = msg.caller;
        if (userProfiles.get(caller) == null) {
            throw Error.reject("User not registered.");
        };

        let calendarRefs = Nutzer.get_or_default(userCalendarsMap.get(caller), []);
        var calendars : [Types.Calendar] = [];

        // In a full implementation, for each (id, name) in calendarRefs,
        // you would make an inter-canister call to calendar_canister_1 (or the relevant canister if sharded)
        // to get the full Calendar object (including its color, permissions, etc.).
        // e.g., let fullCalendarDetails = await calendarCanister1.get_calendar_details(id);
        // For now, we construct partial Calendar objects using the stored name and a placeholder for color,
        // assuming the 'owner' is the caller. The actual color and potentially other details
        // would come from the CalendarCanister.
        for ((id, name) in calendarRefs.vals()) {
            // This is a simplified representation. The `color` should ideally be fetched.
            // If `create_calendar` returns the full `Types.Calendar` (even simulated),
            // and we decided to store more info in `userCalendarsMap` (e.g. `[(Types.CalendarId, Text, Text)]` for id, name, color),
            // we could use that here. However, the plan implies `CalendarCanister` is the source of truth for calendar details.
            calendars := Array.append(calendars, [{ id = id; owner = caller; /* Owner is known */
            name = name; color = "placeholder_color"; /* This should be fetched from CalendarCanister */ }]);
        };
        return calendars;
    };

    // Helper module for common operations
    module Nutzer {
        public func get_or_default<X>(optVal : ?X, defaultVal : X) : X {
            switch (optVal) {
                case (null) return defaultVal;
                case (?x) return x;
            };
        };
    };
};
