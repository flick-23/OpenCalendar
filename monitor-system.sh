#!/bin/bash

# ICP Calendar System Monitor
# Monitors the health and performance of the secure canister architecture

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load deployment info
if [ ! -f "deployment-info.json" ]; then
    echo -e "${RED}❌ deployment-info.json not found. Run deploy-secure.sh first.${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 ICP Calendar System Monitor${NC}"
echo "=================================="

# Function to check canister health
check_canister_health() {
    local canister_name=$1
    local canister_id=$2
    local health_method=$3
    
    echo -e "${YELLOW}🏥 Checking $canister_name health...${NC}"
    
    if dfx canister call "$canister_id" "$health_method" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $canister_name is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ $canister_name is unhealthy${NC}"
        return 1
    fi
}

# Function to get metrics
get_metrics() {
    local canister_name=$1
    local canister_id=$2
    local metrics_method=$3
    
    echo -e "${BLUE}📊 $canister_name Metrics:${NC}"
    dfx canister call "$canister_id" "$metrics_method" 2>/dev/null || echo -e "${RED}❌ Failed to get metrics${NC}"
    echo ""
}

# Extract canister IDs from deployment info
REGISTRY_ID=$(cat deployment-info.json | grep -o '"canister_registry": "[^"]*"' | cut -d'"' -f4)
LOAD_BALANCER_ID=$(cat deployment-info.json | grep -o '"load_balancer": "[^"]*"' | cut -d'"' -f4)
BACKUP_ID=$(cat deployment-info.json | grep -o '"backup_canister": "[^"]*"' | cut -d'"' -f4)
CALENDAR_ID=$(cat deployment-info.json | grep -o '"calendar_canister_secure": "[^"]*"' | cut -d'"' -f4)
NOTIFICATION_ID=$(cat deployment-info.json | grep -o '"notification_canister": "[^"]*"' | cut -d'"' -f4)

echo -e "${BLUE}🔍 System Health Check${NC}"
echo "====================="

# Health checks
healthy_count=0
total_count=5

if check_canister_health "Registry" "$REGISTRY_ID" "get_group_health('(\"icp-calendar-main\")')"; then
    ((healthy_count++))
fi

if check_canister_health "Load Balancer" "$LOAD_BALANCER_ID" "get_load_balancer_stats"; then
    ((healthy_count++))
fi

if check_canister_health "Backup System" "$BACKUP_ID" "get_backup_stats"; then
    ((healthy_count++))
fi

if check_canister_health "Calendar" "$CALENDAR_ID" "health_check"; then
    ((healthy_count++))
fi

if check_canister_health "Notification" "$NOTIFICATION_ID" "status"; then
    ((healthy_count++))
fi

echo ""
echo -e "${BLUE}📊 System Metrics${NC}"
echo "================="

# Get detailed metrics
get_metrics "Load Balancer" "$LOAD_BALANCER_ID" "get_load_balancer_stats"
get_metrics "Backup System" "$BACKUP_ID" "get_backup_stats"
get_metrics "Calendar Canister" "$CALENDAR_ID" "get_stats"

# Overall system health
echo -e "${BLUE}🎯 Overall System Health${NC}"
echo "========================"

health_percentage=$((healthy_count * 100 / total_count))

if [ $health_percentage -eq 100 ]; then
    echo -e "${GREEN}✅ System Status: HEALTHY ($healthy_count/$total_count canisters)${NC}"
elif [ $health_percentage -ge 80 ]; then
    echo -e "${YELLOW}⚠️  System Status: DEGRADED ($healthy_count/$total_count canisters)${NC}"
else
    echo -e "${RED}❌ System Status: CRITICAL ($healthy_count/$total_count canisters)${NC}"
fi

echo ""
echo -e "${BLUE}🔍 Security Status${NC}"
echo "=================="

# Check group health
echo -e "${YELLOW}Checking canister group integrity...${NC}"
dfx canister call "$REGISTRY_ID" get_group_health '("icp-calendar-main")' 2>/dev/null && \
    echo -e "${GREEN}✅ Canister group is intact${NC}" || \
    echo -e "${RED}❌ Canister group has issues${NC}"

echo ""
echo -e "${BLUE}💾 Backup Status${NC}"
echo "================"

# Get backup information
echo -e "${YELLOW}Recent backup activity:${NC}"
dfx canister call "$BACKUP_ID" get_backup_stats 2>/dev/null || \
    echo -e "${RED}❌ Failed to get backup stats${NC}"

echo ""
echo -e "${BLUE}⚖️  Load Distribution${NC}"
echo "===================="

# Check load balancer
echo -e "${YELLOW}Load balancer statistics:${NC}"
dfx canister call "$LOAD_BALANCER_ID" get_load_balancer_stats 2>/dev/null || \
    echo -e "${RED}❌ Failed to get load balancer stats${NC}"

echo ""
echo -e "${BLUE}🔄 Automated Actions${NC}"
echo "===================="

# Check if any automated actions are needed
if [ $health_percentage -lt 80 ]; then
    echo -e "${YELLOW}⚠️  Triggering emergency backup due to degraded health...${NC}"
    dfx canister call "$BACKUP_ID" emergency_backup "(principal \"$CALENDAR_ID\", \"calendar\")" 2>/dev/null && \
        echo -e "${GREEN}✅ Emergency backup completed${NC}" || \
        echo -e "${RED}❌ Emergency backup failed${NC}"
fi

# Save monitoring report
cat > monitoring-report-$(date +%Y%m%d-%H%M%S).json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "overall_health": "$health_percentage%",
  "healthy_canisters": $healthy_count,
  "total_canisters": $total_count,
  "status": "$([ $health_percentage -eq 100 ] && echo 'HEALTHY' || ([ $health_percentage -ge 80 ] && echo 'DEGRADED' || echo 'CRITICAL'))"
}
EOF

echo -e "${GREEN}💾 Monitoring report saved${NC}"
echo ""

# Recommendations
echo -e "${BLUE}💡 Recommendations${NC}"
echo "=================="

if [ $health_percentage -lt 100 ]; then
    echo "• Investigate unhealthy canisters"
    echo "• Check canister cycles balance"
    echo "• Review error logs"
fi

if [ $health_percentage -ge 80 ]; then
    echo "• System is running well"
    echo "• Continue regular monitoring"
    echo "• Consider scaling if load increases"
fi

echo ""
echo -e "${BLUE}⏰ Schedule this script to run every 5 minutes for continuous monitoring${NC}"
echo "Example crontab entry: */5 * * * * /path/to/monitor-system.sh"
