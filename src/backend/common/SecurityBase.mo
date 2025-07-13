import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Nat "mo:base/Nat";

module SecurityBase {

    public type CanisterConfig = {
        registry_canister : Principal;
        group_id : Text;
        access_key : Text;
        canister_type : Text;
        shard_key : ?Text;
    };

    public type AuthResult = Result.Result<Bool, Text>;

    public class SecureCanister(config : CanisterConfig) {

        private let registry_canister = config.registry_canister;
        private let group_id = config.group_id;
        private let access_key = config.access_key;
        private let canister_type = config.canister_type;
        private let _shard_key = config.shard_key;

        // Verify incoming inter-canister call
        public func verify_caller(caller : Principal, my_principal : Principal) : async AuthResult {
            // Create actor reference to registry
            let registry = actor (Principal.toText(registry_canister)) : actor {
                verify_inter_canister_call : (Text, Principal, Principal) -> async Result.Result<Bool, Text>;
            };

            try {
                let result = await registry.verify_inter_canister_call(access_key, caller, my_principal);
                switch (result) {
                    case (#ok(true)) { #ok(true) };
                    case (#ok(false)) { #err("Unauthorized canister call") };
                    case (#err(msg)) {
                        #err("Registry verification failed: " # msg);
                    };
                };
            } catch (_) {
                #err("Failed to contact registry canister");
            };
        };

        // Send heartbeat to registry
        public func send_heartbeat(my_principal : Principal) : async () {
            let registry = actor (Principal.toText(registry_canister)) : actor {
                canister_heartbeat : (Text, Principal) -> async Result.Result<(), Text>;
            };

            try {
                let _ = await registry.canister_heartbeat(access_key, my_principal);
            } catch (_) {
                Debug.print("Heartbeat failed");
            };
        };

        // Get available canisters of a type for load balancing
        public func get_available_canisters(target_type : Text) : async [Principal] {
            let registry = actor (Principal.toText(registry_canister)) : actor {
                get_canisters_by_type : query (Text, Text) -> async [{
                    id : Principal;
                    status : Text;
                }];
            };

            try {
                let canisters = await registry.get_canisters_by_type(target_type, group_id);
                let active_canisters = Array.filter<{ id : Principal; status : Text }>(canisters, func(c) = c.status == "active");
                Array.map<{ id : Principal; status : Text }, Principal>(active_canisters, func(c) = c.id);
            } catch (_) { [] };
        };

        // Create backup snapshot
        public func create_backup(my_principal : Principal, data_hash : Text, data_size : Nat) : async () {
            let backup_canister = actor (Principal.toText(registry_canister)) : actor {
                create_backup_snapshot : (Principal, Text, Text, Nat) -> async Result.Result<(), Text>;
            };

            try {
                let _ = await backup_canister.create_backup_snapshot(my_principal, canister_type, data_hash, data_size);
            } catch (_) {
                Debug.print("Backup failed");
            };
        };

        // Get configuration
        public func get_config() : CanisterConfig {
            config;
        };
    };
};
