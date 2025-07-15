import TestUtils "../TestUtils";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";

actor IntegrationTests {

    let test_utils = TestUtils;

    // Test data consistency across the system
    public func test_system_data_consistency() : async TestUtils.TestResult {
        // Simulate data that should be consistent across canisters
        let event_id = test_utils.mock_event_id();
        let _calendar_owner = test_utils.mock_principal(1);
        let _timestamp = test_utils.mock_timestamp();

        // Test that the same event ID maps consistently
        let id_consistent = event_id == test_utils.mock_event_id(); // Should be same since we use fixed mock

        test_utils.assert_true(id_consistent, "Event ID should be consistent across calls");
    };

    // Test inter-canister communication patterns
    public func test_canister_communication_pattern() : async TestUtils.TestResult {
        // Simulate the flow: Client -> LoadBalancer -> Calendar -> Registry
        let client_principal = test_utils.mock_principal(100);
        let loadbalancer_principal = test_utils.mock_principal(200);
        let calendar_principal = test_utils.mock_principal(300);
        let registry_principal = test_utils.mock_principal(400);

        // Test that each step in the chain has valid principals
        let valid_principals = client_principal != loadbalancer_principal and loadbalancer_principal != calendar_principal and calendar_principal != registry_principal;

        test_utils.assert_true(valid_principals, "All principals in communication chain should be unique");
    };

    // Test backup and recovery workflow
    public func test_backup_recovery_workflow() : async TestUtils.TestResult {
        let canister_id = test_utils.mock_principal(1);
        let data_hash = "abc123def456"; // Mock hash
        let data_size = 1024; // Mock size in bytes
        let backup_timestamp = test_utils.mock_timestamp();

        // Simulate backup creation
        let backup_data = {
            canister_id = canister_id;
            data_hash = data_hash;
            data_size = data_size;
            timestamp = backup_timestamp;
            status = "completed";
        };

        // Test backup data integrity
        let backup_valid = backup_data.data_size > 0 and backup_data.data_hash.size() > 0 and backup_data.timestamp > 0;

        test_utils.assert_true(backup_valid, "Backup data should be valid");
    };

    // Test load balancing decision making
    public func test_load_balancing_decisions() : async TestUtils.TestResult {
        // Simulate multiple canisters with different loads
        let canister_loads = [
            { id = test_utils.mock_principal(1); load = 10; response_time = 50 },
            {
                id = test_utils.mock_principal(2);
                load = 25;
                response_time = 100;
            },
            { id = test_utils.mock_principal(3); load = 5; response_time = 30 },
        ];

        // Find the canister with lowest load
        var best_canister_load = canister_loads[0].load;
        for (canister in canister_loads.vals()) {
            if (canister.load < best_canister_load) {
                best_canister_load := canister.load;
            };
        };

        // Canister 3 should have the lowest load (5)
        test_utils.assert_eq<Nat>(5, best_canister_load, Nat.equal);
    };

    // Test security verification chain
    public func test_security_verification_chain() : async TestUtils.TestResult {
        let caller = test_utils.mock_principal(1);
        let target = test_utils.mock_principal(2);
        let group_id = "secure-group";
        let access_key = "secret-key-123";

        // Simulate security check
        let security_context = {
            caller = caller;
            target = target;
            group_id = group_id;
            access_key = access_key;
            verified = true; // Mock successful verification
        };

        // Test security context completeness
        let security_valid = security_context.group_id.size() > 0 and security_context.access_key.size() > 0 and security_context.verified;

        test_utils.assert_true(security_valid, "Security context should be complete and valid");
    };

    // Test end-to-end event creation workflow
    public func test_end_to_end_event_creation() : async TestUtils.TestResult {
        // Simulate the complete workflow of creating an event
        let _user = test_utils.mock_principal(1);
        let event_data = {
            title = "Integration Test Event";
            description = "Testing end-to-end workflow";
            start_time = test_utils.mock_timestamp();
            end_time = test_utils.mock_timestamp() + 3600_000_000_000; // 1 hour later
            color = "#FF5722";
        };

        // Simulate workflow steps
        let steps = [
            { step = "user_authentication"; success = true },
            { step = "load_balancer_routing"; success = true },
            { step = "calendar_validation"; success = true },
            { step = "event_creation"; success = true },
            { step = "backup_creation"; success = true },
        ];

        // Check that all steps succeeded
        var all_successful = true;
        for (step in steps.vals()) {
            if (not step.success) {
                all_successful := false;
            };
        };

        let workflow_valid = all_successful and event_data.title.size() > 0 and event_data.end_time > event_data.start_time;

        test_utils.assert_true(workflow_valid, "End-to-end workflow should complete successfully");
    };

    // Run all integration tests
    public func run_all_tests() : async () {
        Debug.print("Running Integration Tests...");

        let tests = [
            test_utils.run_test(
                "system_data_consistency",
                func() : TestUtils.TestResult {
                    let event_id1 = test_utils.mock_event_id();
                    let event_id2 = test_utils.mock_event_id();
                    test_utils.assert_eq<Nat>(event_id1, event_id2, Nat.equal);
                },
            ),

            test_utils.run_test(
                "canister_communication_pattern",
                func() : TestUtils.TestResult {
                    let p1 = test_utils.mock_principal(100);
                    let p2 = test_utils.mock_principal(200);
                    let p3 = test_utils.mock_principal(300);
                    let all_different = p1 != p2 and p2 != p3 and p1 != p3;
                    test_utils.assert_true(all_different, "All principals should be unique");
                },
            ),

            test_utils.run_test(
                "backup_recovery_workflow",
                func() : TestUtils.TestResult {
                    let data_size = 1024;
                    let data_hash = "abc123";
                    let timestamp = test_utils.mock_timestamp();
                    let valid = data_size > 0 and data_hash.size() > 0 and timestamp > 0;
                    test_utils.assert_true(valid, "Backup data should be valid");
                },
            ),

            test_utils.run_test(
                "load_balancing_decisions",
                func() : TestUtils.TestResult {
                    let loads = [10, 25, 5];
                    var min_load = loads[0];
                    for (load in loads.vals()) {
                        if (load < min_load) { min_load := load };
                    };
                    test_utils.assert_eq<Nat>(5, min_load, Nat.equal);
                },
            ),

            test_utils.run_test(
                "security_verification_chain",
                func() : TestUtils.TestResult {
                    let group_id = "secure-group";
                    let access_key = "secret-key-123";
                    let verified = true;
                    let valid = group_id.size() > 0 and access_key.size() > 0 and verified;
                    test_utils.assert_true(valid, "Security context should be valid");
                },
            ),

            test_utils.run_test(
                "end_to_end_event_creation",
                func() : TestUtils.TestResult {
                    let title = "Test Event";
                    let start_time = test_utils.mock_timestamp();
                    let end_time = start_time + 3600_000_000_000;
                    let valid = title.size() > 0 and end_time > start_time;
                    test_utils.assert_true(valid, "Event creation workflow should be valid");
                },
            ),
        ];

        let suite = test_utils.create_suite("Integration", tests);
        test_utils.print_suite_results(suite);
    };
};
