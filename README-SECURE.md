# ICP Calendar - Secure & Scalable Architecture

## 🏗️ Architecture Overview

This project implements a production-ready, secure, and scalable calendar application on the Internet Computer Protocol (ICP) with the following key features:

### ✅ Security Features

- **Inter-canister authentication** with access keys
- **Canister group isolation** preventing unauthorized access
- **Ownership verification** for all data operations
- **Secure communication** between project canisters only

### ✅ Scalability Features

- **Load balancing** across multiple canister instances
- **Automatic failover** when canisters become unhealthy
- **Horizontal scaling** capability for high traffic
- **Resource monitoring** and health checks

### ✅ Reliability Features

- **Automatic backup system** with configurable schedules
- **Disaster recovery plans** with step-by-step restoration
- **Health monitoring** with real-time status tracking
- **Graceful degradation** under adverse conditions

### ✅ Maintainability Features

- **Centralized canister registry** for easy management
- **Standardized security base** for consistent behavior
- **Comprehensive metrics** and monitoring dashboard
- **Automated deployment** scripts

## 🏛️ Canister Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (SvelteKit)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Auth Store  │  │Events Store │  │Calendar Store│             │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Actor Calls (Authenticated)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Internet Computer Network                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Canister    │  │ Load        │  │ Backup      │              │
│  │ Registry    │  │ Balancer    │  │ System      │              │
│  │             │  │             │  │             │              │
│  │ • Groups    │  │ • Health    │  │ • Snapshots │              │
│  │ • Security  │  │ • Routing   │  │ • Recovery  │              │
│  │ • Monitoring│  │ • Metrics   │  │ • Restore   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Calendar    │  │ Notification│  │ User        │              │
│  │ Canister    │  │ Canister    │  │ Registry    │              │
│  │ (Secure)    │  │             │  │             │              │
│  │             │  │ • Reminders │  │ • Profiles  │              │
│  │ • Events    │  │ • Alerts    │  │ • Auth      │              │
│  │ • Security  │  │ • Queue     │  │ • Settings  │              │
│  │ • Metrics   │  │ • Batch     │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 📂 Project Structure

```
src/
├── backend/
│   ├── common/
│   │   └── SecurityBase.mo          # Shared security module
│   ├── registry/
│   │   └── CanisterRegistry.mo      # Central canister management
│   ├── loadbalancer/
│   │   └── LoadBalancer.mo          # Traffic distribution & health
│   ├── backup/
│   │   └── BackupCanister.mo        # Backup & disaster recovery
│   ├── calendar/
│   │   └── CalendarCanister_Secure.mo # Secure calendar implementation
│   ├── notification/
│   │   └── NotificationCanister.mo  # Alert system
│   └── user_registry/
│       └── UserRegistry.mo          # User management
├── frontend/                        # SvelteKit application
└── declarations/                    # Generated type definitions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- DFX 0.27.0+
- Internet Computer SDK

### 1. Deploy the System

```bash
# Make deployment script executable
chmod +x deploy-secure.sh

# Start DFX (if not already running)
dfx start --background

# Deploy the entire secure architecture
./deploy-secure.sh
```

### 2. Monitor System Health

```bash
# Make monitoring script executable
chmod +x monitor-system.sh

# Check system status
./monitor-system.sh
```

### 3. Access the Application

The deployment script will output the frontend URL. Access your calendar at:

```
http://localhost:4943/?canisterId=<frontend-canister-id>
```

## 🔐 Security Model

### Inter-Canister Authentication

All canisters in the project use a shared security model:

```motoko
// Each canister verifies callers
private func verify_inter_canister_caller(caller: Principal) : async Result.Result<(), Text> {
    switch (await secure_base.verify_caller(caller, my_principal)) {
        case (#ok(true)) { #ok() };
        case (#ok(false)) { #err("Unauthorized canister") };
        case (#err(msg)) { #err(msg) };
    };
};
```

### Access Control Levels

1. **Public Operations**: Anyone can read public events
2. **User Operations**: Users can manage their own events
3. **Inter-Canister Operations**: Authorized canisters can perform system functions
4. **Admin Operations**: Only specific canisters can perform maintenance

### Group Isolation

Canisters are organized into secured groups:

```bash
# Register a canister group
dfx canister call canister_registry register_canister_group '("icp-calendar-main")'

# Add canisters to the group
dfx canister call canister_registry add_canister_to_group \
  '("icp-calendar-main", principal "canister-id", "calendar", null)'
```

## ⚖️ Load Balancing & Scaling

### Load Balancing Strategies

The system supports multiple load balancing strategies:

1. **Round Robin**: Evenly distribute requests
2. **Least Connections**: Route to least busy canister
3. **Weighted Random**: Based on canister capacity
4. **Response Time**: Route to fastest responding canister

### Horizontal Scaling

To scale the system:

1. Deploy additional canister instances
2. Register them with the canister registry
3. Load balancer automatically includes them
4. Monitor and adjust based on metrics

```bash
# Deploy additional calendar canister
dfx deploy calendar_canister_secure_2

# Register with load balancer
dfx canister call canister_registry add_canister_to_group \
  '("icp-calendar-main", principal "new-canister-id", "calendar", opt "events-shard-2")'
```

## 💾 Backup & Recovery

### Automated Backups

The system automatically creates backups:

- **Heartbeat backups**: Every 5 minutes
- **Change-based backups**: After significant updates
- **Emergency backups**: When system health degrades

### Manual Backup

```bash
# Trigger manual backup
dfx canister call backup_canister emergency_backup \
  '(principal "calendar-canister-id", "calendar")'
```

### Disaster Recovery

1. **Generate Recovery Plan**:

```bash
dfx canister call backup_canister generate_recovery_plan \
  '(principal "failed-canister-id")'
```

2. **Execute Recovery**:

```bash
dfx canister call backup_canister execute_recovery \
  '(principal "failed-canister-id")'
```

## 📊 Monitoring & Metrics

### Health Monitoring

Check system health:

```bash
# Overall system health
./monitor-system.sh

# Individual canister health
dfx canister call calendar_canister_secure health_check

# Load balancer statistics
dfx canister call load_balancer get_load_balancer_stats

# Backup system status
dfx canister call backup_canister get_backup_stats
```

### Key Metrics Tracked

- **Request count** and **error rates**
- **Response times** and **latency**
- **Memory usage** and **cycles balance**
- **Backup frequency** and **success rates**
- **Inter-canister** communication health

## 🔧 Configuration

### Environment Variables

Update canister IDs in your configuration:

```typescript
// In your frontend stores
const CANISTER_IDS = {
  registry: "your-registry-canister-id",
  loadBalancer: "your-load-balancer-id",
  calendar: "your-calendar-canister-id",
  // ... other canisters
};
```

### Security Configuration

Update `SecurityBase.mo` configuration:

```motoko
private let config : SecurityBase.CanisterConfig = {
    registry_canister = Principal.fromText("your-registry-id");
    group_id = "your-group-id";
    access_key = "your-generated-access-key";
    canister_type = "calendar";
    shard_key = ?"your-shard-key";
};
```

## 🚨 Troubleshooting

### Common Issues

1. **Canister Out of Cycles**

   - Top up cycles: `dfx ledger top-up <canister-id> --amount 1000000000000`
   - Check backup system for recovery

2. **Inter-Canister Auth Fails**

   - Verify canister is registered in group
   - Check access key configuration
   - Ensure registry canister is healthy

3. **Load Balancer Not Routing**
   - Check canister health status
   - Verify canisters are registered
   - Review load balancer logs

### Debug Commands

```bash
# Check canister status
dfx canister status <canister-name>

# View canister logs
dfx canister logs <canister-name>

# Test inter-canister calls
dfx canister call canister_registry verify_inter_canister_call \
  '("access-key", principal "caller-id", principal "target-id")'
```

## 🔄 Upgrade Process

### Safe Upgrade Procedure

1. **Create backup** before upgrade
2. **Update canister** code
3. **Test functionality**
4. **Update registry** if needed
5. **Monitor health** post-upgrade

```bash
# 1. Backup
dfx canister call backup_canister emergency_backup '(principal "canister-id", "type")'

# 2. Upgrade
dfx deploy canister_name

# 3. Verify
dfx canister call canister_name health_check
```

## 📈 Performance Optimization

### Best Practices

1. **Use query calls** for read operations
2. **Batch operations** when possible
3. **Implement caching** for frequently accessed data
4. **Monitor cycles usage** regularly
5. **Optimize data structures** for your use case

### Scaling Triggers

Consider scaling when:

- Response times > 2 seconds consistently
- Error rates > 5%
- Memory usage > 80%
- Request queue building up

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement security measures for new features
4. Add monitoring and health checks
5. Update documentation
6. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the troubleshooting section
- Review monitoring output
- Create an issue on GitHub
- Consult ICP documentation

---

## 🎯 Production Deployment Checklist

Before deploying to mainnet:

- [ ] Update all canister IDs in configuration
- [ ] Generate secure access keys
- [ ] Configure proper cycles management
- [ ] Set up monitoring and alerting
- [ ] Test disaster recovery procedures
- [ ] Verify security group isolation
- [ ] Optimize for expected load
- [ ] Create rollback plan
- [ ] Document operational procedures
- [ ] Train operations team

This architecture provides enterprise-grade reliability, security, and scalability for your ICP Calendar application.
