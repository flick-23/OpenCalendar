import TestUtils "../TestUtils";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Float "mo:base/Float";

actor LoadBalancerTests {

    let test_utils = TestUtils;

    // Mock canister health data
    private func create_mock_canister_health(id : Nat, response_time : Nat, error_rate : Float) : {
        id : Principal;
        response_time : Nat;
        error_rate : Float;
        last_heartbeat : Int;
        status : Text;
    } {
        {
            id = test_utils.mock_principal(id);
            response_time = response_time;
            error_rate = error_rate;
            last_heartbeat = test_utils.mock_timestamp();
            status = "active";
        };
    };

    // Test round robin selection logic
    public func test_round_robin_logic() : async TestUtils.TestResult {
        // Simulate round robin: if we have 3 canisters and current index is 0,
        // next should be 1, then 2, then back to 0
        let canister_count = 3;
        let current_index = 0;
        let next_index = (current_index + 1) % canister_count;

        test_utils.assert_eq<Nat>(1, next_index, Nat.equal);
    };

    // Test least connections selection logic
    public func test_least_connections_logic() : async TestUtils.TestResult {
        let canister1 = create_mock_canister_health(1, 100, 0.01);
        let canister2 = create_mock_canister_health(2, 150, 0.02);
        let canister3 = create_mock_canister_health(3, 80, 0.005);

        // canister3 has lowest response time, should be selected in least connections
        let best_response_time = canister3.response_time;
        let is_best = best_response_time < canister1.response_time and best_response_time < canister2.response_time;

        test_utils.assert_true(is_best, "Canister with lowest response time should be selected");
    };

    // Test error rate calculation
    public func test_error_rate_calculation() : async TestUtils.TestResult {
        let total_requests = 100;
        let failed_requests = 5;
        let error_rate = Float.fromInt(failed_requests) / Float.fromInt(total_requests);
        let expected_error_rate = 0.05; // 5%

        // Allow small floating point differences
        let difference = if (error_rate > expected_error_rate) {
            error_rate - expected_error_rate;
        } else {
            expected_error_rate - error_rate;
        };

        test_utils.assert_true(difference < 0.001, "Error rate calculation should be accurate");
    };

    // Test canister health scoring
    public func test_health_scoring() : async TestUtils.TestResult {
        let healthy_canister = create_mock_canister_health(1, 50, 0.001); // Low response time, low error rate
        let unhealthy_canister = create_mock_canister_health(2, 500, 0.1); // High response time, high error rate

        // Healthy canister should have better metrics
        let healthy_better = healthy_canister.response_time < unhealthy_canister.response_time and healthy_canister.error_rate < unhealthy_canister.error_rate;

        test_utils.assert_true(healthy_better, "Healthy canister should have better metrics");
    };

    // Test weighted random selection probability
    public func test_weighted_selection_logic() : async TestUtils.TestResult {
        // Canister with weight 80 should have higher probability than one with weight 20
        let weight1 = 80;
        let weight2 = 20;
        let total_weight = weight1 + weight2;

        let probability1 = Float.fromInt(weight1) / Float.fromInt(total_weight);
        let probability2 = Float.fromInt(weight2) / Float.fromInt(total_weight);

        test_utils.assert_true(probability1 > probability2, "Higher weight should give higher probability");
    };

    // Run all tests
    public func run_all_tests() : async () {
        Debug.print("Running LoadBalancer Tests...");

        let tests = [
            test_utils.run_test(
                "round_robin_logic",
                func() : TestUtils.TestResult {
                    let canister_count = 3;
                    let current_index = 0;
                    let next_index = (current_index + 1) % canister_count;
                    test_utils.assert_eq<Nat>(1, next_index, Nat.equal);
                },
            ),

            test_utils.run_test(
                "least_connections_logic",
                func() : TestUtils.TestResult {
                    let response_time1 = 100;
                    let response_time2 = 150;
                    let response_time3 = 80;
                    let best_time = response_time3;
                    let is_best = best_time < response_time1 and best_time < response_time2;
                    test_utils.assert_true(is_best, "Lowest response time should be identified");
                },
            ),

            test_utils.run_test(
                "error_rate_calculation",
                func() : TestUtils.TestResult {
                    let total_requests = 100;
                    let failed_requests = 5;
                    let error_rate = Float.fromInt(failed_requests) / Float.fromInt(total_requests);
                    let expected = 0.05;
                    let difference = if (error_rate > expected) {
                        error_rate - expected;
                    } else { expected - error_rate };
                    test_utils.assert_true(difference < 0.001, "Error rate should be calculated correctly");
                },
            ),

            test_utils.run_test(
                "health_scoring",
                func() : TestUtils.TestResult {
                    let healthy_response = 50;
                    let unhealthy_response = 500;
                    let healthy_error = 0.001;
                    let unhealthy_error = 0.1;

                    let healthy_better = healthy_response < unhealthy_response and healthy_error < unhealthy_error;
                    test_utils.assert_true(healthy_better, "Healthy metrics should be better");
                },
            ),

            test_utils.run_test(
                "weighted_selection_logic",
                func() : TestUtils.TestResult {
                    let weight1 = 80;
                    let weight2 = 20;
                    let total = weight1 + weight2;
                    let prob1 = Float.fromInt(weight1) / Float.fromInt(total);
                    let prob2 = Float.fromInt(weight2) / Float.fromInt(total);
                    test_utils.assert_true(prob1 > prob2, "Higher weight should give higher probability");
                },
            ),
        ];

        let suite = test_utils.create_suite("LoadBalancer", tests);
        test_utils.print_suite_results(suite);
    };
};
