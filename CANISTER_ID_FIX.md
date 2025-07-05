# Fixing Canister ID Issues in OpenCalendar

## Problem

The error "Canister ID is required, but received undefined instead" typically occurs when the frontend application cannot find the canister IDs needed to connect to the backend canisters.

## Solution

### 1. Ensure Environment Variables are Set

The frontend needs environment variables to be set properly. Create/update `src/frontend/.env` file:

```env
VITE_CANISTER_ID_CALENDAR_CANISTER_1=uxrrr-q7777-77774-qaaaq-cai
VITE_CANISTER_ID_USER_REGISTRY=ulvla-h7777-77774-qaacq-cai
VITE_CANISTER_ID_NOTIFICATION_CANISTER=uzt4z-lp777-77774-qaabq-cai
VITE_CANISTER_ID_SCHEDULING_CANISTER=umunu-kh777-77774-qaaca-cai
VITE_CANISTER_ID_FRONTEND=u6s2n-gx777-77774-qaaba-cai
VITE_CANISTER_ID_INTERNET_IDENTITY=ufxgi-4p777-77774-qaadq-cai
VITE_DFX_NETWORK=local
```

### 2. Configure Vite to Handle Process Environment Variables

The `vite.config.ts` file needs to define `process.env` variables for compatibility with dfx-generated code:

```typescript
export default defineConfig({
  plugins: [sveltekit()],
  define: {
    "process.env.CANISTER_ID_CALENDAR_CANISTER_1": JSON.stringify(
      process.env.VITE_CANISTER_ID_CALENDAR_CANISTER_1 || "fallback-id"
    ),
    "process.env.CANISTER_ID_USER_REGISTRY": JSON.stringify(
      process.env.VITE_CANISTER_ID_USER_REGISTRY || "fallback-id"
    ),
    // ... other canister IDs
  },
});
```

### 3. Add Fallback Logic in Actor Creation

The actor creation functions should have fallback logic:

```typescript
export const getUserRegistryActor = async (identity?: Identity | null) => {
  const canisterId =
    userRegistryCanisterId ||
    process.env.CANISTER_ID_USER_REGISTRY ||
    "fallback-id";

  if (!canisterId) {
    throw new Error("User Registry Canister ID not found");
  }

  return createActor<UserRegistryService>(
    canisterId,
    userRegistryIdlFactory,
    identity
  );
};
```

### 4. Deployment Steps

1. Start dfx replica: `dfx start --clean --background`
2. Deploy canisters: `dfx deploy`
3. Get canister IDs: `dfx canister id --all`
4. Update .env file with actual canister IDs
5. Start development server: `npm run dev`

### 5. Troubleshooting

- Check if dfx is running: `dfx ping`
- Verify canister IDs: `cat .dfx/local/canister_ids.json`
- Check environment variables in browser console
- Restart development server after changing .env file

## Files Modified

- `src/frontend/.env` - Environment variables
- `src/frontend/vite.config.ts` - Vite configuration
- `src/frontend/src/lib/actors/actors.ts` - Actor creation with fallbacks
- `src/frontend/src/lib/components/CanisterTest.svelte` - Test component
- `src/frontend/src/routes/+page.svelte` - Main page with test

## Testing

The application now includes a test component that verifies canister connectivity and shows environment variable values. Visit the main page to see the connection status.
