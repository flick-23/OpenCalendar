actor {
    public query func greet(name : Text) : async Text {
        return "Hello from the scheduling canister, " # name # "!";
    };
};
