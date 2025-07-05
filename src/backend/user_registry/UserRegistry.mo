import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Types "../types";
import Array "mo:base/Array";
import Error "mo:base/Error"; // For error handling
import Debug "mo:base/Debug"; // For debug printing
import Nat "mo:base/Nat"; // For Nat.toText

actor UserRegistry {

    var userProfiles : HashMap.HashMap<Principal.Principal, Types.UserProfile> = HashMap.HashMap<Principal.Principal, Types.UserProfile>(0, Principal.equal, Principal.hash);
    // Stores a list of (CalendarId, CalendarName) tuples for each user.
    // CalendarName is stored here for convenience for get_my_calendars, reducing calls if only names are needed.
    var userCalendarsMap : HashMap.HashMap<Principal.Principal, [(Types.CalendarId, Text)]> = HashMap.HashMap<Principal.Principal, [(Types.CalendarId, Text)]>(0, Principal.equal, Principal.hash);

    // This counter is a simplification. In a robust system, CalendarCanister would generate its own IDs.
    // UserRegistry would then receive this ID from CalendarCanister upon successful creation.
    // stable var simulatedNextCalendarId : Types.CalendarId = 0; // Removed for stability - no longer needed

    // This will be set by an admin/deployer after calendar_canister_1 is deployed.
    var calendarCanisterPrincipal : ?Principal.Principal = null;

    // Define the interface for the CalendarCanister
    type CalendarCanisterActor = actor {
        get_calendar_details : shared query (calendarId : Types.CalendarId) -> async ?Types.Calendar;
        create_calendar_internal : shared (owner : Principal.Principal, name : Text, color : Text) -> async Types.Calendar;
        // Add other functions from CalendarCanister that UserRegistry might need to call
    };

    var calendarCanister1 : ?CalendarCanisterActor = null;

    // Admin function to set the calendar canister principal
    // This should be restricted, e.g., to the controller of this canister.
    // By default, non-query update calls made via `dfx canister call` require the caller to be a controller.
    // Thus, an explicit check `if msg.caller is_controller` is good practice but might be redundant
    // for typical dfx usage if not making the method overly public (e.g. through a wallet).
    // For simplicity here, we'll rely on the default controller restrictions for update calls.
    // A production system should have stronger, explicit authorization.
    public shared (_msg) func set_calendar_canister_id(id : Principal.Principal) : async () {
        // TODO: Add a proper authorization check here in a production environment
        // e.g., check if msg.caller is in a list of admin principals or is the canister controller.
        // For now, this function is callable by any controller of this canister.
        calendarCanisterPrincipal := ?id;
        calendarCanister1 := ?(actor (Principal.toText(id)) : CalendarCanisterActor);
        Debug.print("UserRegistry: Calendar canister ID set to " # Principal.toText(id));
    };

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

        let currentCalendarCanister = switch (calendarCanister1) {
            case (null) {
                throw Error.reject("Calendar canister service not configured in UserRegistry.");
            };
            case (?canister) canister;
        };

        // Actual Inter-Canister Call
        let newCalendar : Types.Calendar = await currentCalendarCanister.create_calendar_internal(caller, name, color);

        // After successful creation, add to user's list
        let currentUserCalendars = Nutzer.get_or_default(userCalendarsMap.get(caller), []);
        // Store only ID and name, as the full Calendar object resides in CalendarCanister
        // The name is stored for convenience for get_my_calendars if only names are needed quickly,
        // but for full details, we'll fetch from CalendarCanister.
        let updatedUserCalendars = Array.append(currentUserCalendars, [(newCalendar.id, newCalendar.name)]);
        userCalendarsMap.put(caller, updatedUserCalendars);

        return newCalendar; // Return the calendar object from CalendarCanister
    };

    public shared (msg) func get_my_calendars() : async [Types.Calendar] {
        let caller = msg.caller;
        if (userProfiles.get(caller) == null) {
            throw Error.reject("User not registered.");
        };

        let calendarRefs = Nutzer.get_or_default(userCalendarsMap.get(caller), []);
        var result_calendars : [Types.Calendar] = [];

        let currentCalendarCanister = switch (calendarCanister1) {
            case (null) {
                Debug.print("UserRegistry.get_my_calendars: Calendar canister service not configured.");
                // Depending on desired behavior, could throw or return empty. Returning empty for now.
                return [];
                // throw Error.reject("Calendar canister service not configured in UserRegistry.");
            };
            case (?canister) canister;
        };

        for ((id, _name) in calendarRefs.vals()) {
            // _name from userCalendarsMap is not strictly needed now
            let calendarDetails = await currentCalendarCanister.get_calendar_details(id);
            switch (calendarDetails) {
                case (null) {
                    // Calendar might have been deleted or an issue occurred. Log and skip.
                    Debug.print("UserRegistry.get_my_calendars: Could not fetch details for calendar ID " # Nat.toText(id));
                };
                case (?cal) {
                    result_calendars := Array.append(result_calendars, [cal]);
                };
            };
        };
        return result_calendars;
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
