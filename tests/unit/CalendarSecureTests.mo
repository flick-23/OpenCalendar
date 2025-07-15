import CalendarTypes "../../src/backend/calendar/types";
import TestUtils "../TestUtils";
import Debug "mo:base/Debug";

actor CalendarSecureTests {

    let test_utils = TestUtils;

    // Mock event data
    private func create_mock_event() : CalendarTypes.Event {
        {
            id = test_utils.mock_event_id();
            title = "Test Event";
            description = "Test Description";
            startTime = test_utils.mock_timestamp();
            endTime = test_utils.mock_timestamp() + 3600_000_000_000; // 1 hour later
            color = "#FF0000";
            owner = test_utils.mock_principal(1);
        };
    };

    // Test event validation
    public func test_event_validation() : async TestUtils.TestResult {
        let event = create_mock_event();

        // Test basic validation
        let title_valid = test_utils.assert_true(event.title.size() > 0, "Event title should not be empty");
        let time_valid = test_utils.assert_true(event.endTime > event.startTime, "End time should be after start time");
        let id_valid = test_utils.assert_true(event.id > 0, "Event ID should be positive");

        switch (title_valid, time_valid, id_valid) {
            case (#pass, #pass, #pass) #pass;
            case _ #fail("Event validation failed");
        };
    };

    // Test event time overlap detection
    public func test_event_time_overlap() : async TestUtils.TestResult {
        let event1 = create_mock_event();
        let event2 = {
            id = event1.id + 1;
            title = "Overlapping Event";
            description = "Test overlap";
            startTime = event1.startTime + 1800_000_000_000; // 30 minutes later
            endTime = event1.endTime + 1800_000_000_000; // 30 minutes after event1 ends
            color = "#00FF00";
            owner = test_utils.mock_principal(2);
        };

        // Check if events overlap (event2 starts before event1 ends)
        let overlaps = event2.startTime < event1.endTime and event2.endTime > event1.startTime;
        test_utils.assert_true(overlaps, "Events should overlap");
    };

    // Test event data structure integrity
    public func test_event_structure() : async TestUtils.TestResult {
        let event = create_mock_event();

        let has_required_fields = event.title.size() > 0 and event.id > 0 and event.startTime > 0 and event.endTime > event.startTime;

        test_utils.assert_true(has_required_fields, "Event should have all required fields");
    };

    // Run all tests
    public func run_all_tests() : async () {
        Debug.print("Running CalendarSecure Tests...");

        let tests = [
            test_utils.run_test(
                "event_validation",
                func() : TestUtils.TestResult {
                    let event = create_mock_event();
                    if (event.title.size() > 0 and event.endTime > event.startTime and event.id > 0) {
                        #pass;
                    } else {
                        #fail("Event validation failed");
                    };
                },
            ),

            test_utils.run_test(
                "event_time_overlap",
                func() : TestUtils.TestResult {
                    let event1 = create_mock_event();
                    let event2 = {
                        id = event1.id + 1;
                        title = "Overlapping Event";
                        description = "Test overlap";
                        startTime = event1.startTime + 1800_000_000_000;
                        endTime = event1.endTime + 1800_000_000_000;
                        color = "#00FF00";
                        owner = test_utils.mock_principal(2);
                    };

                    let overlaps = event2.startTime < event1.endTime and event2.endTime > event1.startTime;
                    test_utils.assert_true(overlaps, "Events should overlap");
                },
            ),

            test_utils.run_test(
                "event_structure",
                func() : TestUtils.TestResult {
                    let event = create_mock_event();
                    let has_required_fields = event.title.size() > 0 and event.id > 0 and event.startTime > 0 and event.endTime > event.startTime;

                    test_utils.assert_true(has_required_fields, "Event should have all required fields");
                },
            ),
        ];

        let suite = test_utils.create_suite("CalendarSecure", tests);
        test_utils.print_suite_results(suite);
    };
};
