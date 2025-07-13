import Principal "mo:base/Principal";
import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Iter "mo:base/Iter";

actor LoadBalancer {

    // Canister health tracking
    public type CanisterHealth = {
        canister_id : Principal;
        last_response_time : Int;
        error_count : Nat;
        load_score : Nat; // 0-100, higher = more loaded
        status : Text; // "healthy", "degraded", "unhealthy"
        request_count : Nat;
        last_checked : Int;
    };

    public type LoadBalancingStrategy = {
        #RoundRobin;
        #LeastConnections;
        #WeightedRandom;
        #ResponseTime;
    };

    // Stable storage
    stable var healthEntries : [(Principal, CanisterHealth)] = [];
    stable var roundRobinCounters : [(Text, Nat)] = []; // canister_type -> counter

    // Runtime storage
    private var canister_health = HashMap.fromIter<Principal, CanisterHealth>(
        healthEntries.vals(),
        healthEntries.size(),
        Principal.equal,
        Principal.hash,
    );

    private var rr_counters = HashMap.fromIter<Text, Nat>(
        roundRobinCounters.vals(),
        roundRobinCounters.size(),
        Text.equal,
        Text.hash,
    );

    // Configuration
    private let REGISTRY_CANISTER = Principal.fromText("rdmx6-jaaaa-aaaah-qdrqq-cai"); // Replace with actual registry
    private let DEFAULT_GROUP_ID = "icp-calendar-main";

    // Get best canister for a request type using specified strategy
    public shared func get_best_canister(canister_type : Text, strategy : ?LoadBalancingStrategy) : async Result.Result<Principal, Text> {
        let available_canisters = await get_healthy_canisters_by_type(canister_type);

        switch (available_canisters.size()) {
            case 0 {
                #err("No healthy canisters available for type: " # canister_type);
            };
            case _ {
                let selected_strategy = switch (strategy) {
                    case (?s) s;
                    case null #RoundRobin;
                };

                let selected = switch (selected_strategy) {
                    case (#RoundRobin) {
                        select_round_robin(canister_type, available_canisters);
                    };
                    case (#LeastConnections) {
                        select_least_connections(available_canisters);
                    };
                    case (#WeightedRandom) {
                        select_weighted_random(available_canisters);
                    };
                    case (#ResponseTime) {
                        select_fastest_response(available_canisters);
                    };
                };

                #ok(selected.canister_id);
            };
        };
    };

    // Round robin selection
    private func select_round_robin(canister_type : Text, canisters : [CanisterHealth]) : CanisterHealth {
        let current_counter = switch (rr_counters.get(canister_type)) {
            case (?counter) counter;
            case null 0;
        };

        let next_counter = (current_counter + 1) % canisters.size();
        rr_counters.put(canister_type, next_counter);

        canisters[current_counter];
    };

    // Least connections selection
    private func select_least_connections(canisters : [CanisterHealth]) : CanisterHealth {
        var best = canisters[0];
        for (canister in canisters.vals()) {
            if (canister.request_count < best.request_count) {
                best := canister;
            };
        };
        best;
    };

    // Weighted random selection (inverse of load score)
    private func select_weighted_random(canisters : [CanisterHealth]) : CanisterHealth {
        // Simple implementation - select canister with lowest load score
        var best = canisters[0];
        for (canister in canisters.vals()) {
            if (canister.load_score < best.load_score) {
                best := canister;
            };
        };
        best;
    };

    // Fastest response time selection
    private func select_fastest_response(canisters : [CanisterHealth]) : CanisterHealth {
        var best = canisters[0];
        for (canister in canisters.vals()) {
            if (canister.last_response_time < best.last_response_time) {
                best := canister;
            };
        };
        best;
    };

    // Get healthy canisters from registry
    private func get_healthy_canisters_by_type(canister_type : Text) : async [CanisterHealth] {
        let registry = actor (Principal.toText(REGISTRY_CANISTER)) : actor {
            get_canisters_by_type : query (Text, Text) -> async [{
                id : Principal;
                status : Text;
            }];
        };

        try {
            let registry_canisters = await registry.get_canisters_by_type(canister_type, DEFAULT_GROUP_ID);

            let health_array = Array.mapFilter<{ id : Principal; status : Text }, CanisterHealth>(
                registry_canisters,
                func(c) {
                    if (c.status == "active") {
                        switch (canister_health.get(c.id)) {
                            case (?health) {
                                if (health.status == "healthy") {
                                    ?health;
                                } else {
                                    null;
                                };
                            };
                            case null {
                                // Create default health entry for new canister
                                let default_health = {
                                    canister_id = c.id;
                                    last_response_time = 0;
                                    error_count = 0;
                                    load_score = 50; // Default moderate load
                                    status = "healthy";
                                    request_count = 0;
                                    last_checked = Time.now();
                                };
                                canister_health.put(c.id, default_health);
                                ?default_health;
                            };
                        };
                    } else {
                        null;
                    };
                },
            );

            health_array;
        } catch (_) { [] };
    };

    // Health check canisters
    public shared func health_check_canister(canister_id : Principal) : async Bool {
        let start_time = Time.now();

        // Try to call the canister's status function
        try {
            let canister = actor (Principal.toText(canister_id)) : actor {
                get_stats : query () -> async { totalEvents : Nat };
            };

            let _ = await canister.get_stats();
            let response_time = Time.now() - start_time;

            // Update health info
            let current_health = switch (canister_health.get(canister_id)) {
                case (?h) h;
                case null {
                    {
                        canister_id = canister_id;
                        last_response_time = 0;
                        error_count = 0;
                        load_score = 50;
                        status = "healthy";
                        request_count = 0;
                        last_checked = Time.now();
                    };
                };
            };

            let health : CanisterHealth = {
                current_health with
                last_response_time = Int.abs(response_time);
                error_count = 0;
                load_score = calculate_load_score(response_time);
                status = "healthy";
                last_checked = Time.now();
            };

            canister_health.put(canister_id, health);
            true

        } catch (_) {
            // Mark as unhealthy
            let current_health = switch (canister_health.get(canister_id)) {
                case (?h) h;
                case null {
                    {
                        canister_id = canister_id;
                        last_response_time = 0;
                        error_count = 0;
                        load_score = 50;
                        status = "healthy";
                        request_count = 0;
                        last_checked = Time.now();
                    };
                };
            };

            let health : CanisterHealth = {
                current_health with
                error_count = current_health.error_count + 1;
                load_score = 100;
                status = if (current_health.error_count >= 3) "unhealthy" else "degraded";
                last_checked = Time.now();
            };

            canister_health.put(canister_id, health);
            false;
        };
    };

    // Calculate load score based on response time
    private func calculate_load_score(response_time : Int) : Nat {
        // Convert nanoseconds to milliseconds and cap at 100
        let score = Int.abs(response_time) / 1_000_000;
        if (score > 100) { 100 } else { Int.abs(score) };
    };

    // Report request completion to update load metrics
    public shared func report_request_completion(canister_id : Principal, response_time : Int, success : Bool) : async () {
        switch (canister_health.get(canister_id)) {
            case (?health) {
                let updated_health = if (success) {
                    {
                        health with
                        last_response_time = Int.abs(response_time);
                        load_score = calculate_load_score(response_time);
                        request_count = health.request_count + 1;
                        error_count = if (health.error_count > 0) {
                            Int.abs(Int.sub(health.error_count, 1));
                        } else {
                            0;
                        };
                        status = "healthy";
                        last_checked = Time.now();
                    };
                } else {
                    {
                        health with
                        error_count = health.error_count + 1;
                        request_count = health.request_count + 1;
                        status = if (health.error_count >= 3) "unhealthy" else "degraded";
                        last_checked = Time.now();
                    };
                };

                canister_health.put(canister_id, updated_health);
            };
            case null {
                // Create new health entry
                let new_health = {
                    canister_id = canister_id;
                    last_response_time = if (success) Int.abs(response_time) else 0;
                    error_count = if (success) 0 else 1;
                    load_score = if (success) calculate_load_score(response_time) else 100;
                    status = if (success) "healthy" else "degraded";
                    request_count = 1;
                    last_checked = Time.now();
                };

                canister_health.put(canister_id, new_health);
            };
        };
    };

    // Get load balancer statistics
    public shared query func get_load_balancer_stats() : async {
        total_canisters : Nat;
        healthy_canisters : Nat;
        degraded_canisters : Nat;
        unhealthy_canisters : Nat;
        total_requests : Nat;
    } {
        let all_health = Array.map<(Principal, CanisterHealth), CanisterHealth>(
            Iter.toArray(canister_health.entries()),
            func(entry) = entry.1,
        );

        var healthy = 0;
        var degraded = 0;
        var unhealthy = 0;
        var total_requests = 0;

        for (health in all_health.vals()) {
            switch (health.status) {
                case ("healthy") { healthy += 1 };
                case ("degraded") { degraded += 1 };
                case ("unhealthy") { unhealthy += 1 };
                case (_) {};
            };
            total_requests += health.request_count;
        };

        {
            total_canisters = all_health.size();
            healthy_canisters = healthy;
            degraded_canisters = degraded;
            unhealthy_canisters = unhealthy;
            total_requests = total_requests;
        };
    };

    // System upgrade handlers
    system func preupgrade() {
        healthEntries := Iter.toArray(canister_health.entries());
        roundRobinCounters := Iter.toArray(rr_counters.entries());
    };

    system func postupgrade() {
        healthEntries := [];
        roundRobinCounters := [];
    };
};
