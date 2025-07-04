export const idlFactory = ({ IDL }) => {
  const CalendarId = IDL.Nat;
  const Principal = IDL.Principal;
  const Calendar = IDL.Record({
    'id' : CalendarId,
    'owner' : Principal,
    'name' : IDL.Text,
    'color' : IDL.Text,
  });
  const UserProfile = IDL.Record({
    'principal' : Principal,
    'name' : IDL.Text,
  });
  return IDL.Service({
    'create_calendar' : IDL.Func([IDL.Text, IDL.Text], [Calendar], []),
    'get_my_calendars' : IDL.Func([], [IDL.Vec(Calendar)], []),
    'get_my_profile' : IDL.Func([], [IDL.Opt(UserProfile)], []),
    'register' : IDL.Func([IDL.Text], [UserProfile], []),
  });
};
export const init = ({ IDL }) => { return []; };
