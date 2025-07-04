export const idlFactory = ({ IDL }) => {
  return IDL.Service({ 'status' : IDL.Func([], [IDL.Text], ['query']) });
};
export const init = ({ IDL }) => { return []; };
