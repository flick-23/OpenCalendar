import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";

module TestUtils {

    // Test framework types
    public type TestResult = {
        #pass;
        #fail : Text;
    };

    public type TestCase = {
        name : Text;
        result : TestResult;
    };

    public type TestSuite = {
        name : Text;
        tests : [TestCase];
        passed : Nat;
        failed : Nat;
    };

    // Test utilities
    public func assert_eq<T>(expected : T, actual : T, equal : (T, T) -> Bool) : TestResult {
        if (equal(expected, actual)) {
            #pass;
        } else {
            #fail("Expected equality but values differ");
        };
    };

    public func assert_true(condition : Bool, message : Text) : TestResult {
        if (condition) {
            #pass;
        } else {
            #fail(message);
        };
    };

    public func assert_false(condition : Bool, message : Text) : TestResult {
        if (not condition) {
            #pass;
        } else {
            #fail(message);
        };
    };

    public func assert_not_null<T>(value : ?T, message : Text) : TestResult {
        switch (value) {
            case (null) #fail(message);
            case (?_) #pass;
        };
    };

    public func assert_null<T>(value : ?T, message : Text) : TestResult {
        switch (value) {
            case (null) #pass;
            case (?_) #fail(message);
        };
    };

    // Mock data generators
    public func mock_principal(id : Nat) : Principal {
        // Create unique principals by generating different byte arrays
        let baseBytes = Blob.fromArray([0x04, 0x30, 0x17, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F]);

        // Modify the last byte to create unique principals
        let modifiedByte = Nat8.fromNat(id % 256);
        let uniqueBytes = Array.tabulate<Nat8>(
            18,
            func(i : Nat) : Nat8 {
                if (i == 17) { modifiedByte } else {
                    Blob.toArray(baseBytes)[i];
                };
            },
        );

        Principal.fromBlob(Blob.fromArray(uniqueBytes));
    };

    public func mock_timestamp() : Int {
        Time.now();
    };

    public func mock_event_id() : Nat {
        123;
    };

    public func mock_calendar_id() : Nat {
        456;
    };

    // Test runner utilities
    public func run_test(name : Text, test_func : () -> TestResult) : TestCase {
        let result = test_func();
        {
            name = name;
            result = result;
        };
    };

    public func create_suite(name : Text, tests : [TestCase]) : TestSuite {
        var passed = 0;
        var failed = 0;

        for (test in tests.vals()) {
            switch (test.result) {
                case (#pass) passed += 1;
                case (#fail(_)) failed += 1;
            };
        };

        {
            name = name;
            tests = tests;
            passed = passed;
            failed = failed;
        };
    };

    public func print_suite_results(suite : TestSuite) {
        Debug.print("=== Test Suite: " # suite.name # " ===");
        Debug.print("Passed: " # Nat.toText(suite.passed) # ", Failed: " # Nat.toText(suite.failed));

        for (test in suite.tests.vals()) {
            switch (test.result) {
                case (#pass) {
                    Debug.print("✅ " # test.name);
                };
                case (#fail(msg)) {
                    Debug.print("❌ " # test.name # " - " # msg);
                };
            };
        };
        Debug.print("");
    };
};
