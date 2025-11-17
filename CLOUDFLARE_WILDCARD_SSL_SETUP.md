# Cloudflare Wildcard SSL Setup (Option 3)

This guide shows how to use Cloudflare's wildcard SSL instead of adding individual domains to Vercel. This approach:
- ✅ Supports **unlimited** school subdomains
- ✅ Stays on Vercel **Hobby plan** (free)
- ✅ Uses Cloudflare's global CDN
- ✅ Automatic HTTPS for all subdomains

---

## Prerequisites

- Domain managed by Cloudflare
- Vercel project deployed
- Wildcard A record already configured

---

## Step 1: Cloudflare DNS Configuration

### 1.1 Add Wildcard A Record

In Cloudflare DNS settings:

```
Type: A
Name: *
IPv4 address: 76.76.21.21
Proxy status: Proxied (ORANGE cloud - important!)
TTL: Auto
```

**Important**: The orange cloud must be **enabled** for SSL to work.

### 1.2 Keep Your Existing Records

Keep all your current DNS records:
- `@` → `216.198.79.1` (apex domain)
- `www` → Vercel CNAME
- Email records (MX, SPF, DKIM)
- Other subdomains (cpanel, webmail, etc.)

---

## Step 2: Cloudflare SSL/TLS Configuration

### 2.1 Set Encryption Mode

1. Go to **SSL/TLS** in Cloudflare sidebar
2. Set encryption mode to: **Full (strict)**

**Why?**
- `Flexible`: ❌ Cloudflare ↔ Vercel uses HTTP (insecure)
- `Full`: ✅ Cloudflare ↔ Vercel uses HTTPS (secure)
- `Full (strict)`: ✅ Same as Full + validates certificate

### 2.2 Enable Universal SSL

1. Go to **SSL/TLS → Edge Certificates**
2. Ensure **Universal SSL** is: `Active`
3. Enable these settings:
   - ✅ **Always Use HTTPS**: ON
   - ✅ **Automatic HTTPS Rewrites**: ON
   - ✅ **Minimum TLS Version**: TLS 1.2

### 2.3 Order Wildcard Certificate (Optional)

For even better security:

1. Go to **SSL/TLS → Edge Certificates**
2. Click **Order SSL/TLS Certificate**
3. Select **Advanced Certificate Manager** (if available on your plan)
4. Add: `*.seth.ng` and `seth.ng`

**Note**: This requires a paid Cloudflare plan ($10/month). Universal SSL (free) works fine for most cases.

---

## Step 3: Disable Vercel Domain Addition

### 3.1 Remove Vercel Token (Optional)

If you want to completely disable Vercel domain addition:

1. In Vercel project → **Settings** → **Environment Variables**
2. **Delete** or **comment out**:
   - `VERCEL_TOKEN`
   - `VERCEL_PROJECT_ID`

**OR** keep them for manual domain addition when needed.

### 3.2 Code Already Handles This

The school creation API already checks:

```typescript
if (process.env.VERCEL_TOKEN) {
  // Add domain to Vercel
} else {
  console.log('Using Cloudflare wildcard SSL');
}
```

So if you remove the token, it automatically switches to Cloudflare-only mode.

---

## Step 4: Verify It Works

### 4.1 Test a New School Subdomain

1. Create a new school via registration
2. Immediately visit: `https://newschool.seth.ng`
3. Should work with HTTPS (green padlock) ✅

### 4.2 Check SSL Certificate

1. Click the padlock icon in browser
2. Certificate issued by: **Cloudflare**
3. Valid for: `*.seth.ng` and `seth.ng`

### 4.3 Test Multiple Subdomains

```bash
curl -I https://school1.seth.ng
curl -I https://school2.seth.ng
curl -I https://school3.seth.ng
```

All should return `200 OK` with HTTPS.

---

## How It Works

### Request Flow:

```
User Browser
   ↓ HTTPS
Cloudflare CDN (SSL termination)
   ↓ HTTPS
Vercel Edge Network
   ↓
Your Next.js App (middleware handles subdomain)
```

### DNS Resolution:

```
User requests: https://divinegrace.seth.ng
   ↓
DNS lookup: divinegrace.seth.ng
   ↓
Matches wildcard: *.seth.ng → 76.76.21.21
   ↓
Cloudflare proxy (orange cloud)
   ↓
Routes to Vercel
```

### Middleware Routing:

```javascript
// middleware.ts handles all subdomains
const subdomain = hostname.split('.')[0]; // "divinegrace"
response.headers.set('x-tenant-subdomain', subdomain);
```

---

## Benefits of This Approach

### Unlimited Scale
- ✅ **No domain limit** (Vercel Hobby = 50 max)
- ✅ Works for 1,000+ schools
- ✅ Stays on free plans

### Performance
- ✅ Cloudflare's global CDN (300+ locations)
- ✅ DDoS protection included
- ✅ Faster than direct Vercel in many regions

### Cost
- ✅ Cloudflare Free plan: $0/month
- ✅ Vercel Hobby plan: $0/month
- ✅ **Total: $0/month**

### Management
- ✅ Zero manual domain addition
- ✅ Automatic HTTPS for all subdomains
- ✅ One wildcard certificate covers all

---

## Troubleshooting

### Issue: "Too many redirects"

**Cause**: SSL mode is set to `Flexible`

**Fix**: Change to `Full` or `Full (strict)`

### Issue: "ERR_SSL_PROTOCOL_ERROR"

**Cause**: Orange cloud is disabled on wildcard

**Fix**: Enable proxy (orange cloud) for `*` A record

### Issue: Mixed content warnings

**Cause**: Some resources loaded over HTTP

**Fix**: Enable "Automatic HTTPS Rewrites" in Cloudflare

### Issue: Slow SSL provisioning

**Cause**: Universal SSL can take 15-30 minutes

**Fix**: Wait or order Advanced Certificate

---

## Comparison: Vercel vs Cloudflare SSL

| Feature | Vercel SSL | Cloudflare SSL |
|---------|-----------|----------------|
| **Cost** | Free (50 domains) / $20 (100+) | Free (unlimited) |
| **Setup** | Manual per domain | Automatic wildcard |
| **SSL Provider** | Let's Encrypt | Cloudflare |
| **CDN** | Vercel Edge | Cloudflare (300+ locations) |
| **DDoS Protection** | Basic | Enterprise-grade |
| **Provisioning Time** | 5-10 minutes | Instant |
| **Domain Limit** | 50 (Hobby) / 100 (Pro) | **Unlimited** |

---

## Switching Between Methods

### From Vercel SSL → Cloudflare SSL

1. Remove/disable `VERCEL_TOKEN` in environment variables
2. Enable orange cloud on wildcard A record
3. Set Cloudflare SSL to `Full (strict)`
4. Done! New schools use Cloudflare SSL

### From Cloudflare SSL → Vercel SSL

1. Add `VERCEL_TOKEN` to environment variables
2. Disable orange cloud (gray cloud) on wildcard A record
3. Manually add each subdomain to Vercel
4. Wait for SSL provisioning per domain

---

## Recommended Setup

For most schools:

1. **Start with Vercel SSL** (under 50 schools)
   - Easier to debug
   - Vercel handles everything

2. **Switch to Cloudflare SSL** (approaching 50 schools)
   - Remove Vercel token
   - Enable Cloudflare proxy
   - Unlimited scale forever

---

## Security Considerations

### Cloudflare Proxy

**Pros:**
- ✅ DDoS protection
- ✅ Web Application Firewall (WAF)
- ✅ Bot protection
- ✅ Rate limiting

**Cons:**
- ⚠️ Cloudflare can see decrypted traffic
- ⚠️ Additional hop in request chain

### SSL Certificate Validation

**Full (strict)** mode ensures:
- ✅ End-to-end encryption
- ✅ Certificate validation
- ✅ No man-in-the-middle attacks

---

## Monitoring

### Check SSL Status

```bash
# Check certificate
echo | openssl s_client -showcerts -connect divinegrace.seth.ng:443 2>/dev/null | openssl x509 -noout -text

# Check redirect chain
curl -IL https://divinegrace.seth.ng
```

### Cloudflare Analytics

1. Go to Cloudflare dashboard
2. View **Analytics** tab
3. See traffic by subdomain

---

## Summary

**You're now set up for unlimited school subdomains with automatic HTTPS!**

- ✅ Wildcard A record → Cloudflare proxy → Vercel
- ✅ Middleware handles tenant routing
- ✅ SSL certificates automatic
- ✅ Zero manual work per school
- ✅ Scales to thousands of schools
- ✅ Stays on free plans

**Next school that registers**: Instantly gets `https://schoolname.seth.ng` with HTTPS!

---

**Questions?** Check the main README or contact support.
