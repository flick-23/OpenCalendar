import Debug "mo:base/Debug";

actor TestRunner {

    // Run all tests by calling individual test canisters
    public func run_all_tests() : async () {
        Debug.print("🚀 Starting Full Test Suite...");
        Debug.print("=====================================");
        Debug.print("");

        Debug.print("🧪 Unit Tests:");
        Debug.print("- SecurityBase Tests: Available as separate canister");
        Debug.print("- Calendar Tests: Available as separate canister");
        Debug.print("- LoadBalancer Tests: Available as separate canister");
        Debug.print("");

        Debug.print("🔗 Integration Tests:");
        Debug.print("- Integration Tests: Available as separate canister");
        Debug.print("");

        Debug.print("✅ Test Runner Setup Complete!");
        Debug.print("🔧 Deploy individual test canisters and call their run_all_tests() methods");
        Debug.print("=====================================");
    };

    public func get_test_info() : async {
        test_canisters : [Text];
        instructions : Text;
    } {
        {
            test_canisters = [
                "security_base_tests",
                "calendar_secure_tests",
                "loadbalancer_tests",
                "integration_tests",
            ];
            instructions = "Deploy each test canister and call: dfx canister call <test_canister> run_all_tests";
        };
    };
};
