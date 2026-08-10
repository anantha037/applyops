# ApplyOps API Requirements Specification

This document defines the complete REST API contract required by the ApplyOps frontend. It serves as the authoritative interface specification between the React/Vite frontend and the FastAPI backend.

---

## Base Configuration

- **Environment Variable**: `VITE_API_BASE_URL` (Fallback: `VITE_API_URL` or `http://127.0.0.1:8000`)
- **Headers**: `Content-Type: application/json`
- **Authentication**: Bearer Token or Cookie Session (where required)

---

## 1. Applications API

### 1.1 List Applications
- **Status**: `IMPLEMENTED`
- **Method**: `GET`
- **Endpoint**: `/applications`
- **Query Parameters**:
  - `status` *(optional, string)*: Filter by status (`Not Contacted`, `In Progress`, `Interviewing`, `Offer Received`, `Rejected`, `Ghosted`)
  - `stage` *(optional, string)*: Filter by stage (`Applied`, `Called`, `Emailed`, `Follow-up 1`, `Follow-up 2`, `Follow-up 3`, `Closed`)
- **Success Response** (`200 OK`):
  ```json
  [
    {
      "id": "app_123",
      "date_applied": "2026-08-10",
      "company": "Stripe",
      "job_title": "Senior Frontend Engineer",
      "jd_summary": "Lead UI development",
      "application_method": "LinkedIn Easy Apply",
      "hr_name": "Sarah Jenkins",
      "hr_phone": "+14158901234",
      "hr_email": "sarah@stripe.com",
      "ctc": "$180,000",
      "status": "In Progress",
      "stage": "Applied",
      "last_touch_date": "2026-08-10",
      "next_action_due": "2026-08-12",
      "interview_date": null,
      "interview_round": "",
      "interview_attended": null,
      "latest_update": "Submitted application",
      "remarks": ""
    }
  ]
  ```

### 1.2 Get Application by ID
- **Status**: `REQUIRED BACKEND ENDPOINT`
- **Method**: `GET`
- **Endpoint**: `/applications/{id}`
- **Success Response** (`200 OK`): Application object.
- **Errors**: `404 Not Found`

### 1.3 Create Application
- **Status**: `IMPLEMENTED`
- **Method**: `POST`
- **Endpoint**: `/applications`
- **Request Body**:
  ```json
  {
    "company": "Linear",
    "job_title": "Product Engineer",
    "application_method": "Employee Referral",
    "status": "In Progress",
    "stage": "Applied",
    "date_applied": "2026-08-10",
    "hr_name": "",
    "hr_email": ""
  }
  ```
- **Success Response** (`201 Created`): Created Application object.

### 1.4 Update Application
- **Status**: `IMPLEMENTED`
- **Method**: `PATCH`
- **Endpoint**: `/applications/{id}`
- **Request Body**: Partial application fields object.
- **Success Response** (`200 OK`): Updated Application object.

### 1.5 Update Application Status
- **Status**: `IMPLEMENTED` (via `PATCH /applications/{id}`)
- **Method**: `PATCH`
- **Endpoint**: `/applications/{id}`
- **Request Body**: `{ "status": "Interviewing" }`
- **Success Response** (`200 OK`): Updated Application object.

### 1.6 Update Application Stage
- **Status**: `IMPLEMENTED` (via `PATCH /applications/{id}`)
- **Method**: `PATCH`
- **Endpoint**: `/applications/{id}`
- **Request Body**: `{ "stage": "Follow-up 1" }`
- **Success Response** (`200 OK`): Updated Application object.

### 1.7 Delete Application
- **Status**: `IMPLEMENTED`
- **Method**: `DELETE`
- **Endpoint**: `/applications/{id}`
- **Success Response** (`204 No Content`)

### 1.8 Application Resumes
- **Status**: `REQUIRED BACKEND ENDPOINT`
- **Endpoints**:
  - `GET /applications/{id}/resume`
  - `POST /applications/{id}/resume`
  - `GET /applications/{id}/resume/download`
- **Expected Response**:
  ```json
  {
    "id": "res_123",
    "fileName": "Aman_Resume_Frontend.pdf",
    "url": "/storage/resumes/res_123.pdf",
    "uploadedAt": "2026-08-01T10:00:00Z"
  }
  ```

---

## 2. Contacts API

### 2.1 List Contacts
- **Status**: `IMPLEMENTED`
- **Method**: `GET`
- **Endpoint**: `/contacts`
- **Success Response** (`200 OK`):
  ```json
  [
    {
      "id": "c_123",
      "name": "Sarah Jenkins",
      "company": "Stripe",
      "role": "Tech Recruiter",
      "email": "sarah@stripe.com",
      "phone": "+14158901234",
      "tags": "Recruiter, High Priority",
      "notes": "Spoke about UI role",
      "source": "application",
      "application_id": "app_123",
      "last_contacted": "2026-08-05",
      "responded": true
    }
  ]
  ```

### 2.2 Create Contact
- **Status**: `IMPLEMENTED`
- **Method**: `POST`
- **Endpoint**: `/contacts`
- **Request Body**:
  ```json
  {
    "name": "Alex Mercer",
    "company": "Vercel",
    "role": "Engineering Lead",
    "email": "alex@vercel.com",
    "phone": "",
    "tags": "Hiring Manager",
    "notes": "Met at conference"
  }
  ```
- **Success Response** (`201 Created`): Created ContactManual object.

### 2.3 Update Contact
- **Status**: `REQUIRED BACKEND ENDPOINT`
- **Method**: `PATCH`
- **Endpoint**: `/contacts/{id}`

### 2.4 Delete Contact
- **Status**: `REQUIRED BACKEND ENDPOINT`
- **Method**: `DELETE`
- **Endpoint**: `/contacts/{id}`

### 2.5 Mark Contact as Applied
- **Status**: `REQUIRED BACKEND ENDPOINT`
- **Method**: `POST`
- **Endpoint**: `/contacts/{id}/apply`
- **Request Body**: `{ "application_method": "Employee Referral" }`

---

## 3. Dashboard API

### 3.1 Get Dashboard Summary
- **Status**: `IMPLEMENTED`
- **Method**: `GET`
- **Endpoint**: `/dashboard/summary`
- **Success Response** (`200 OK`):
  ```json
  {
    "today_count": 5,
    "applications_today": 5,
    "goal": 25,
    "streak": 7,
    "funnel": {
      "Not Contacted": 6,
      "In Progress": 14,
      "Interviewing": 4,
      "Offer Received": 1,
      "Rejected": 5,
      "Ghosted": 3
    },
    "response_rate": 34,
    "interviews_count": 4,
    "offers_count": 1,
    "ghosted_count": 2
  }
  ```

### 3.2 Get Due Today Applications
- **Status**: `IMPLEMENTED`
- **Method**: `GET`
- **Endpoint**: `/dashboard/due-today`
- **Success Response** (`200 OK`): List of Application objects requiring action today.

### 3.3 Get Daily Report
- **Status**: `IMPLEMENTED`
- **Method**: `GET`
- **Endpoint**: `/dashboard/daily-report`
- **Success Response** (`200 OK`):
  ```json
  {
    "calls_dialed": 6,
    "calls_connected": 4,
    "applications_sent": 5,
    "method_breakdown": {
      "LinkedIn Easy Apply": 3,
      "Company Portal": 1
    },
    "interviews_attended": 1,
    "interviews_in_pipeline": 4
  }
  ```

---

## 4. Calendar API

### 4.1 List Calendar Events
- **Status**: `IMPLEMENTED`
- **Method**: `GET`
- **Endpoint**: `/calendar/events`
- **Query Parameters**:
  - `start` *(optional, string)*: ISO timestamp
  - `end` *(optional, string)*: ISO timestamp
- **Success Response** (`200 OK`): List of CalendarEvent objects.

### 4.2 Create Calendar Event
- **Status**: `IMPLEMENTED`
- **Method**: `POST`
- **Endpoint**: `/calendar/events`
- **Request Body**:
  ```json
  {
    "title": "Stripe Recruiter Screen",
    "event_type": "Interview",
    "date": "2026-08-12",
    "time": "10:00 AM",
    "notes": "Prep system design"
  }
  ```

### 4.3 Update Calendar Event
- **Status**: `IMPLEMENTED`
- **Method**: `PATCH`
- **Endpoint**: `/calendar/events/{id}`

### 4.4 Delete Calendar Event
- **Status**: `IMPLEMENTED`
- **Method**: `DELETE`
- **Endpoint**: `/calendar/events/{id}`

---

## 5. Analytics API

### 5.1 Get Analytics Overview
- **Status**: `IMPLEMENTED`
- **Method**: `GET`
- **Endpoint**: `/analytics/overview`
- **Query Parameters**: `range` (`7d`, `30d`, `90d`)
- **Success Response** (`200 OK`): Overview analytics metrics object.

---

## 6. Activity & Streak API

### 6.1 Create Activity Log
- **Status**: `IMPLEMENTED`
- **Method**: `POST`
- **Endpoint**: `/activity`
- **Request Body**:
  ```json
  {
    "application_id": "app_123",
    "company": "Stripe",
    "action_type": "Call Dialed",
    "notes": "Left voicemail"
  }
  ```

### 6.2 List Activity Log
- **Status**: `IMPLEMENTED`
- **Method**: `GET`
- **Endpoint**: `/activity`
- **Query Parameters**: `date` (`today` or `YYYY-MM-DD`)

### 6.3 Get Streak Data
- **Status**: `REQUIRED BACKEND ENDPOINT`
- **Method**: `GET`
- **Endpoint**: `/activity/streak`
- **Success Response**:
  ```json
  {
    "currentStreak": 7,
    "bestStreak": 14,
    "totalApplications": 33,
    "activeDays": 12,
    "todayCompleted": true,
    "last14Days": []
  }
  ```

---

## 7. Updates & Notifications API

### 7.1 List Notifications / Updates
- **Status**: `REQUIRED BACKEND ENDPOINT`
- **Method**: `GET`
- **Endpoint**: `/updates`

### 7.2 Mark Notification as Read
- **Status**: `REQUIRED BACKEND ENDPOINT`
- **Method**: `PATCH`
- **Endpoint**: `/updates/{id}/read`

---

## 8. Settings API

### 8.1 Get Settings
- **Status**: `IMPLEMENTED`
- **Method**: `GET`
- **Endpoint**: `/settings`
- **Success Response** (`200 OK`):
  ```json
  {
    "weekly_goal": 25,
    "daily_goal": 5,
    "working_hours_start": "09:00",
    "working_hours_end": "21:00",
    "telegram_chat_id": "",
    "dashboard_pin": ""
  }
  ```

### 8.2 Update Settings
- **Status**: `IMPLEMENTED`
- **Method**: `PATCH`
- **Endpoint**: `/settings`
- **Request Body**: Partial settings object.
- **Success Response** (`200 OK`): Updated Settings object.
