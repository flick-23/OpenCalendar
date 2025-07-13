import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Iter "mo:base/Iter";

actor CanisterRegistry {

    // Types for canister management
    public type CanisterInfo = {
        id : Principal;
        canister_type : Text; // "calendar", "notification", "user_registry", etc.
        created_at : Int;
        last_heartbeat : Int;
        status : Text; // "active", "inactive", "migrating"
        replica_of : ?Principal; // If this is a replica
        shard_key : ?Text; // For data sharding
        cycles_balance : Nat;
        memory_usage : Nat;
    };

    public type CanisterGroup = {
        group_id : Text;
        owner : Principal;
        canisters : [CanisterInfo];
        created_at : Int;
        access_key : Text; // Secret key for inter-canister auth
    };

    // Stable storage
    stable var canisterEntries : [(Principal, CanisterInfo)] = [];
    stable var groupEntries : [(Text, CanisterGroup)] = [];
    stable var accessKeys : [(Text, Principal)] = []; // access_key -> group_owner

    // Runtime storage
    private var canisters = HashMap.fromIter<Principal, CanisterInfo>(
        canisterEntries.vals(),
        canisterEntries.size(),
        Principal.equal,
        Principal.hash,
    );

    private var groups = HashMap.fromIter<Text, CanisterGroup>(
        groupEntries.vals(),
        groupEntries.size(),
        Text.equal,
        Text.hash,
    );

    private var keyToOwner = HashMap.fromIter<Text, Principal>(
        accessKeys.vals(),
        accessKeys.size(),
        Text.equal,
        Text.hash,
    );

    // Generate secure access key
    private func generateAccessKey(owner : Principal, timestamp : Int) : Text {
        let seed = Principal.toText(owner) # Int.toText(timestamp);
        // In production, use proper cryptographic hash
        return "key_" # seed # "_" # Int.toText(timestamp);
    };

    // Register a new canister group
    public shared (msg) func register_canister_group(group_id : Text) : async Result.Result<CanisterGroup, Text> {
        let caller = msg.caller;

        switch (groups.get(group_id)) {
            case (?_) { #err("Group already exists") };
            case null {
                let now = Time.now();
                let access_key = generateAccessKey(caller, now);

                let group : CanisterGroup = {
                    group_id = group_id;
                    owner = caller;
                    canisters = [];
                    created_at = now;
                    access_key = access_key;
                };

                groups.put(group_id, group);
                keyToOwner.put(access_key, caller);

                #ok(group);
            };
        };
    };

    // Add canister to group
    public shared (msg) func add_canister_to_group(
        group_id : Text,
        canister_id : Principal,
        canister_type : Text,
        shard_key : ?Text,
    ) : async Result.Result<(), Text> {
        let caller = msg.caller;

        switch (groups.get(group_id)) {
            case null { #err("Group not found") };
            case (?group) {
                if (group.owner != caller) {
                    return #err("Unauthorized");
                };

                let canister_info : CanisterInfo = {
                    id = canister_id;
                    canister_type = canister_type;
                    created_at = Time.now();
                    last_heartbeat = Time.now();
                    status = "active";
                    replica_of = null;
                    shard_key = shard_key;
                    cycles_balance = 0;
                    memory_usage = 0;
                };

                let updated_canisters = Array.append(group.canisters, [canister_info]);
                let updated_group = {
                    group with canisters = updated_canisters;
                };

                groups.put(group_id, updated_group);
                canisters.put(canister_id, canister_info);

                #ok();
            };
        };
    };

    // Verify inter-canister call authenticity
    public shared func verify_inter_canister_call(
        access_key : Text,
        calling_canister : Principal,
        target_canister : Principal,
    ) : async Result.Result<Bool, Text> {

        switch (keyToOwner.get(access_key)) {
            case null { #err("Invalid access key") };
            case (?_) {
                // Check if both canisters belong to the same group
                switch (canisters.get(calling_canister), canisters.get(target_canister)) {
                    case (?_, ?_) {
                        // Both canisters exist and belong to verified group
                        #ok(true);
                    };
                    case _ { #err("Canister not found in registry") };
                };
            };
        };
    };

    // Get canisters by type for load balancing
    public shared query func get_canisters_by_type(canister_type : Text, group_id : Text) : async [{
        id : Principal;
        status : Text;
    }] {
        switch (groups.get(group_id)) {
            case null { [] };
            case (?group) {
                let filtered_canisters = Array.filter<CanisterInfo>(
                    group.canisters,
                    func(info) = info.canister_type == canister_type and info.status == "active",
                );

                Array.map<CanisterInfo, { id : Principal; status : Text }>(
                    filtered_canisters,
                    func(info) = { id = info.id; status = info.status },
                );
            };
        };
    };

    // Canister heartbeat notification
    public shared (msg) func canister_heartbeat(_access_key : Text, canister_id : Principal) : async Result.Result<(), Text> {
        let caller = msg.caller;

        // Verify the caller matches the canister_id
        if (caller != canister_id) {
            return #err("Caller principal does not match canister ID");
        };

        switch (canisters.get(caller)) {
            case null { #err("Canister not registered") };
            case (?info) {
                let updated_info = { info with last_heartbeat = Time.now() };
                canisters.put(caller, updated_info);

                // Update the group as well
                for ((group_id, group) in groups.entries()) {
                    let updated_canisters = Array.map<CanisterInfo, CanisterInfo>(
                        group.canisters,
                        func(c) = if (c.id == caller) { updated_info } else {
                            c;
                        },
                    );
                    let updated_group = {
                        group with canisters = updated_canisters
                    };
                    groups.put(group_id, updated_group);
                };

                #ok();
            };
        };
    };

    // Get group information by access key
    public shared query func get_group_info(access_key : Text) : async ?CanisterGroup {
        switch (keyToOwner.get(access_key)) {
            case null { null };
            case (?owner) {
                // Find the group owned by this principal
                for ((group_id, group) in groups.entries()) {
                    if (group.owner == owner and group.access_key == access_key) {
                        return ?group;
                    };
                };
                null;
            };
        };
    };

    // Update canister status
    public shared func update_canister_status(
        access_key : Text,
        canister_id : Principal,
        status : Text,
        cycles_balance : ?Nat,
        memory_usage : ?Nat,
    ) : async Result.Result<(), Text> {

        // Verify access
        switch (keyToOwner.get(access_key)) {
            case null { return #err("Invalid access key") };
            case (?_) {
                switch (canisters.get(canister_id)) {
                    case null { #err("Canister not found") };
                    case (?info) {
                        let updated_info = {
                            info with
                            status = status;
                            cycles_balance = switch (cycles_balance) {
                                case (?bal) bal;
                                case null info.cycles_balance;
                            };
                            memory_usage = switch (memory_usage) {
                                case (?mem) mem;
                                case null info.memory_usage;
                            };
                            last_heartbeat = Time.now();
                        };

                        canisters.put(canister_id, updated_info);
                        #ok();
                    };
                };
            };
        };
    };

    // Get health status of all canisters in a group
    public shared query func get_group_health(group_id : Text) : async [CanisterInfo] {
        switch (groups.get(group_id)) {
            case null { [] };
            case (?group) {
                Array.filter<CanisterInfo>(
                    group.canisters,
                    func(info) = (Time.now() - info.last_heartbeat) < 120_000_000_000 // 2 minutes
                );
            };
        };
    };

    // System upgrade handlers
    system func preupgrade() {
        canisterEntries := Iter.toArray(canisters.entries());
        groupEntries := Iter.toArray(groups.entries());
        accessKeys := Iter.toArray(keyToOwner.entries());
    };

    system func postupgrade() {
        canisterEntries := [];
        groupEntries := [];
        accessKeys := [];
    };
};
