export const idlFactory = ({ IDL }) => {
  const Principal = IDL.Principal;
  const Timestamp = IDL.Int;
  return IDL.Service({
    'send_event_reminder' : IDL.Func(
        [Principal, IDL.Text, Timestamp],
        [IDL.Bool],
        [],
      ),
    'status' : IDL.Func([], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
