export const idlFactory = ({ IDL }) => {
  const CalendarId = IDL.Nat;
  const Principal = IDL.Principal;
  const Calendar = IDL.Record({
    'id' : CalendarId,
    'owner' : Principal,
    'name' : IDL.Text,
    'color' : IDL.Text,
  });
  const Timestamp = IDL.Int;
  const EventId = IDL.Nat;
  const Event = IDL.Record({
    'id' : EventId,
    'startTime' : Timestamp,
    'title' : IDL.Text,
    'endTime' : Timestamp,
    'color' : IDL.Text,
    'description' : IDL.Text,
    'calendarId' : CalendarId,
  });
  return IDL.Service({
    'create_calendar_internal' : IDL.Func(
        [IDL.Principal, IDL.Text, IDL.Text],
        [Calendar],
        [],
      ),
    'create_event' : IDL.Func(
        [CalendarId, IDL.Text, IDL.Text, Timestamp, Timestamp, IDL.Text],
        [Event],
        [],
      ),
    'delete_event' : IDL.Func([EventId], [IDL.Bool], []),
    'get_event' : IDL.Func([EventId], [IDL.Opt(Event)], []),
    'get_events_for_range' : IDL.Func(
        [CalendarId, Timestamp, Timestamp],
        [IDL.Vec(Event)],
        [],
      ),
    'update_event' : IDL.Func(
        [
          EventId,
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(Timestamp),
          IDL.Opt(Timestamp),
          IDL.Opt(IDL.Text),
        ],
        [IDL.Opt(Event)],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
