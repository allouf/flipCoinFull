# VRF Operational Runbooks

## Overview

Quick reference guides for common VRF operational scenarios in the Solana Coin Flipper production environment. These runbooks provide step-by-step instructions for immediate response to various situations.

---

## 🚨 RUNBOOK 1: VRF Account Failure Detection and Response

### Symptoms
- VRF health monitoring alerts
- Increased game resolution times
- Emergency fallback usage increase
- User complaints about slow games

### Immediate Response (0-2 minutes)

```bash
# Step 1: Check system status
npm run validate-vrf-config

# Step 2: Check current account health
npm run deploy:verify:enhanced

# Step 3: Review recent logs
tail -f /var/log/coin-flipper/vrf-errors.log

# Step 4: Check Solana network status
curl -s https://status.solana.com/api/v2/status.json | jq '.status.indicator'
```

### Investigation (2-10 minutes)

1. **Identify Failed Account:**
   ```bash
   # Check which account is failing
   npm run vrf-config:validate | grep "❌"
   
   # Get detailed error information
   npm run validate-vrf-config 2>&1 | grep -A 3 "CRITICAL\|ERROR"
   ```

2. **Check Account Balance and Status:**
   ```bash
   # Check account exists and has sufficient balance
   solana account [VRF_ACCOUNT_PUBKEY] --url [CLUSTER_URL]
   
   # Check if it's a Switchboard VRF account
   sb solana vrf print [VRF_ACCOUNT_PUBKEY] --cluster [CLUSTER]
   ```

3. **Verify Oracle Queue Status:**
   ```bash
   # Check the oracle queue health
   sb solana queue print [QUEUE_PUBKEY] --cluster [CLUSTER]
   
   # Check oracle statuses in the queue
   sb solana oracle list --queue [QUEUE_PUBKEY] --cluster [CLUSTER]
   ```

### Resolution Actions

#### If Account Balance Issue:
```bash
# Fund the VRF account (rare - should be rent-exempt)
solana transfer [AMOUNT] [VRF_ACCOUNT_PUBKEY] --url [CLUSTER_URL]
```

#### If Oracle Queue Issue:
- Contact Switchboard team via Discord #switchboard-support
- Check Switchboard status page for known issues
- Consider switching to backup queue if available

#### If Network Congestion:
- Increase timeout thresholds temporarily
- Monitor for network recovery
- Use backup RPC endpoints if available

#### If Account Corruption:
```bash
# Create replacement VRF account
sb solana vrf create --cluster [CLUSTER] \
  --authority [PROGRAM_AUTHORITY_PDA] \
  --callback [CALLBACK_FUNCTION]

# Update environment variables
# Deploy configuration update
npm run deploy:devnet  # Test first
npm run deploy:mainnet # After verification
```

---

## 🔄 RUNBOOK 2: Emergency VRF Account Rotation

### When to Execute
- Account showing persistent degradation
- Security concerns with current account
- Planned maintenance of Switchboard infrastructure
- Account approaching end of recommended lifetime

### Prerequisites
```bash
# Ensure you have:
# - Backup VRF account ready and tested
# - Maintenance window scheduled
# - Team notifications sent
# - Rollback plan prepared
```

### Pre-Rotation Checklist (30 minutes before)
```bash
# Step 1: Verify backup account
sb solana vrf print [BACKUP_VRF_ACCOUNT] --cluster [CLUSTER]

# Step 2: Test backup account
npm run test:vrf-integration --account=[BACKUP_VRF_ACCOUNT]

# Step 3: Notify monitoring systems
# Set maintenance mode alerts to reduce noise

# Step 4: Prepare configuration
cp .env.production .env.production.backup
```

### Rotation Execution (Maintenance Window)

#### Phase 1: Configuration Update (2 minutes)
```bash
# Update environment variables
sed -i 's/REACT_APP_VRF_ACCOUNT_1_PUBKEY=[OLD_PUBKEY]/REACT_APP_VRF_ACCOUNT_1_PUBKEY=[NEW_PUBKEY]/' .env.production

# Verify configuration
npm run validate-vrf-config
```

#### Phase 2: Application Update (5 minutes)
```bash
# Deploy configuration changes
npm run deploy:mainnet

# Wait for deployment confirmation
# Monitor logs for successful initialization
```

#### Phase 3: Validation (10 minutes)
```bash
# Verify new account is being used
npm run deploy:verify:enhanced

# Monitor first few game resolutions
tail -f /var/log/coin-flipper/vrf-success.log

# Check health metrics
curl http://localhost:3000/api/health/vrf
```

### Post-Rotation Monitoring (24 hours)
- Monitor VRF success rates
- Check response time metrics  
- Verify no increase in emergency fallback usage
- Collect user feedback on game performance

### Rollback Procedure (if needed)
```bash
# Restore previous configuration
cp .env.production.backup .env.production

# Redeploy previous configuration
npm run deploy:mainnet

# Verify rollback successful
npm run validate-vrf-config
```

---

## 🏥 RUNBOOK 3: VRF System Health Check

### Daily Health Check (5 minutes)

```bash
#!/bin/bash
# Daily VRF Health Check Script

echo "🎲 VRF Daily Health Check - $(date)"
echo "================================"

# 1. Configuration validation
echo "1. Configuration Status:"
npm run validate-vrf-config | grep -E "(✅|❌|⚠️)"

# 2. Account connectivity
echo -e "\n2. Account Connectivity:"
npm run deploy:verify:enhanced | grep "VRF ACCOUNTS" -A 10

# 3. Recent performance metrics
echo -e "\n3. Performance Summary:"
echo "   - Games resolved in last 24h: $(grep 'Game resolved' /var/log/coin-flipper/games.log | grep -c "$(date -d '1 day ago' +'%Y-%m-%d')")"
echo "   - Emergency fallbacks used: $(grep 'Emergency fallback' /var/log/coin-flipper/vrf-errors.log | grep -c "$(date -d '1 day ago' +'%Y-%m-%d')")"
echo "   - Average response time: $(grep 'VRF response' /var/log/coin-flipper/metrics.log | tail -100 | awk '{sum+=$4; count++} END {print sum/count}')ms"

# 4. Alert summary
echo -e "\n4. Recent Alerts:"
grep "VRF\|vrf" /var/log/alerts.log | grep "$(date +'%Y-%m-%d')" | tail -5

echo -e "\n✅ Health check completed"
```

### Weekly Deep Health Assessment (30 minutes)

```bash
#!/bin/bash
# Weekly VRF Deep Health Assessment

echo "🔍 VRF Weekly Deep Assessment - $(date)"
echo "====================================="

# 1. Performance trending
echo "1. Performance Trends (Last 7 days):"
for i in {1..7}; do
  date_check=$(date -d "$i days ago" +'%Y-%m-%d')
  success_rate=$(grep "$date_check" /var/log/coin-flipper/metrics.log | awk '{sum+=$5; count++} END {print (sum/count)*100}')
  echo "   $date_check: ${success_rate:-0}% success rate"
done

# 2. Account utilization patterns  
echo -e "\n2. Account Utilization:"
for account in primary secondary tertiary; do
  usage=$(grep "$account" /var/log/coin-flipper/vrf-selection.log | grep -c "$(date +'%Y-%m-%d')")
  echo "   $account: $usage selections today"
done

# 3. Error pattern analysis
echo -e "\n3. Error Patterns:"
grep "VRF error" /var/log/coin-flipper/vrf-errors.log | grep -o "Error: [^,]*" | sort | uniq -c | sort -nr | head -5

# 4. Queue depth analysis
echo -e "\n4. Queue Health:"
sb solana queue print [QUEUE_PUBKEY] --cluster [CLUSTER] | grep -E "Oracle Count|Queue Size"

# 5. Network latency check
echo -e "\n5. Network Latency:"
for endpoint in $(grep "RPC_URL" .env.production | cut -d'=' -f2); do
  latency=$(curl -w "%{time_total}" -s -o /dev/null "$endpoint" -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}')
  echo "   $endpoint: ${latency}s"
done

echo -e "\n✅ Deep assessment completed"
```

---

## 🚀 RUNBOOK 4: VRF Performance Optimization

### Symptoms of Poor Performance
- VRF response times > 10 seconds consistently
- Queue depths > 15 regularly
- Success rates < 95%
- Increased user complaints

### Performance Investigation

#### Step 1: Identify Bottlenecks
```bash
# Check current performance metrics
npm run vrf-performance-report  # Custom script

# Analyze account selection patterns
grep "VRF account selected" /var/log/coin-flipper/debug.log | \
  tail -1000 | awk '{print $6}' | sort | uniq -c

# Check queue depth trends
grep "Queue depth" /var/log/coin-flipper/vrf-health.log | \
  tail -100 | awk '{print $4}' | sort -n
```

#### Step 2: Oracle Performance Analysis
```bash
# Check oracle response times per account
for account_pubkey in [LIST_OF_ACCOUNT_PUBKEYS]; do
  echo "Account: $account_pubkey"
  sb solana vrf print $account_pubkey --cluster [CLUSTER] | \
    grep -E "Last Response|Queue Depth"
done

# Check oracle queue health
sb solana queue print [QUEUE_PUBKEY] --cluster [CLUSTER]
```

#### Step 3: Network Performance Check
```bash
# Test RPC endpoint performance
for url in [LIST_OF_RPC_URLS]; do
  echo "Testing: $url"
  time curl -X POST "$url" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}'
done
```

### Optimization Actions

#### Immediate (< 5 minutes)
```bash
# Switch to faster RPC endpoint
export REACT_APP_DEVNET_RPC_URL="https://api.mainnet-beta.solana.com"

# Adjust health check intervals
export REACT_APP_VRF_HEALTH_CHECK_INTERVAL=20000  # 20 seconds

# Restart application to apply changes
pm2 restart coin-flipper-app
```

#### Short-term (< 1 hour)
```bash
# Create additional VRF account for load distribution
sb solana vrf create --cluster [CLUSTER] \
  --authority [PROGRAM_AUTHORITY_PDA] \
  --callback [CALLBACK_FUNCTION]

# Update configuration with additional account
# Test thoroughly before production deployment
```

#### Long-term (< 1 week)
- Implement weighted round-robin account selection
- Set up dedicated RPC infrastructure
- Optimize smart contract VRF callback processing
- Implement predictive queue management

---

## 🔧 RUNBOOK 5: New VRF Account Provisioning

### When to Create New Accounts
- Preparing for traffic scaling
- Replacing failing accounts
- Adding redundancy for high availability
- Regional performance optimization

### Prerequisites
- Sufficient SOL for account creation (0.2+ SOL)
- Access to Switchboard CLI
- Authority keypair for program
- Testing environment ready

### Account Creation Process

#### Step 1: Preparation
```bash
# Set environment variables
export CLUSTER="devnet"  # or "mainnet-beta"
export AUTHORITY_KEYPAIR="path/to/authority.json"
export PROGRAM_AUTHORITY_PDA="[YOUR_PDA_ADDRESS]"

# Verify environment
sb --version
solana --version
anchor --version
```

#### Step 2: Create VRF Account
```bash
# Create new VRF account
VRF_KEYPAIR="./new-vrf-account.json"
solana-keygen new --outfile $VRF_KEYPAIR

# Get the public key
VRF_PUBKEY=$(solana-keygen pubkey $VRF_KEYPAIR)
echo "New VRF Account: $VRF_PUBKEY"

# Create VRF account on Switchboard
sb solana vrf create \
  --keypair $VRF_KEYPAIR \
  --authority $PROGRAM_AUTHORITY_PDA \
  --cluster $CLUSTER \
  --callback "your_program_callback_function"
```

#### Step 3: Verification
```bash
# Verify account creation
sb solana vrf print $VRF_PUBKEY --cluster $CLUSTER

# Test account functionality
npm run test:vrf-account --account=$VRF_PUBKEY --cluster=$CLUSTER
```

#### Step 4: Integration Testing
```bash
# Add to test environment configuration
echo "REACT_APP_VRF_ACCOUNT_TEST_PUBKEY=$VRF_PUBKEY" >> .env.test

# Run integration tests
npm run test:integration -- --testNamePattern="VRF.*new.*account"

# Load test the new account
npm run test:load --vrf-account=$VRF_PUBKEY
```

#### Step 5: Production Integration
```bash
# Add to production configuration (during maintenance window)
echo "REACT_APP_VRF_ACCOUNT_4_PUBKEY=$VRF_PUBKEY" >> .env.production
echo "REACT_APP_VRF_ACCOUNT_4_NAME=emergency" >> .env.production  
echo "REACT_APP_VRF_ACCOUNT_4_PRIORITY=4" >> .env.production

# Validate complete configuration
npm run validate-vrf-config

# Deploy changes
npm run deploy:mainnet

# Monitor new account performance
watch -n 10 "grep '$VRF_PUBKEY' /var/log/coin-flipper/vrf-selection.log | tail -5"
```

---

## 📞 RUNBOOK 6: Emergency Communication Procedures

### Internal Communication (Team Alert)

#### Immediate Notification (< 2 minutes)
```bash
# Send Slack alert
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 VRF Emergency: [BRIEF_DESCRIPTION] - Incident #[ID] - [YOUR_NAME] responding"}' \
  $SLACK_EMERGENCY_WEBHOOK

# Update status page
curl -X POST "https://api.statuspage.io/v1/pages/[PAGE_ID]/incidents" \
  -H "Authorization: OAuth [TOKEN]" \
  -d "incident[name]=VRF System Issue" \
  -d "incident[status]=investigating"
```

#### Team Assembly (< 5 minutes)
```bash
# Page on-call engineer
curl -X POST "https://api.pagerduty.com/incidents" \
  -H "Authorization: Token token=[API_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"incident": {"type": "incident", "title": "VRF System Emergency", "service": {"id": "[SERVICE_ID]", "type": "service_reference"}}}'

# Create incident channel
# Invite: engineering team, ops team, management
```

### External Communication (User-Facing)

#### User Notification (< 10 minutes for critical issues)
```bash
# Update status page
curl -X PATCH "https://api.statuspage.io/v1/pages/[PAGE_ID]/incidents/[INCIDENT_ID]" \
  -H "Authorization: OAuth [TOKEN]" \
  -d "incident[status]=identified" \
  -d "incident[body]=We are experiencing VRF system issues affecting game resolution times. Emergency fallback systems are active. ETA for full resolution: [TIME]"

# Send in-app notification
curl -X POST "https://api.onesignal.com/api/v1/notifications" \
  -H "Authorization: Basic [API_KEY]" \
  -d '{"app_id": "[APP_ID]", "contents": {"en": "⚠️ Temporary delay in game resolution due to system maintenance. Games will complete normally."}, "included_segments": ["All"]}'
```

#### Social Media (< 30 minutes for major outages)
```bash
# Twitter announcement template:
"⚠️ We're experiencing temporary delays in game resolution on Solana Coin Flipper. 
Our emergency systems are working normally, and all games will be resolved. 
Updates: [status_page_url] 
ETA: [estimated_resolution_time]"

# Discord announcement template:
"🎲 **System Update** - VRF processing delays detected. Games are still fair and will resolve correctly using our backup systems. We're working on a fix and will update you shortly. All funds remain secure."
```

### Resolution Communication

#### Issue Resolved
```bash
# Update status page - resolved
curl -X PATCH "https://api.statuspage.io/v1/pages/[PAGE_ID]/incidents/[INCIDENT_ID]" \
  -H "Authorization: OAuth [TOKEN]" \
  -d "incident[status]=resolved" \
  -d "incident[body]=✅ VRF system fully restored. All games are now processing normally with full verifiable randomness."

# Team notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"✅ VRF Emergency Resolved - Incident #[ID] - System fully operational. Post-incident review scheduled for [TIME]"}' \
  $SLACK_EMERGENCY_WEBHOOK
```

---

## 📋 Quick Reference Commands

### Essential Commands
```bash
# System status check
npm run validate-vrf-config

# Enhanced deployment verification
npm run deploy:verify:enhanced

# VRF account details
sb solana vrf print [PUBKEY] --cluster [CLUSTER]

# Queue status
sb solana queue print [QUEUE_PUBKEY] --cluster [CLUSTER]

# Check account balance
solana account [PUBKEY] --url [RPC_URL]

# Network status
curl -s https://status.solana.com/api/v2/status.json | jq '.status'
```

### Log Monitoring
```bash
# VRF errors
tail -f /var/log/coin-flipper/vrf-errors.log

# System health
tail -f /var/log/coin-flipper/health.log | grep VRF

# Game resolutions
tail -f /var/log/coin-flipper/games.log | grep "resolved"

# Performance metrics
tail -f /var/log/coin-flipper/metrics.log | grep VRF
```

### Emergency Contacts
- **Primary On-Call:** [Phone] / [Email]
- **Secondary On-Call:** [Phone] / [Email]  
- **Switchboard Support:** Discord #switchboard-support
- **Solana Status:** https://status.solana.com

---

**Last Updated:** 2025-09-04  
**Version:** 1.0  
**Next Review:** 2025-12-04