# Solturio Monthly Profit & Loss Statement

*Last Updated: January 2026*

## Executive Summary

This document outlines Solturio's revenue model, cost structure, and projected profitability. The platform operates with a sustainable ~95% margin at current projections.

---

## Pricing Structure

### Platform Access (Subscription)

| Tier | Price | Currency | Period | Notes |
|------|-------|----------|--------|-------|
| Promo | 0.14 SOL | SOL | Annual | Early adopter rate |
| Standard | 0.5 SOL | SOL | Annual | Regular pricing |

*Primary payment in $CATH with multi-token support*

### ISCL (Independent Smart Contract License) Creation

| Item | Price | Currency | Notes |
|------|-------|----------|-------|
| Per ISCL | 0.025 SOL | SOL only | On-chain deployment fee |

### Rewards Distribution

| Token | Total Supply | Purpose |
|-------|--------------|---------|
| $SOLT | 400,000,000 | Platform engagement, quiz rewards, referrals |

---

## Baseline Projection (500 Users / 30 Days)

### Assumptions

| Variable | Value | Notes |
|----------|-------|-------|
| SOL Price | $175 | Adjust in sensitivity analysis |
| New users | 500 | Monthly onboarding target |
| IP registrations per user | 2 | Average |
| ISCL adoption rate | 30% | Users who create at least 1 ISCL |
| Badge image size | 150 KB | Average verified badge |
| Metadata JSON size | 4 KB | Average IPFS metadata |

---

## Revenue

| Source | Calculation | SOL | USD |
|--------|-------------|-----|-----|
| Subscriptions (promo) | 500 users × 0.14 SOL | 70.00 | $12,250 |
| ISCL creation fees | 150 ISCLs × 0.025 SOL | 3.75 | $656 |
| **Total Revenue** | | **73.75 SOL** | **$12,906** |

### Per-User Revenue

| Metric | Value |
|--------|-------|
| Average revenue per user | 0.1475 SOL ($25.81) |
| Subscription only | 0.14 SOL ($24.50) |
| With ISCL (30% of users) | 0.165 SOL ($28.88) |

---

## Costs

### Infrastructure (Fixed Monthly)

| Category | Provider | Monthly Cost | Notes |
|----------|----------|--------------|-------|
| Hosting | Replit Core | $20 | Base plan |
| Compute credits | Replit | $10-30 | Usage-based overage |
| **Subtotal** | | **$30-50** | |

### Domains (Fixed Monthly)

| Domain | Annual Cost | Monthly Equivalent |
|--------|-------------|-------------------|
| solturio.app | ~$15/year | $1.25 |
| solturio.com | ~$12/year | $1.00 |
| **Subtotal** | | **$2.25** |

### Storage (Variable)

| Service | Tier/Usage | Monthly Cost | Notes |
|---------|------------|--------------|-------|
| Pinata (IPFS) | Growth plan | $25 | Covers ~100GB, metadata storage |
| Arweave | ~22 MB badges | ~$3 | Permanent storage, 150 users × 150KB |
| **Subtotal** | | **~$28** | |

### Network / Gas (Variable - Platform Subsidized)

| Transaction Type | Volume | Gas per TX | Total SOL | USD |
|------------------|--------|------------|-----------|-----|
| Account creation | 500 | 0.00001 | 0.005 | $0.88 |
| Wallet creation | 500 | 0.00001 | 0.005 | $0.88 |
| IP registration | 1,000 | 0.002 | 2.00 | $350 |
| ISCL deployment | 150 | 0.005 | 0.75 | $131 |
| Buffer/retries | ~10% | - | 0.25 | $44 |
| **Subtotal** | | | **~3 SOL** | **~$527** |

### Total Costs Summary

| Category | Monthly USD |
|----------|-------------|
| Infrastructure | $30-50 |
| Domains | $2.25 |
| Storage | $28 |
| Network (gas subsidy) | $527 |
| **Total Costs** | **~$587-607** |

---

## Net Position

| Metric | SOL | USD |
|--------|-----|-----|
| Total Revenue | 73.75 | $12,906 |
| Total Costs | ~3.4 | ~$597 |
| **Net Profit** | **~70.35** | **~$12,309** |
| **Profit Margin** | | **~95%** |

### Key Ratios

| Metric | Value |
|--------|-------|
| Cost per user | ~$1.19 |
| Profit per user | ~$24.62 |
| Break-even users | ~3 (covers fixed costs) |
| Gas cost as % of revenue | ~4% |

---

## Sensitivity Analysis

### SOL Price Variations (500 Users)

| SOL Price | Revenue USD | Costs USD | Net Profit | Margin |
|-----------|-------------|-----------|------------|--------|
| $100 | $7,375 | $387 | $6,988 | 95% |
| $150 | $11,063 | $527 | $10,536 | 95% |
| **$175** | **$12,906** | **$597** | **$12,309** | **95%** |
| $200 | $14,750 | $667 | $14,083 | 95% |
| $250 | $18,438 | $807 | $17,631 | 96% |

### User Volume Variations (SOL @ $175)

| Users | Revenue | Costs | Net Profit | Per-User Profit |
|-------|---------|-------|------------|-----------------|
| 100 | $2,581 | $177 | $2,404 | $24.04 |
| 250 | $6,453 | $357 | $6,096 | $24.38 |
| **500** | **$12,906** | **$597** | **$12,309** | **$24.62** |
| 1,000 | $25,813 | $1,077 | $24,736 | $24.74 |
| 5,000 | $129,063 | $4,877 | $124,186 | $24.84 |

### ISCL Adoption Rate Variations (500 Users, SOL @ $175)

| ISCL Adoption | ISCLs Created | ISCL Revenue | Total Revenue | Net Profit |
|---------------|---------------|--------------|---------------|------------|
| 10% | 50 | $219 | $12,469 | $11,872 |
| 20% | 100 | $438 | $12,688 | $12,091 |
| **30%** | **150** | **$656** | **$12,906** | **$12,309** |
| 50% | 250 | $1,094 | $13,344 | $12,747 |
| 75% | 375 | $1,641 | $13,891 | $13,294 |

---

## Fixed vs Variable Costs

### Fixed Costs (Monthly Baseline)

| Item | Monthly |
|------|---------|
| Replit hosting | $30 |
| Domains (2) | $2.25 |
| Pinata storage | $25 |
| **Total Fixed** | **$57.25** |

*Break-even: ~1 subscription covers all fixed costs*

### Variable Costs (Per User)

| Item | Per User |
|------|----------|
| Solana gas (subsidized) | ~$1.05 |
| Arweave storage | ~$0.02 |
| **Total Variable** | **~$1.07** |

---

## Cost Optimization Opportunities

| Opportunity | Potential Savings | Trade-off |
|-------------|-------------------|-----------|
| User pays own gas | ~$527/month | Higher friction, lower conversion |
| Bundle gas into subscription | $0 | Cleaner UX, current model |
| Move to self-hosted IPFS | ~$25/month | More maintenance |
| Batch Arweave uploads | ~10% savings | Slight delay in verification |

---

## Revenue Growth Projections

### Year 1 Targets

| Quarter | Users | Revenue (USD) | Costs (USD) | Net (USD) |
|---------|-------|---------------|-------------|-----------|
| Q1 | 500 | $12,906 | $597 | $12,309 |
| Q2 | 1,500 | $38,719 | $1,377 | $37,342 |
| Q3 | 3,000 | $77,438 | $2,457 | $74,981 |
| Q4 | 5,000 | $129,063 | $3,837 | $125,226 |
| **Year 1** | **5,000** | **$258,126** | **$8,268** | **$249,858** |

*Assumes SOL @ $175, 30% ISCL adoption, cumulative users*

---

## Notes & Assumptions

1. **Gas prices**: Based on current Solana rates (~0.000005-0.005 SOL per tx)
2. **Arweave pricing**: ~$0.15/MB via Bundlr/Turbo
3. **Pinata**: Growth tier at $25/month covers projected volume
4. **Platform subsidy**: All network fees paid by platform
5. **ISCL adoption**: Conservative 30% estimate
6. **Churn**: Not modeled (assumes annual subscriptions)

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| Jan 2026 | 1.0 | Initial P&L structure |

---

*This document should be updated monthly with actual figures once the platform launches.*
