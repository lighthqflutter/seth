# Biometric Device Integration Guide

## Overview

This guide provides technical documentation for integrating biometric attendance devices (fingerprint and facial recognition) with the School Portal system. It covers API endpoints, webhook configurations, device setup, and troubleshooting.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Supported Devices](#supported-devices)
3. [Integration Methods](#integration-methods)
4. [API Endpoints](#api-endpoints)
5. [Device Configuration](#device-configuration)
6. [Webhook Setup](#webhook-setup)
7. [Data Synchronization](#data-synchronization)
8. [Security & Authentication](#security--authentication)
9. [Error Handling](#error-handling)
10. [Testing & Debugging](#testing--debugging)
11. [Production Deployment](#production-deployment)
12. [Troubleshooting](#troubleshooting)

---

## 1. Architecture Overview

### System Components

```
┌─────────────────┐
│  Biometric      │
│  Device         │◄─────┐
│  (Terminal)     │      │
└────────┬────────┘      │
         │               │
         │ HTTP/SDK      │ Sync
         │               │
         ▼               │
┌─────────────────┐      │
│  Device         │      │
│  Controller/    │◄─────┘
│  Bridge Server  │
└────────┬────────┘
         │
         │ HTTPS/Webhook
         │
         ▼
┌─────────────────┐
│  School Portal  │
│  API Server     │
│  (Firestore)    │
└─────────────────┘
```

### Data Flow

1. **Student Enrollment**: Portal → Device Controller → Terminal
2. **Attendance Check-in**: Terminal → Device Controller → Portal
3. **Synchronization**: Bidirectional sync every 5 minutes
4. **Reports**: Portal aggregates data from all devices

---

## 2. Supported Devices

### ZKTeco Devices

#### K40 Fingerprint Terminal
- **SDK**: ZKTeco Standalone SDK
- **Protocol**: TCP/IP, HTTP
- **API**: REST API available
- **Realtime**: Yes (push events)

#### SpeedFace-V5L Facial Recognition
- **SDK**: ZKTeco BioTime API
- **Protocol**: TCP/IP, HTTPS
- **API**: RESTful API
- **Realtime**: Yes (webhooks supported)

**Integration Level**: ⭐⭐⭐⭐⭐ (Excellent)

---

### HikVision Devices

#### DS-K1T320MX Terminal
- **SDK**: HikVision ISAPI
- **Protocol**: HTTP/HTTPS
- **API**: XML-based API
- **Realtime**: Yes (event server)

#### DeepinView Face Recognition
- **SDK**: HikVision Open Platform
- **Protocol**: HTTPS
- **API**: JSON REST API
- **Realtime**: Yes (MQTT/webhook)

**Integration Level**: ⭐⭐⭐⭐ (Very Good)

---

### Suprema Devices

#### BioStation 2
- **SDK**: Suprema BioStar 2 API
- **Protocol**: HTTPS
- **API**: REST API
- **Realtime**: Yes (SSE/WebSocket)

**Integration Level**: ⭐⭐⭐⭐⭐ (Excellent)

---

### Generic USB Fingerprint Scanners

#### Digital Persona U.are.U 4500
- **SDK**: DigitalPersona Web SDK
- **Protocol**: USB → Local Web Server → Portal
- **API**: JavaScript SDK
- **Realtime**: No (browser-based polling)

**Integration Level**: ⭐⭐⭐ (Good for desktop use)

---

## 3. Integration Methods

### Method A: Direct HTTP Integration (Recommended)

**Best for**: ZKTeco, HikVision, Suprema devices with built-in HTTP API

**Pros**:
- ✅ No middleware needed
- ✅ Real-time webhooks
- ✅ Easy to implement
- ✅ Scalable

**Cons**:
- ⚠️ Device must have internet access
- ⚠️ Firewall configuration needed

**Architecture**:
```
Terminal → Direct HTTPS → School Portal API
```

---

### Method B: Bridge Server Integration

**Best for**: Legacy devices, USB scanners, proprietary protocols

**Pros**:
- ✅ Works with any device
- ✅ Local network only
- ✅ Batch processing
- ✅ Offline support

**Cons**:
- ⚠️ Requires additional server
- ⚠️ More complex setup
- ⚠️ Delayed sync

**Architecture**:
```
Terminal → TCP/IP → Bridge Server → HTTPS → School Portal API
```

---

### Method C: SDK Integration

**Best for**: Custom hardware, embedded solutions

**Pros**:
- ✅ Full control
- ✅ Custom features
- ✅ Optimized performance

**Cons**:
- ⚠️ Complex implementation
- ⚠️ Requires programming
- ⚠️ Device-specific code

**Architecture**:
```
Terminal SDK → Custom App → HTTPS → School Portal API
```

---

## 4. API Endpoints

### Base URL
```
Production: https://api.cedarsportal.com
Staging: https://staging-api.cedarsportal.com
Local Dev: http://localhost:3000/api
```

### Authentication

All API requests require authentication using an API key:

```http
Authorization: Bearer {DEVICE_API_KEY}
Content-Type: application/json
```

---

### 4.1 Device Registration

Register a biometric device with the portal.

**Endpoint**: `POST /api/attendance/devices/register`

**Request Body**:
```json
{
  "tenantId": "school_tenant_id",
  "deviceName": "Main Gate - Biometric Terminal",
  "deviceType": "fingerprint|face_recognition|hybrid",
  "deviceModel": "ZKTeco SpeedFace-V5L",
  "serialNumber": "SF001234567",
  "location": "Main Entrance",
  "ipAddress": "192.168.1.100",
  "macAddress": "00:1A:2B:3C:4D:5E"
}
```

**Response**:
```json
{
  "success": true,
  "deviceId": "dev_abc123xyz",
  "apiKey": "sk_live_xxx...xxx",
  "webhookSecret": "whsec_yyy...yyy",
  "syncEndpoint": "https://api.cedarsportal.com/api/attendance/sync/dev_abc123xyz"
}
```

---

### 4.2 Student Enrollment

Enroll a student's biometric data on a device.

**Endpoint**: `POST /api/attendance/devices/{deviceId}/enroll`

**Request Body**:
```json
{
  "studentId": "student_id_123",
  "enrollmentData": {
    "fingerprintTemplate": "base64_encoded_template",
    "faceTemplate": "base64_encoded_template",
    "cardNumber": "123456789"
  }
}
```

**Response**:
```json
{
  "success": true,
  "enrollmentId": "enr_xyz789",
  "studentId": "student_id_123",
  "deviceId": "dev_abc123xyz",
  "enrolledAt": "2025-01-10T08:30:00Z"
}
```

---

### 4.3 Attendance Check-in (Webhook from Device)

Device sends this webhook when a student checks in.

**Endpoint**: `POST /api/attendance/checkin`

**Request Headers**:
```http
Authorization: Bearer {DEVICE_API_KEY}
X-Webhook-Signature: {HMAC_SHA256_SIGNATURE}
Content-Type: application/json
```

**Request Body**:
```json
{
  "deviceId": "dev_abc123xyz",
  "studentId": "student_id_123",
  "verificationType": "fingerprint|face|card|pin",
  "verificationScore": 95,
  "timestamp": "2025-01-10T07:45:30Z",
  "temperature": 36.5,
  "maskDetected": true,
  "photoUrl": "https://device.local/photos/checkin_20250110_074530.jpg"
}
```

**Response**:
```json
{
  "success": true,
  "attendanceId": "att_record_456",
  "status": "present|late|early",
  "message": "Check-in recorded successfully",
  "studentName": "John Doe",
  "className": "JSS 1A",
  "checkInTime": "07:45 AM"
}
```

---

### 4.4 Bulk Student Sync

Sync all students to a device for enrollment.

**Endpoint**: `GET /api/attendance/devices/{deviceId}/students`

**Response**:
```json
{
  "success": true,
  "count": 350,
  "students": [
    {
      "id": "student_id_123",
      "userId": "123456789",
      "firstName": "John",
      "lastName": "Doe",
      "admissionNumber": "2024/001",
      "classId": "class_jss1a",
      "photoUrl": "https://portal.com/photos/student_123.jpg",
      "fingerprintTemplates": [
        {
          "finger": "right_thumb",
          "template": "base64_template_data"
        }
      ],
      "faceTemplate": "base64_face_template"
    }
  ]
}
```

---

### 4.5 Device Status & Health Check

Check device connectivity and status.

**Endpoint**: `POST /api/attendance/devices/{deviceId}/heartbeat`

**Request Body**:
```json
{
  "status": "online|offline|maintenance",
  "uptime": 86400,
  "enrolledCount": 350,
  "lastSyncTime": "2025-01-10T07:00:00Z",
  "freeMemory": "45%",
  "batteryLevel": 95,
  "errorLogs": []
}
```

**Response**:
```json
{
  "success": true,
  "syncRequired": false,
  "configUpdates": {}
}
```

---

## 5. Device Configuration

### ZKTeco Configuration

#### Connect to Device
```bash
# Via Web Interface
http://192.168.1.100
Username: admin
Password: admin (default)
```

#### Configure Network Settings
1. Go to **Communication** → **Network**
2. Set static IP: `192.168.1.100`
3. Subnet: `255.255.255.0`
4. Gateway: `192.168.1.1`
5. DNS: `8.8.8.8`

#### Enable HTTP Push (Webhook)
1. Go to **Communication** → **Cloud**
2. Enable **HTTP Push**
3. Set URL: `https://api.cedarsportal.com/api/attendance/checkin`
4. Method: `POST`
5. Add Header: `Authorization: Bearer {API_KEY}`
6. Set push events: **Attendance**, **Enrollment**
7. Push interval: **Realtime**

#### Configure Time Settings
1. Go to **System** → **Date/Time**
2. Set timezone: `Africa/Lagos (GMT+1)`
3. Enable NTP: `pool.ntp.org`
4. Auto sync: `Enabled`

---

### HikVision Configuration

#### Initial Setup
```bash
# Access via SADP Tool or Web Interface
http://192.168.1.100
Username: admin
Password: Setup on first boot
```

#### Configure HTTP Listening
1. Go to **Network** → **Advanced** → **HTTP Listening**
2. Enable HTTP notification
3. URL: `https://api.cedarsportal.com/api/attendance/checkin`
4. Protocol: `HTTPS`
5. Method: `POST`
6. Events: **Access Control Event**

#### ISAPI Configuration
```xml
<!-- HTTP POST to HikVision Device -->
PUT /ISAPI/AccessControl/UserInfo/Record
<UserInfoRecord>
  <employeeNo>student_id_123</employeeNo>
  <name>John Doe</name>
  <userType>normal</userType>
</UserInfoRecord>
```

---

### Suprema BioStar 2 Configuration

#### API Setup
1. Install **BioStar 2** server software
2. Go to **Setup** → **Device** → Add device
3. Configure **Connection Mode**: TCP/IP
4. Set IP address
5. Enable **Event Monitoring**

#### Webhook Configuration
```javascript
// BioStar 2 Webhook URL
https://api.cedarsportal.com/api/attendance/checkin

// Event Types
EVENT_TYPE_VERIFY_SUCCESS = 0x1000
EVENT_TYPE_VERIFY_FAIL = 0x1001
EVENT_TYPE_IDENTIFY_SUCCESS = 0x2000
```

---

## 6. Webhook Setup

### Webhook Security

All webhooks must include HMAC signature for verification.

**Signature Calculation**:
```javascript
const crypto = require('crypto');

const webhookSecret = 'whsec_yyy...yyy';
const payload = JSON.stringify(requestBody);
const timestamp = Date.now();

const signedPayload = `${timestamp}.${payload}`;
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(signedPayload)
  .digest('hex');

// Include in header
headers['X-Webhook-Signature'] = `t=${timestamp},v1=${signature}`;
```

**Verification (Server-side)**:
```typescript
import { createHmac } from 'crypto';

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const [timestamp, hash] = signature.split(',').map(pair => pair.split('=')[1]);

  // Check timestamp is recent (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false;
  }

  // Verify signature
  const expectedSignature = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  return hash === expectedSignature;
}
```

---

### Webhook Retry Logic

If webhook delivery fails, the device should retry:

| Attempt | Delay | Timeout |
|---------|-------|---------|
| 1 | 0s | 10s |
| 2 | 30s | 10s |
| 3 | 5min | 15s |
| 4 | 30min | 15s |
| 5 | 2hr | 20s |

After 5 failed attempts, store locally and sync during next successful connection.

---

## 7. Data Synchronization

### Sync Strategy

**Full Sync**: Every 24 hours at 2:00 AM
**Incremental Sync**: Every 5 minutes
**Real-time Push**: Immediate on attendance events

### Sync Endpoints

#### Download Students
```
GET /api/attendance/devices/{deviceId}/students?lastSync=timestamp
```

#### Upload Attendance Records
```
POST /api/attendance/devices/{deviceId}/upload
{
  "records": [
    {
      "localId": "device_record_1",
      "studentId": "student_123",
      "timestamp": "2025-01-10T07:45:00Z",
      "verificationType": "fingerprint",
      "score": 95
    }
  ]
}
```

#### Download Configuration
```
GET /api/attendance/devices/{deviceId}/config
```

---

## 8. Security & Authentication

### Device API Keys

API keys have the format: `sk_live_{tenant_id}_{random_32_chars}`

**Permissions**:
- Read student data
- Write attendance records
- Upload device logs
- Download configuration

**Security Best Practices**:
- ✅ Store API keys in device secure storage
- ✅ Use HTTPS only
- ✅ Implement rate limiting (100 req/min)
- ✅ Rotate keys annually
- ✅ Monitor for suspicious activity

---

### Data Encryption

**In Transit**:
- TLS 1.3 for all HTTPS connections
- Certificate pinning recommended

**At Rest (on device)**:
- Biometric templates encrypted with AES-256
- Student data encrypted
- Logs encrypted

---

## 9. Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 201 | Created | Record saved |
| 400 | Bad Request | Check payload format |
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Check endpoint URL |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Retry with backoff |
| 503 | Service Unavailable | Check system status |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "Student with ID student_123 not found in system",
    "details": {
      "studentId": "student_123",
      "deviceId": "dev_abc123xyz"
    }
  }
}
```

### Common Error Codes

- `INVALID_API_KEY`: API key is missing or invalid
- `DEVICE_NOT_REGISTERED`: Device not registered in portal
- `STUDENT_NOT_FOUND`: Student ID doesn't exist
- `DUPLICATE_CHECKIN`: Student already checked in today
- `INVALID_SIGNATURE`: Webhook signature verification failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SYNC_CONFLICT`: Data conflict during sync

---

## 10. Testing & Debugging

### Test Mode

Enable test mode during development:

```http
POST /api/attendance/checkin
X-Test-Mode: true
```

Test mode features:
- No permanent records created
- Detailed debug logs returned
- Bypasses some validations

### Webhook Testing Tool

Use webhook.site or similar for testing:

```bash
# Test webhook
curl -X POST https://webhook.site/your-unique-url \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "dev_test_123",
    "studentId": "student_456",
    "verificationType": "fingerprint",
    "timestamp": "2025-01-10T08:00:00Z"
  }'
```

### Device Simulator

```javascript
// Node.js device simulator
const axios = require('axios');

async function simulateCheckin(studentId) {
  const response = await axios.post(
    'https://api.cedarsportal.com/api/attendance/checkin',
    {
      deviceId: 'dev_simulator_001',
      studentId: studentId,
      verificationType: 'fingerprint',
      verificationScore: 98,
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        'Authorization': 'Bearer sk_test_xxx',
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Check-in response:', response.data);
}

// Simulate multiple check-ins
const students = ['student_1', 'student_2', 'student_3'];
students.forEach(id => simulateCheckin(id));
```

---

## 11. Production Deployment

### Pre-Launch Checklist

- [ ] Device registered in portal
- [ ] API keys configured
- [ ] Webhook URL tested
- [ ] SSL certificate valid
- [ ] Network firewall rules configured
- [ ] Students enrolled on device
- [ ] Time zone configured correctly
- [ ] Backup power supply connected
- [ ] Test check-ins successful
- [ ] Error alerts configured
- [ ] Monitoring dashboards set up
- [ ] Staff trained on system
- [ ] Rollback plan documented

### Monitoring

**Key Metrics to Monitor**:
- Check-in success rate
- API response time
- Webhook delivery rate
- Device uptime
- Sync failures
- Error rate

**Alerting Thresholds**:
- Device offline > 5 minutes
- Check-in failure rate > 5%
- Sync delay > 10 minutes
- API errors > 10 per hour

### Backup Strategy

- **Device logs**: Stored for 30 days
- **Attendance records**: Replicated to cloud immediately
- **Biometric templates**: Backed up weekly
- **Configuration**: Version controlled

---

## 12. Troubleshooting

### Device Can't Connect to Portal

**Check**:
1. Network connectivity: `ping api.cedarsportal.com`
2. DNS resolution: `nslookup api.cedarsportal.com`
3. Firewall rules: Allow outbound HTTPS (port 443)
4. API key validity
5. Device registration status

**Solution**:
```bash
# Test connection
curl -v https://api.cedarsportal.com/api/health

# Test authentication
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.cedarsportal.com/api/attendance/devices/dev_xxx/status
```

---

### Webhooks Not Received

**Check**:
1. Webhook URL configured on device
2. Device has internet connectivity
3. Firewall allows outbound connections
4. API endpoint is accessible
5. Webhook signature matches

**Debug**:
```bash
# Check webhook logs on device
# Verify payload format
# Test webhook endpoint manually
curl -X POST https://api.cedarsportal.com/api/attendance/checkin \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"dev_xxx","studentId":"test","verificationType":"fingerprint","timestamp":"2025-01-10T08:00:00Z"}'
```

---

### Student Not Recognized

**Check**:
1. Student enrolled on device
2. Biometric quality (fingerprint clear, face well-lit)
3. Device sensitivity settings
4. Template corruption

**Solution**:
- Re-enroll student
- Clean fingerprint sensor
- Adjust lighting for face recognition
- Update device firmware

---

### Sync Failures

**Check**:
1. Network stability
2. API rate limits
3. Data conflicts
4. Storage capacity

**Solution**:
```javascript
// Manual sync trigger
POST /api/attendance/devices/{deviceId}/sync/trigger
{
  "forceFull": true
}
```

---

### Time Drift Issues

**Check**:
- Device time vs server time
- NTP configuration
- Timezone settings

**Solution**:
```bash
# Enable NTP on device
# Set NTP server: pool.ntp.org
# Configure timezone: Africa/Lagos
# Verify time: Check device display vs portal
```

---

## 13. Advanced Features

### Temperature Screening Integration

```json
// Extended check-in payload with temperature
{
  "deviceId": "dev_abc123xyz",
  "studentId": "student_123",
  "verificationType": "face",
  "timestamp": "2025-01-10T07:45:00Z",
  "temperature": 36.8,
  "temperatureUnit": "celsius",
  "feverAlert": false
}
```

### Mask Detection

```json
{
  "maskDetected": true,
  "maskCompliance": "proper|improper|none"
}
```

### Photo Capture

```json
{
  "photoUrl": "https://device.local/photos/checkin_xxx.jpg",
  "photoBase64": "data:image/jpeg;base64,/9j/4AAQ..." // Optional
}
```

---

## 14. Support & Resources

### Technical Support
- Email: support@cedarsportal.com
- Phone: +234 XXX XXX XXXX
- Hours: Mon-Fri 8AM-6PM WAT

### Documentation
- API Reference: https://docs.cedarsportal.com/api
- Integration Guides: https://docs.cedarsportal.com/integrations
- Video Tutorials: https://youtube.com/@cedarsportal

### Community
- Developer Forum: https://community.cedarsportal.com
- GitHub Issues: https://github.com/cedarsportal/integrations
- Stack Overflow: Tag `cedars-portal`

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Author**: Cedars School Portal Development Team
