actor {
    public query func greet(name : Text) : async Text {
        return "Hello from the notification canister, " # name # "!";
    };
};
