#!/bin/bash

# Setup script to configure inter-canister connections
echo "Setting up inter-canister connections..."

# Get the calendar canister ID
CALENDAR_CANISTER_ID=$(dfx canister id calendar_canister_1)
echo "Calendar Canister ID: $CALENDAR_CANISTER_ID"

# Configure the calendar canister in UserRegistry
echo "Configuring UserRegistry with calendar canister ID..."
dfx canister call user_registry set_calendar_canister_id "(principal \"$CALENDAR_CANISTER_ID\")"

echo "Setup completed successfully!"
echo ""
echo "You can now:"
echo "1. Register users with: dfx canister call user_registry register '(\"username\")'"
echo "2. Create calendars with: dfx canister call user_registry create_calendar '(\"Calendar Name\", \"#FF5733\")'"
echo "3. Use the frontend at: http://u6s2n-gx777-77774-qaaba-cai.localhost:8000/"
