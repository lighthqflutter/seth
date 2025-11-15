# 📧 Email API Business Case: Resend vs Brevo

**Date**: November 7, 2025
**Purpose**: Evaluate email service providers for Phase 18 (Email Notifications)
**Decision Criteria**: Cost, reliability, features, developer experience

---

## 🎯 Executive Summary

**Recommendation**: **Resend** for development/small schools, **Brevo** for production/large schools

**Reasoning**:
- Resend: Better DX, modern API, perfect for development
- Brevo: More generous free tier, better for production scale
- Both: Excellent deliverability, no infrastructure management

**Estimated Costs**:
- Development: $0 (free tiers sufficient)
- Production (per school):
  - Small school (100 students): $0-2/month
  - Medium school (300 students): $2-4/month
  - Large school (1,000 students): $8-15/month

---

## 📊 Provider Comparison

### Option 1: Resend ⭐ (Recommended for Development)

**Website**: https://resend.com

#### Pricing:
```
Free Tier:
- 3,000 emails/month
- 100 emails/day
- All features included
- No credit card required

Pro Tier ($20/month):
- 50,000 emails/month
- 1,667 emails/day
- All features

Business Tier ($1/month per 1,000 emails):
- Pay as you grow
- Volume discounts
```

#### Features:
- ✅ Modern, developer-friendly API
- ✅ React Email templates (built-in)
- ✅ Email verification (DKIM, SPF, DMARC)
- ✅ Analytics dashboard
- ✅ Webhooks for tracking
- ✅ TypeScript SDK
- ✅ 99.9% uptime SLA
- ✅ Excellent documentation
- ✅ Fast delivery (<1s)

#### Developer Experience:
```typescript
import { Resend } from 'resend';

const resend = new Resend('re_...');

await resend.emails.send({
  from: 'School Portal <noreply@yourschool.com>',
  to: 'parent@example.com',
  subject: 'Results Published',
  html: '<p>Your child\'s results are ready!</p>',
});
```

#### Pros:
- 🟢 Excellent developer experience
- 🟢 Built for modern React apps
- 🟢 Simple, predictable pricing
- 🟢 Great for development/testing
- 🟢 No setup complexity

#### Cons:
- 🔴 Free tier limited (3,000/month)
- 🔴 Can get expensive at scale
- 🔴 Younger company (less track record)

---

### Option 2: Brevo (formerly Sendinblue) ⭐ (Recommended for Production)

**Website**: https://brevo.com

#### Pricing:
```
Free Tier:
- 300 emails/day (9,000/month)
- Unlimited contacts
- Email templates
- No credit card required

Starter Tier ($25/month):
- 20,000 emails/month
- 667 emails/day
- No daily limit
- Email support

Business Tier ($65/month):
- 100,000 emails/month
- Marketing automation
- Advanced stats
- Phone support

Pay-as-you-go:
- $1.50 per 1,000 emails
- No monthly fee
- Perfect for low-volume
```

#### Features:
- ✅ Generous free tier (9,000/month)
- ✅ Email + SMS capability
- ✅ Email templates editor
- ✅ Marketing automation
- ✅ Contact management
- ✅ Transactional + marketing emails
- ✅ WhatsApp Business API integration
- ✅ 99.9% uptime SLA
- ✅ EU-based (GDPR compliant)
- ✅ Established company (2012)

#### Developer Experience:
```typescript
import * as SibApiV3Sdk from '@getbrevo/brevo';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, 'your-api-key');

await apiInstance.sendTransacEmail({
  sender: { email: 'noreply@yourschool.com', name: 'School Portal' },
  to: [{ email: 'parent@example.com' }],
  subject: 'Results Published',
  htmlContent: '<p>Your child\'s results are ready!</p>',
});
```

#### Pros:
- 🟢 Very generous free tier
- 🟢 More affordable at scale
- 🟢 Email + SMS in one platform
- 🟢 Marketing features included
- 🟢 Established company
- 🟢 WhatsApp integration available

#### Cons:
- 🔴 Less modern API design
- 🔴 Heavier SDK
- 🔴 More complex for simple use cases

---

### Option 3: AWS SES (Not Recommended)

**Pricing**: $0.10 per 1,000 emails

#### Pros:
- 🟢 Extremely cheap
- 🟢 Scales infinitely
- 🟢 AWS ecosystem

#### Cons:
- 🔴 Complex setup (SMTP, verification)
- 🔴 No email templates
- 🔴 No dashboard/analytics
- 🔴 Requires AWS knowledge
- 🔴 Need separate bounce/complaint handling
- 🔴 Not developer-friendly

**Verdict**: Too complex for benefits

---

### Option 4: SendGrid (Not Recommended)

**Pricing**: $15/month for 40,000 emails

#### Pros:
- 🟢 Well-known
- 🟢 Good documentation

#### Cons:
- 🔴 No free tier (removed in 2023)
- 🔴 More expensive than alternatives
- 🔴 Deliverability issues reported
- 🔴 Complex pricing tiers

**Verdict**: Not worth the cost vs Brevo/Resend

---

## 💰 Cost Analysis by School Size

### Small School (100 students, 5 teachers)

**Email Volume Estimate**:
- Results published: 100 parents × 3 terms = 300/year
- Welcome emails: 20 new users/year = 20/year
- Password resets: 50/year
- Misc notifications: 100/year
- **Total**: ~500 emails/year (~42/month)

**Cost**:
- Resend Free: ✅ $0/month (well within 3,000)
- Brevo Free: ✅ $0/month (well within 9,000)

**Recommendation**: Either free tier works

---

### Medium School (300 students, 15 teachers)

**Email Volume Estimate**:
- Results published: 300 parents × 3 terms = 900/year
- Welcome emails: 50 new users/year = 50/year
- Attendance notifications: 300 × 10/year = 3,000/year
- Password resets: 150/year
- Misc notifications: 500/year
- **Total**: ~4,600 emails/year (~384/month)

**Cost**:
- Resend Free: ✅ $0/month (within limit)
- Brevo Free: ✅ $0/month (well within limit)

**Recommendation**: Both free tiers work

---

### Large School (1,000 students, 50 teachers)

**Email Volume Estimate**:
- Results published: 1,000 parents × 3 terms = 3,000/year
- Welcome emails: 200 new users/year = 200/year
- Attendance notifications: 1,000 × 20/year = 20,000/year
- Skills published: 1,000 × 3 terms = 3,000/year
- Password resets: 500/year
- Misc notifications: 2,000/year
- **Total**: ~28,700 emails/year (~2,392/month)

**Cost**:
- Resend Free: ✅ $0/month (within 3,000/month)
- Brevo Free: ✅ $0/month (well within 9,000/month)

**Recommendation**: Both free tiers work!

---

### Very Large School (3,000 students, 100 teachers) - Heavy Email Use

**Email Volume Estimate**:
- Results published: 3,000 parents × 3 terms = 9,000/year
- Welcome emails: 500 new users/year = 500/year
- Attendance notifications: 3,000 × 30/year = 90,000/year
- Skills published: 3,000 × 3 terms = 9,000/year
- Weekly newsletters: 3,000 × 52 = 156,000/year
- Password resets: 1,500/year
- Misc notifications: 5,000/year
- **Total**: ~271,000 emails/year (~22,583/month)

**Cost**:
- Resend Pro: $20/month (covers 50,000/month) ✅
- Brevo Starter: $25/month (covers 20,000/month) ❌ Need Business
- Brevo Business: $65/month (covers 100,000/month) ✅

**Recommendation**:
- If < 50k/month: Resend Pro ($20)
- If > 50k/month: Brevo Business ($65)

---

## 🎯 Recommended Strategy

### Phase 1: Development & Launch (Free Tier)
**Use**: Resend or Brevo Free
- Both free tiers generous enough
- Test features thoroughly
- No cost during development
- Covers first 50-100 schools easily

### Phase 2: Early Production (Mostly Free)
**Use**: Brevo Free (9,000/month)
- More generous free tier
- Covers most small-medium schools
- No cost for 90% of customers
- Only large schools might need paid tier

### Phase 3: Scale (Hybrid Pricing)
**Strategy**: Pass email costs to customers
- Small/Medium schools: Free (covered by Brevo free tier)
- Large schools (>500 students): Include in subscription
- Enterprise tier: Unlimited emails included

**Pricing Model**:
```
Free Tier: No emails (or 50/month limit)
Starter ($15/month): 500 emails/month included
Professional ($35/month): 2,000 emails/month included
Enterprise ($75/month): Unlimited emails

Add-on: Email Notifications Standalone
- $4/month for 1,000 emails
- $0.004 per additional email
```

---

## 📊 Email Volume vs Cost Projection

| Monthly Emails | Resend | Brevo | Recommendation |
|----------------|--------|-------|----------------|
| 0 - 3,000 | Free | Free | Either |
| 3,001 - 9,000 | Free | Free | Brevo (no daily limit) |
| 9,001 - 20,000 | $20 | $25 | Resend |
| 20,001 - 50,000 | $20 | $25 | Resend |
| 50,001 - 100,000 | $50+ | $65 | Brevo |
| 100,000+ | $100+ | $65+ | Brevo + volume discount |

---

## 🔐 Security & Compliance

### Resend:
- ✅ SOC 2 Type II certified
- ✅ GDPR compliant
- ✅ 2FA for accounts
- ✅ API key management
- ✅ Audit logs

### Brevo:
- ✅ GDPR compliant (EU-based)
- ✅ ISO 27001 certified
- ✅ 2FA for accounts
- ✅ API key management
- ✅ Audit logs
- ✅ Data residency options

**Winner**: Tie (both excellent)

---

## 🚀 Implementation Complexity

### Resend:
```typescript
// Installation
npm install resend

// Setup (5 minutes)
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// Send email (1 line)
await resend.emails.send({ from, to, subject, html });
```
**Complexity**: ⭐ Very Simple

### Brevo:
```typescript
// Installation
npm install @getbrevo/brevo

// Setup (10 minutes)
import * as SibApiV3Sdk from '@getbrevo/brevo';
const api = new SibApiV3Sdk.TransactionalEmailsApi();
api.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, key);

// Send email (more verbose)
await api.sendTransacEmail({ sender, to, subject, htmlContent });
```
**Complexity**: ⭐⭐ Simple

**Winner**: Resend (cleaner API)

---

## 📈 Deliverability Rates

### Industry Averages:
- Resend: ~99% delivery rate
- Brevo: ~99% delivery rate
- AWS SES: ~98% delivery rate
- SendGrid: ~97% delivery rate

**Winner**: Tie (Resend & Brevo)

---

## 💡 Final Recommendation

### For Development:
**Use Resend**
- Better developer experience
- Faster to implement
- Modern, clean API
- React Email integration

### For Production (Launch):
**Use Brevo**
- More generous free tier (9,000 vs 3,000)
- Covers more schools for free
- Better for business model
- Email + SMS in one platform
- WhatsApp integration available (future)

### Hybrid Approach (Best):
1. **Start with Resend** for quick development
2. **Add Brevo support** before launch
3. **Let schools choose** via environment variable
4. **Default to Brevo** for cost efficiency

```typescript
// lib/emailService.ts
const provider = process.env.EMAIL_PROVIDER || 'brevo';

if (provider === 'resend') {
  await sendViaResend(...);
} else {
  await sendViaBre vo(...);
}
```

---

## 💰 Business Model Integration

### Pricing Strategy:
1. **Free Tier**: No email notifications (feature gated)
2. **Starter ($15/month)**: 500 emails/month (Brevo free covers this)
3. **Professional ($35/month)**: 2,000 emails/month (Brevo free covers this)
4. **Enterprise ($75/month)**: 10,000 emails/month (Brevo free covers this!)

**Cost to You**: $0 for 95% of customers (Brevo free tier)

### When to Upgrade Brevo:
Only when aggregate email volume > 9,000/month across ALL schools

**Break-even**:
- If you have 20 schools averaging 450 emails/month = 9,000 total
- Revenue: 20 × $35 = $700/month
- Cost: $0 (free tier)
- Profit: $700/month 🎉

- If you have 50 schools = 22,500 emails/month
- Revenue: 50 × $35 = $1,750/month
- Cost: $25/month (Brevo Starter)
- Profit: $1,725/month 🎉🎉

---

## ✅ Decision Matrix

| Criteria | Resend | Brevo | Winner |
|----------|--------|-------|--------|
| Free Tier | 3,000/mo | 9,000/mo | Brevo |
| Developer Experience | Excellent | Good | Resend |
| Pricing | $20/50k | $25/20k | Resend |
| Scale Pricing | Expensive | Affordable | Brevo |
| Setup Time | 5 min | 10 min | Resend |
| Features | Email only | Email+SMS+WhatsApp | Brevo |
| Deliverability | 99% | 99% | Tie |
| Documentation | Excellent | Good | Resend |
| Support | Email | Email+Phone | Brevo |
| Company Age | New (2022) | Established (2012) | Brevo |

**Overall Winner**: **Brevo** (for production)

---

## 🎯 Action Plan

1. **Week 1**: Implement with Resend (faster dev)
2. **Week 2**: Add Brevo support (production-ready)
3. **Week 3**: Test both providers
4. **Week 4**: Launch with Brevo as default
5. **Future**: Monitor usage, switch if needed

**Estimated Implementation**: 5-6 hours total

---

**Next Step**: Proceed with Phase 20 (Guardian Management), then implement Phase 18 with Brevo.
