import SecurityBase "../../src/backend/common/SecurityBase";
import TestUtils "../TestUtils";
import Debug "mo:base/Debug";
import Text "mo:base/Text";

actor SecurityBaseTests {

    let test_utils = TestUtils;

    // Helper to create test config
    private func create_test_config() : SecurityBase.CanisterConfig {
        {
            registry_canister = test_utils.mock_principal(999);
            group_id = "test-group";
            access_key = "test-key";
            canister_type = "calendar";
            shard_key = null;
        };
    };

    // Test SecureCanister instantiation
    public func test_secure_canister_creation() : async TestUtils.TestResult {
        let config = create_test_config();
        let secure_canister = SecurityBase.SecureCanister(config);
        let retrieved_config = secure_canister.get_config();

        test_utils.assert_eq<Text>(config.group_id, retrieved_config.group_id, Text.equal);
    };

    // Test config retrieval
    public func test_get_config() : async TestUtils.TestResult {
        let config = create_test_config();
        let secure_canister = SecurityBase.SecureCanister(config);
        let retrieved_config = secure_canister.get_config();

        let group_id_match = test_utils.assert_eq<Text>(config.group_id, retrieved_config.group_id, Text.equal);
        let access_key_match = test_utils.assert_eq<Text>(config.access_key, retrieved_config.access_key, Text.equal);
        let canister_type_match = test_utils.assert_eq<Text>(config.canister_type, retrieved_config.canister_type, Text.equal);

        switch (group_id_match, access_key_match, canister_type_match) {
            case (#pass, #pass, #pass) #pass;
            case _ #fail("Config values don't match");
        };
    };

    // Run all tests
    public func run_all_tests() : async () {
        Debug.print("Running SecurityBase Tests...");

        let tests = [
            test_utils.run_test(
                "secure_canister_creation",
                func() : TestUtils.TestResult {
                    let config = create_test_config();
                    let secure_canister = SecurityBase.SecureCanister(config);
                    let retrieved_config = secure_canister.get_config();
                    test_utils.assert_eq<Text>(config.group_id, retrieved_config.group_id, Text.equal);
                },
            ),

            test_utils.run_test(
                "get_config",
                func() : TestUtils.TestResult {
                    let config = create_test_config();
                    let secure_canister = SecurityBase.SecureCanister(config);
                    let retrieved_config = secure_canister.get_config();

                    if (
                        config.group_id == retrieved_config.group_id and
                        config.access_key == retrieved_config.access_key and
                        config.canister_type == retrieved_config.canister_type
                    ) {
                        #pass;
                    } else {
                        #fail("Config values don't match");
                    };
                },
            ),
        ];

        let suite = test_utils.create_suite("SecurityBase", tests);
        test_utils.print_suite_results(suite);
    };
};
