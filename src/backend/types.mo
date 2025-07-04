import Principal "mo:base/Principal";

// Shared types used across canisters
module Types {
  public type Principal = Principal.Principal; // Explicitly using the Principal type from the Principal module
  public type CalendarId = Nat;
  public type EventId = Nat;
  public type Timestamp = Int; // Nanoseconds since epoch (UTC)

  public type Event = {
    id : EventId;
    calendarId : CalendarId;
    title : Text;
    description : Text;
    startTime : Timestamp;
    endTime : Timestamp;
    color : Text; // For labels, inspired by reference project
    // attendees: [Principal]; // We'll add this later
  };

  public type UserProfile = {
    principal : Principal;
    name : Text;
    // settings, etc.
  };

  public type Calendar = {
    id : CalendarId;
    owner : Principal;
    name : Text;
    color : Text;
    // permissions, etc.
  };
};
