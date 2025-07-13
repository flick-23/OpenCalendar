#!/bin/bash

# ICP Calendar Secure Deployment Script
# This script deploys the secure, scalable architecture

set -e

echo "🚀 Starting ICP Calendar Secure Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if dfx is running
if ! dfx ping >/dev/null 2>&1; then
    echo -e "${RED}❌ DFX is not running. Please start with 'dfx start --background'${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Building frontend assets...${NC}"
cd src/frontend
npm install
npm run build
cd ../..

echo -e "${BLUE}🏗️  Deploying core infrastructure canisters...${NC}"

# Deploy in dependency order
echo -e "${YELLOW}📋 1. Deploying Canister Registry...${NC}"
dfx deploy canister_registry

echo -e "${YELLOW}⚖️  2. Deploying Load Balancer...${NC}"
dfx deploy load_balancer

echo -e "${YELLOW}💾 3. Deploying Backup System...${NC}"
dfx deploy backup_canister

echo -e "${BLUE}🔧 Deploying application canisters...${NC}"

echo -e "${YELLOW}👥 4. Deploying User Registry...${NC}"
dfx deploy user_registry

echo -e "${YELLOW}📅 5. Deploying Secure Calendar Canister...${NC}"
dfx deploy calendar_canister_secure

echo -e "${YELLOW}📞 6. Deploying Notification Canister...${NC}"
dfx deploy notification_canister

echo -e "${YELLOW}⏰ 7. Deploying Scheduling Canister...${NC}"
dfx deploy scheduling_canister

echo -e "${YELLOW}🌐 8. Deploying Frontend...${NC}"
dfx deploy frontend

echo -e "${GREEN}✅ All canisters deployed successfully!${NC}"

# Get canister IDs
REGISTRY_ID=$(dfx canister id canister_registry)
LOAD_BALANCER_ID=$(dfx canister id load_balancer)
BACKUP_ID=$(dfx canister id backup_canister)
CALENDAR_ID=$(dfx canister id calendar_canister_secure)
NOTIFICATION_ID=$(dfx canister id notification_canister)
USER_REGISTRY_ID=$(dfx canister id user_registry)
SCHEDULING_ID=$(dfx canister id scheduling_canister)

echo -e "${BLUE}📝 Canister IDs:${NC}"
echo "Registry: $REGISTRY_ID"
echo "Load Balancer: $LOAD_BALANCER_ID"
echo "Backup: $BACKUP_ID"
echo "Calendar: $CALENDAR_ID"
echo "Notification: $NOTIFICATION_ID"
echo "User Registry: $USER_REGISTRY_ID"
echo "Scheduling: $SCHEDULING_ID"

echo -e "${BLUE}🔧 Setting up canister group and security...${NC}"

# Register the canister group
echo -e "${YELLOW}📋 Registering canister group...${NC}"
dfx canister call canister_registry register_canister_group '("icp-calendar-main")'

# Get the access key (this would need to be extracted from the response in production)
ACCESS_KEY="key_$(dfx identity get-principal)_$(date +%s)"

echo -e "${YELLOW}🔗 Adding canisters to security group...${NC}"

# Add each canister to the group
dfx canister call canister_registry add_canister_to_group \
  "(\"icp-calendar-main\", principal \"$CALENDAR_ID\", \"calendar\", opt \"events-shard-1\")"

dfx canister call canister_registry add_canister_to_group \
  "(\"icp-calendar-main\", principal \"$NOTIFICATION_ID\", \"notification\", null)"

dfx canister call canister_registry add_canister_to_group \
  "(\"icp-calendar-main\", principal \"$USER_REGISTRY_ID\", \"user_registry\", null)"

dfx canister call canister_registry add_canister_to_group \
  "(\"icp-calendar-main\", principal \"$SCHEDULING_ID\", \"scheduling\", null)"

echo -e "${GREEN}✅ Security group configured!${NC}"

echo -e "${BLUE}🏥 Testing health checks...${NC}"

# Test each canister's health
echo -e "${YELLOW}Testing Calendar Canister...${NC}"
dfx canister call calendar_canister_secure health_check

echo -e "${YELLOW}Testing Load Balancer...${NC}"
dfx canister call load_balancer get_load_balancer_stats

echo -e "${YELLOW}Testing Backup System...${NC}"
dfx canister call backup_canister get_backup_stats

echo -e "${GREEN}✅ All health checks passed!${NC}"

echo -e "${BLUE}📊 System Status:${NC}"
dfx canister call canister_registry get_group_health '("icp-calendar-main")'

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Update your frontend configuration with the new canister IDs"
echo "2. Set up monitoring and alerting"
echo "3. Configure backup schedules"
echo "4. Test failover scenarios"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "• Check system health: dfx canister call load_balancer get_load_balancer_stats"
echo "• View backup status: dfx canister call backup_canister get_backup_stats"
echo "• Monitor group: dfx canister call canister_registry get_group_health '(\"icp-calendar-main\")'"
echo ""
echo -e "${GREEN}🔗 Frontend URL: http://localhost:4943/?canisterId=$(dfx canister id frontend)${NC}"

# Save deployment info
cat > deployment-info.json << EOF
{
  "deployment_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "network": "local",
  "canisters": {
    "canister_registry": "$REGISTRY_ID",
    "load_balancer": "$LOAD_BALANCER_ID",
    "backup_canister": "$BACKUP_ID",
    "calendar_canister_secure": "$CALENDAR_ID",
    "notification_canister": "$NOTIFICATION_ID",
    "user_registry": "$USER_REGISTRY_ID",
    "scheduling_canister": "$SCHEDULING_ID"
  },
  "group_id": "icp-calendar-main",
  "access_key": "$ACCESS_KEY"
}
EOF

echo -e "${GREEN}💾 Deployment info saved to deployment-info.json${NC}"
