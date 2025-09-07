# VRF Account Backup and Recovery Procedures

## Overview

This document outlines the backup procedures, disaster recovery plans, and operational procedures for maintaining VRF account reliability in the Solana Coin Flipper production environment.

## 🔄 VRF Account Backup Strategy

### Multi-Account Redundancy

The system is designed with multiple layers of VRF account redundancy:

```
Primary VRF Account (Priority 1)
    ↓ (if fails)
Secondary VRF Account (Priority 2) 
    ↓ (if fails)
Tertiary VRF Account (Priority 3)
    ↓ (if fails)
Emergency VRF Account (Priority 4) [Optional]
    ↓ (if all fail)
Emergency Pseudo-Random Fallback (60-second timeout)
```

### Account Configuration Backup

#### 1. Environment Variable Backup

Create secure backup copies of production VRF configuration:

```bash
# Create encrypted backup of production environment
cp .env.production vrf-backup-$(date +%Y%m%d-%H%M%S).env
gpg --symmetric --cipher-algo AES256 vrf-backup-*.env
rm vrf-backup-*.env  # Remove unencrypted version
```

#### 2. VRF Account Information Documentation

Maintain a secure record of all VRF account details:

**Production VRF Accounts Registry:**
```
Account 1 (Primary):
- Public Key: [REDACTED - Store in secure vault]
- Authority: [Program PDA]
- Queue: [Switchboard Queue Public Key]
- Creation Date: YYYY-MM-DD
- Network: mainnet-beta/devnet
- Status: Active/Inactive
- Notes: Performance characteristics, known issues

Account 2 (Secondary):
- [Similar structure]

Account 3 (Tertiary):  
- [Similar structure]

Account 4 (Emergency):
- [Similar structure]
```

#### 3. Switchboard Queue Information

Document the Switchboard oracles and queues being used:

```
Production Queues:
- Primary Queue: [Public Key]
  - Oracle Count: X
  - Min Oracle Results: X
  - Update Authority: [Public Key]
  - Last Verified: YYYY-MM-DD

Backup Queues:
- Secondary Queue: [Public Key]
  - Purpose: Failover for primary queue issues
  - Oracle Count: X
```

## 🚨 Disaster Recovery Procedures

### Scenario 1: Single VRF Account Failure

**Detection:**
- VRF health monitoring alerts triggered
- Account marked as unhealthy by VRFAccountManager
- Increased response times or failure rates

**Recovery Steps:**
1. **Immediate Response (< 2 minutes):**
   ```bash
   # Check account status
   npm run validate-vrf-config
   
   # Verify system is using backup accounts
   # Check application logs for failover confirmation
   ```

2. **Investigation (2-10 minutes):**
   - Check Switchboard oracle status
   - Verify account funding (rent exemption)
   - Check queue health and oracle availability
   - Review recent Solana network issues

3. **Temporary Fix (10-30 minutes):**
   - If account is temporarily unavailable: Wait and monitor
   - If account is permanently compromised: Create replacement account
   - Update monitoring alerts for the failed account

4. **Permanent Resolution (within 24 hours):**
   - Create new VRF account following setup guide
   - Test new account thoroughly on devnet first
   - Update production configuration during maintenance window
   - Update backup documentation

### Scenario 2: Multiple VRF Account Failures

**Detection:**
- Multiple VRF health alerts
- Emergency fallback system activated
- Games resolving with pseudo-random instead of VRF

**Recovery Steps:**
1. **Emergency Response (< 5 minutes):**
   ```bash
   # Immediately assess scope
   npm run deploy:verify:enhanced
   
   # Check if emergency fallback is working
   # Monitor game resolution success rates
   ```

2. **Rapid Deployment (5-15 minutes):**
   - Deploy emergency VRF accounts from backup pool
   - Use pre-created emergency accounts if available
   - Update configuration with emergency accounts

3. **System Restoration (15-60 minutes):**
   - Identify root cause (network issues, oracle problems, etc.)
   - Work with Switchboard team if oracle infrastructure issue
   - Coordinate with Solana community if network-wide issue

4. **Post-Incident (within 4 hours):**
   - Conduct incident review
   - Update procedures based on lessons learned
   - Replenish emergency account pool

### Scenario 3: Complete VRF System Failure

**Detection:**
- All VRF accounts failing
- Emergency fallback consistently triggered
- Potential smart contract or infrastructure issue

**Recovery Steps:**
1. **Immediate Assessment (< 2 minutes):**
   ```bash
   # Check system-wide status
   npm run pre-production-check
   
   # Verify smart contract deployment
   # Check Solana network status
   ```

2. **Emergency Operations (2-15 minutes):**
   - Activate incident response team
   - Consider temporary service suspension if required
   - Communicate with users about temporary pseudo-random mode

3. **Full Recovery (15 minutes - 4 hours):**
   - Deploy new smart contract version if needed
   - Recreate all VRF accounts from scratch
   - Coordinate with Switchboard for oracle issues
   - Execute comprehensive system testing

## 🔧 Operational Procedures

### Regular Maintenance Tasks

#### Daily Checks (Automated)
```bash
# Automated via cron job or CI/CD
npm run validate-vrf-config
npm run deploy:verify:enhanced

# Check VRF account balances (rent exemption)
# Monitor health metrics and alert thresholds
# Verify oracle availability and performance
```

#### Weekly Reviews
1. **Performance Analysis:**
   - Review VRF success rates
   - Analyze response time trends
   - Check emergency fallback usage

2. **Account Health Assessment:**
   ```bash
   # Generate weekly VRF health report
   npm run vrf-health-report  # (custom script)
   
   # Review queue depths and oracle performance
   # Check for any degradation trends
   ```

3. **Backup Verification:**
   - Test backup account functionality
   - Verify emergency procedures work
   - Update documentation with any changes

#### Monthly Disaster Recovery Drills

1. **Simulated Failures:**
   - Temporarily disable primary VRF account
   - Test failover mechanisms
   - Measure recovery times

2. **Emergency Account Testing:**
   - Deploy to test environment
   - Verify emergency accounts work correctly
   - Update emergency account pool if needed

3. **Documentation Updates:**
   - Review and update recovery procedures
   - Update contact information
   - Verify backup integrity

### Account Rotation Procedures

For security and reliability, rotate VRF accounts periodically:

#### Monthly Rotation Schedule
```
Month 1: Create new Account 4, demote Account 1 to backup
Month 2: Create new Account 1, demote Account 2 to backup  
Month 3: Create new Account 2, demote Account 3 to backup
Month 4: Create new Account 3, demote Account 4 to backup
```

#### Rotation Steps
1. **Pre-rotation (Week before):**
   ```bash
   # Create new VRF account on devnet for testing
   sb solana vrf create --cluster devnet ...
   
   # Test new account thoroughly
   npm run test -- --testNamePattern="VRF"
   ```

2. **Production Rotation (Maintenance window):**
   ```bash
   # Update environment variables
   # Deploy configuration changes
   # Monitor for 24 hours
   ```

3. **Post-rotation (Following week):**
   - Verify new account performance
   - Archive old account (don't delete immediately)
   - Update documentation

## 📊 Monitoring and Alerting

### Key Metrics to Monitor

1. **VRF Response Times:**
   - Target: < 8 seconds average
   - Alert: > 10 seconds for 5 minutes
   - Critical: > 15 seconds or timeout

2. **Success Rates:**
   - Target: > 95% success rate
   - Alert: < 93% success rate
   - Critical: < 90% success rate

3. **Queue Depths:**
   - Target: < 10 requests queued
   - Alert: > 12 requests queued
   - Critical: > 15 requests queued

4. **Emergency Fallback Usage:**
   - Target: < 1% of games
   - Alert: > 2% of games
   - Critical: > 5% of games

### Alerting Configuration

```yaml
# Example monitoring configuration
alerts:
  vrf_response_time:
    condition: avg_response_time > 10000ms for 5min
    action: page-on-call-engineer
    
  vrf_success_rate:
    condition: success_rate < 0.93 for 3min
    action: notify-team-slack
    
  emergency_fallback:
    condition: fallback_rate > 0.05 for 1min
    action: page-on-call-engineer-immediately
    
  all_accounts_down:
    condition: healthy_accounts = 0
    action: critical-incident-response
```

## 🔐 Security Considerations

### VRF Account Security

1. **Authority Management:**
   - VRF accounts are controlled by program PDAs, not personal wallets
   - No single person has direct control over VRF accounts
   - Emergency procedures require multiple team members

2. **Private Key Protection:**
   - VRF account private keys stored in secure hardware/vault
   - Access logged and requires approval
   - Regular rotation of authority keys

3. **Monitoring Access:**
   - Read-only monitoring doesn't require private keys
   - Public key visibility for transparency
   - Health check systems use public APIs only

### Network Security

1. **RPC Endpoint Security:**
   - Use dedicated/private RPC endpoints for production
   - Implement rate limiting and DDoS protection
   - Monitor for unusual traffic patterns

2. **Smart Contract Security:**
   - Regular security audits
   - Formal verification of critical paths
   - Bug bounty programs

## 📞 Emergency Contacts

### Internal Team
- **Primary On-Call Engineer:** [Contact Info]
- **Secondary On-Call Engineer:** [Contact Info]  
- **Technical Lead:** [Contact Info]
- **Operations Manager:** [Contact Info]

### External Partners
- **Switchboard Team:** 
  - Discord: #switchboard-support
  - Email: support@switchboard.xyz
  - Documentation: https://docs.switchboard.xyz

- **Solana Community:**
  - Discord: #developer-support
  - Forum: https://forum.solana.com
  - Status Page: https://status.solana.com

### Escalation Procedures

1. **Level 1 (0-15 minutes):** On-call engineer response
2. **Level 2 (15-60 minutes):** Technical lead involvement  
3. **Level 3 (1+ hours):** Management and external partner engagement
4. **Level 4 (4+ hours):** Public communication and user notifications

## 🧪 Testing Procedures

### Pre-Production Testing

Before deploying any VRF changes to production:

1. **Devnet Testing:**
   ```bash
   # Test with real VRF accounts on devnet
   REACT_APP_NETWORK=devnet npm run deploy:verify:enhanced
   
   # Run integration tests
   npm run test:integration -- --testNamePattern="VRF"
   
   # Load test VRF system
   npm run test:load-vrf
   ```

2. **Staging Environment:**
   - Deploy to staging with production-like configuration
   - Run 24-hour reliability test
   - Simulate various failure scenarios

3. **Production Deployment:**
   - Use blue-green deployment strategy
   - Monitor metrics for 48 hours post-deployment
   - Have rollback plan ready

### Recovery Testing

Quarterly disaster recovery testing:

1. **Controlled Failures:**
   - Disable accounts in test environment
   - Measure detection and recovery times
   - Document any issues or improvements

2. **End-to-End Recovery:**
   - Complete system rebuild from backups
   - Verify all documentation is accurate
   - Update procedures based on findings

## 📈 Performance Optimization

### VRF Selection Optimization

1. **Account Performance Tracking:**
   - Historical response times per account
   - Success rates and reliability metrics
   - Queue depth patterns and oracle load

2. **Dynamic Prioritization:**
   - Adjust account priorities based on performance
   - Implement weighted selection for load balancing
   - Automatic promotion/demotion based on metrics

3. **Predictive Maintenance:**
   - Identify accounts showing degradation
   - Proactive rotation before failures
   - Oracle load prediction and management

## 📝 Documentation Maintenance

This document should be updated:
- **Monthly:** Metric thresholds and contact information
- **Quarterly:** Procedures and emergency contacts
- **Annually:** Complete review and validation testing

**Last Updated:** 2025-09-04  
**Next Review:** 2025-12-04  
**Version:** 1.0