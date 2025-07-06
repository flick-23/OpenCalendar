export const idlFactory = ({ IDL }) => {
  const Timestamp = IDL.Int;
  const EventId = IDL.Nat;
  const Principal = IDL.Principal;
  const Event = IDL.Record({
    'id' : EventId,
    'startTime' : Timestamp,
    'title' : IDL.Text,
    'endTime' : Timestamp,
    'owner' : Principal,
    'color' : IDL.Text,
    'description' : IDL.Text,
  });
  const Result = IDL.Variant({ 'ok' : Event, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Bool, 'err' : IDL.Text });
  return IDL.Service({
    'create_event' : IDL.Func(
        [IDL.Text, IDL.Text, Timestamp, Timestamp, IDL.Text],
        [Result],
        [],
      ),
    'delete_event' : IDL.Func([EventId], [Result_1], []),
    'get_event' : IDL.Func([EventId], [IDL.Opt(Event)], ['query']),
    'get_events_for_range' : IDL.Func(
        [Timestamp, Timestamp],
        [IDL.Vec(Event)],
        ['query'],
      ),
    'get_stats' : IDL.Func(
        [],
        [IDL.Record({ 'totalEvents' : IDL.Nat })],
        ['query'],
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
        [Result],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
