#!/bin/bash

echo "Setting up ICP Calendar canisters after deployment..."

# Get canister IDs
CALENDAR_CANISTER_ID=$(dfx canister id calendar_canister_1)
USER_REGISTRY_ID=$(dfx canister id user_registry)

echo "Calendar Canister ID: $CALENDAR_CANISTER_ID"
echo "User Registry ID: $USER_REGISTRY_ID"

# Set up the calendar canister connection in UserRegistry
echo "Configuring UserRegistry to connect to CalendarCanister..."
dfx canister call user_registry set_calendar_canister_id "(principal \"$CALENDAR_CANISTER_ID\")"

if [ $? -eq 0 ]; then
    echo "✅ Calendar canister connection configured successfully!"
else
    echo "❌ Failed to configure calendar canister connection"
    exit 1
fi

echo "🎉 Setup completed! Your ICP Calendar is ready to use."
echo "Frontend URL: http://$(dfx canister id frontend).localhost:8000/"
