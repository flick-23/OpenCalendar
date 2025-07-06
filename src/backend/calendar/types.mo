// src/backend/calendar/types.mo
import Principal "mo:base/Principal";

module {
  public type EventId = Nat;
  public type Timestamp = Int; // Nanoseconds since epoch
  public type Principal = Principal.Principal;

  public type Event = {
    id : EventId;
    title : Text;
    description : Text;
    startTime : Timestamp;
    endTime : Timestamp;
    color : Text;
    owner : Principal;
  };

  public type EventUpdate = {
    title : ?Text;
    description : ?Text;
    startTime : ?Timestamp;
    endTime : ?Timestamp;
    color : ?Text;
  };

  public type CreateEventRequest = {
    title : Text;
    description : Text;
    startTime : Timestamp;
    endTime : Timestamp;
    color : Text;
  };
};
