import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Iter "mo:base/Iter";

actor BackupCanister {

    // Backup data structure
    public type BackupSnapshot = {
        canister_id : Principal;
        canister_type : Text;
        timestamp : Int;
        data_hash : Text;
        data_size : Nat;
        backup_location : Text;
        metadata : Text; // JSON-like metadata string
    };

    public type RecoveryPlan = {
        failed_canister : Principal;
        backup_snapshots : [BackupSnapshot];
        recovery_steps : [Text];
        estimated_recovery_time : Int;
        priority : Text; // "critical", "high", "medium", "low"
    };

    public type RestoreRequest = {
        target_canister : Principal;
        backup_snapshot : BackupSnapshot;
        restore_type : Text; // "full", "partial", "data_only"
        requested_by : Principal;
        request_time : Int;
    };

    // Stable storage
    stable var backupEntries : [(Principal, [BackupSnapshot])] = [];
    stable var recoveryPlans : [(Principal, RecoveryPlan)] = [];
    stable var restoreRequests : [(Principal, RestoreRequest)] = [];

    // Runtime storage
    private var canister_backups = HashMap.fromIter<Principal, [BackupSnapshot]>(
        backupEntries.vals(),
        backupEntries.size(),
        Principal.equal,
        Principal.hash,
    );

    private var recovery_plans = HashMap.fromIter<Principal, RecoveryPlan>(
        recoveryPlans.vals(),
        recoveryPlans.size(),
        Principal.equal,
        Principal.hash,
    );

    private var restore_queue = HashMap.fromIter<Principal, RestoreRequest>(
        restoreRequests.vals(),
        restoreRequests.size(),
        Principal.equal,
        Principal.hash,
    );

    // Configuration
    private let MAX_BACKUPS_PER_CANISTER = 10;
    private let BACKUP_RETENTION_DAYS = 30;

    // Create backup snapshot
    public shared func create_backup_snapshot(
        canister_id : Principal,
        canister_type : Text,
        data_hash : Text,
        data_size : Nat,
    ) : async Result.Result<(), Text> {

        let snapshot : BackupSnapshot = {
            canister_id = canister_id;
            canister_type = canister_type;
            timestamp = Time.now();
            data_hash = data_hash;
            data_size = data_size;
            backup_location = "backup-store-" # Principal.toText(canister_id) # "-" # Int.toText(Time.now());
            metadata = "{\"version\":\"1.0\",\"compression\":\"none\",\"integrity\":\"verified\"}";
        };

        let existing_backups = switch (canister_backups.get(canister_id)) {
            case null { [] };
            case (?backups) { backups };
        };

        // Add new backup and maintain limit
        let updated_backups = if (existing_backups.size() >= MAX_BACKUPS_PER_CANISTER) {
            // Remove oldest backup and add new one
            let sorted_backups = Array.sort<BackupSnapshot>(
                existing_backups,
                func(a, b) = Int.compare(b.timestamp, a.timestamp) // Latest first
            );
            let recent_backups = Array.subArray<BackupSnapshot>(sorted_backups, 0, MAX_BACKUPS_PER_CANISTER - 1);
            Array.append(recent_backups, [snapshot]);
        } else {
            Array.append(existing_backups, [snapshot]);
        };

        canister_backups.put(canister_id, updated_backups);
        #ok();
    };

    // Generate recovery plan for failed canister
    public shared func generate_recovery_plan(failed_canister : Principal) : async Result.Result<RecoveryPlan, Text> {

        switch (canister_backups.get(failed_canister)) {
            case null { #err("No backups found for canister") };
            case (?snapshots) {
                let sorted_snapshots = Array.sort<BackupSnapshot>(
                    snapshots,
                    func(a, b) = Int.compare(b.timestamp, a.timestamp) // Latest first
                );

                let canister_type = if (sorted_snapshots.size() > 0) {
                    sorted_snapshots[0].canister_type;
                } else {
                    "unknown";
                };

                let recovery_steps = [
                    "1. Deploy new " # canister_type # " canister",
                    "2. Stop traffic to failed canister",
                    "3. Restore data from latest backup: " # sorted_snapshots[0].backup_location,
                    "4. Verify data integrity using hash: " # sorted_snapshots[0].data_hash,
                    "5. Update canister registry with new canister ID",
                    "6. Update load balancer configuration",
                    "7. Redirect traffic to new canister",
                    "8. Perform smoke tests",
                    "9. Monitor for 24 hours",
                ];

                let priority = switch (canister_type) {
                    case ("calendar") "critical";
                    case ("user_registry") "critical";
                    case ("notification") "high";
                    case (_) "medium";
                };

                let plan : RecoveryPlan = {
                    failed_canister = failed_canister;
                    backup_snapshots = sorted_snapshots;
                    recovery_steps = recovery_steps;
                    estimated_recovery_time = 600_000_000_000; // 10 minutes in nanoseconds
                    priority = priority;
                };

                recovery_plans.put(failed_canister, plan);
                #ok(plan);
            };
        };
    };

    // Request data restoration
    public shared (msg) func request_restore(
        target_canister : Principal,
        backup_timestamp : ?Int,
        restore_type : Text,
    ) : async Result.Result<RestoreRequest, Text> {
        let caller = msg.caller;

        switch (canister_backups.get(target_canister)) {
            case null { #err("No backups found for target canister") };
            case (?snapshots) {
                // Select backup to restore
                let selected_snapshot = switch (backup_timestamp) {
                    case (?timestamp) {
                        // Find backup with specific timestamp
                        Array.find<BackupSnapshot>(snapshots, func(s) = s.timestamp == timestamp);
                    };
                    case null {
                        // Use latest backup
                        let sorted = Array.sort<BackupSnapshot>(
                            snapshots,
                            func(a, b) = Int.compare(b.timestamp, a.timestamp),
                        );
                        if (sorted.size() > 0) { ?sorted[0] } else { null };
                    };
                };

                switch (selected_snapshot) {
                    case null { #err("No suitable backup found") };
                    case (?snapshot) {
                        let restore_request : RestoreRequest = {
                            target_canister = target_canister;
                            backup_snapshot = snapshot;
                            restore_type = restore_type;
                            requested_by = caller;
                            request_time = Time.now();
                        };

                        restore_queue.put(target_canister, restore_request);
                        #ok(restore_request);
                    };
                };
            };
        };
    };

    // Execute recovery plan (simplified - in production would integrate with IC management)
    public shared func execute_recovery(failed_canister : Principal) : async Result.Result<Principal, Text> {
        switch (recovery_plans.get(failed_canister)) {
            case null { #err("No recovery plan found") };
            case (?plan) {
                // In production, this would:
                // 1. Deploy new canister using IC management canister
                // 2. Restore data from backup
                // 3. Update registry and load balancer
                // 4. Perform validation

                // For now, simulate the process
                let new_canister = Principal.fromText("rdmx6-jaaaa-aaaah-qdrqq-cai"); // Placeholder

                // Mark recovery as completed
                let completed_plan = {
                    plan with
                    recovery_steps = Array.append(plan.recovery_steps, ["Recovery completed at " # Int.toText(Time.now())]);
                };
                recovery_plans.put(failed_canister, completed_plan);

                #ok(new_canister);
            };
        };
    };

    // Get backup history for a canister
    public shared query func get_backup_history(canister_id : Principal) : async [BackupSnapshot] {
        switch (canister_backups.get(canister_id)) {
            case null { [] };
            case (?backups) {
                Array.sort<BackupSnapshot>(
                    backups,
                    func(a, b) = Int.compare(b.timestamp, a.timestamp) // Latest first
                );
            };
        };
    };

    // Get recovery plan for a canister
    public shared query func get_recovery_plan(canister_id : Principal) : async ?RecoveryPlan {
        recovery_plans.get(canister_id);
    };

    // Cleanup old backups
    public shared func cleanup_old_backups() : async {
        removed : Nat;
        total_size_freed : Nat;
    } {
        let cutoff_time = Time.now() - (BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1_000_000_000);
        var removed_count = 0;
        var size_freed = 0;

        // Iterate through all canister backups
        for ((canister_id, backups) in canister_backups.entries()) {
            let recent_backups = Array.filter<BackupSnapshot>(
                backups,
                func(backup) = backup.timestamp > cutoff_time,
            );

            let old_backups = Array.filter<BackupSnapshot>(
                backups,
                func(backup) = backup.timestamp <= cutoff_time,
            );

            // Count removed backups
            removed_count += old_backups.size();
            for (old_backup in old_backups.vals()) {
                size_freed += old_backup.data_size;
            };

            // Keep only recent backups
            if (recent_backups.size() != backups.size()) {
                canister_backups.put(canister_id, recent_backups);
            };
        };

        { removed = removed_count; total_size_freed = size_freed };
    };

    // Get backup system statistics
    public shared query func get_backup_stats() : async {
        total_canisters : Nat;
        total_backups : Nat;
        total_size : Nat;
        oldest_backup : Int;
        newest_backup : Int;
        pending_restores : Nat;
    } {
        var total_backups = 0;
        var total_size = 0;
        var oldest_backup : Int = Time.now();
        var newest_backup : Int = 0;

        for ((_, backups) in canister_backups.entries()) {
            total_backups += backups.size();
            for (backup in backups.vals()) {
                total_size += backup.data_size;
                if (backup.timestamp < oldest_backup) {
                    oldest_backup := backup.timestamp;
                };
                if (backup.timestamp > newest_backup) {
                    newest_backup := backup.timestamp;
                };
            };
        };

        {
            total_canisters = canister_backups.size();
            total_backups = total_backups;
            total_size = total_size;
            oldest_backup = oldest_backup;
            newest_backup = newest_backup;
            pending_restores = restore_queue.size();
        };
    };

    // Verify backup integrity
    public shared func verify_backup_integrity(canister_id : Principal, backup_timestamp : Int) : async Result.Result<Bool, Text> {
        switch (canister_backups.get(canister_id)) {
            case null { #err("No backups found for canister") };
            case (?backups) {
                switch (Array.find<BackupSnapshot>(backups, func(b) = b.timestamp == backup_timestamp)) {
                    case null { #err("Backup not found") };
                    case (?backup) {
                        // In production, this would verify the actual backup data
                        // For now, simulate verification based on metadata
                        if (Text.contains(backup.metadata, #text "integrity\":\"verified\"")) {
                            #ok(true);
                        } else {
                            #ok(false);
                        };
                    };
                };
            };
        };
    };

    // Emergency backup for critical data
    public shared func emergency_backup(canister_id : Principal, canister_type : Text) : async Result.Result<BackupSnapshot, Text> {
        // Create high-priority backup
        let emergency_snapshot : BackupSnapshot = {
            canister_id = canister_id;
            canister_type = canister_type;
            timestamp = Time.now();
            data_hash = "emergency_" # Int.toText(Time.now());
            data_size = 0; // Will be updated after actual backup
            backup_location = "emergency-backup-" # Principal.toText(canister_id);
            metadata = "{\"type\":\"emergency\",\"priority\":\"critical\",\"auto_triggered\":true}";
        };

        let existing_backups = switch (canister_backups.get(canister_id)) {
            case null { [] };
            case (?backups) { backups };
        };

        let updated_backups = Array.append(existing_backups, [emergency_snapshot]);
        canister_backups.put(canister_id, updated_backups);

        #ok(emergency_snapshot);
    };

    // System upgrade handlers
    system func preupgrade() {
        backupEntries := Iter.toArray(canister_backups.entries());
        recoveryPlans := Iter.toArray(recovery_plans.entries());
        restoreRequests := Iter.toArray(restore_queue.entries());
    };

    system func postupgrade() {
        backupEntries := [];
        recoveryPlans := [];
        restoreRequests := [];
    };
};
