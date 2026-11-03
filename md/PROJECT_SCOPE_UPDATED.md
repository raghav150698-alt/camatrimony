# Project Scope Document

## Project Overview
This project is a custom professional matrimony website focused first on CA professionals, while allowing other professionals to register and search. It will replace the existing Google Form style process with a complete web platform.

## In Scope

### Public Website
- Home page
- About page
- How it works page
- Membership plans page
- Register page
- Login page
- Success stories page
- Contact/support page
- Privacy policy
- Terms and conditions
- Refund policy

### Authentication
- Google login using Firebase
- Mobile OTP login using Firebase
- Backend token verification
- User role and status management

### User Profile
- Multi-step profile registration
- Candidate basic details
- Education and profession details
- Family details
- Partner preferences
- Profile managed by self/parents/sibling/relative
- Profile edit page
- Profile completion percentage

### Uploads
- Minimum 2 and maximum 10 profile photos
- Government proof upload
- Education proof upload
- Storage through Cloudflare R2 (Zero Egress Object Storage)
- Admin approval/rejection of uploads

### Verification
- Profile verification workflow
- Document review by admin
- Verified badge
- Rejection reason support
- Suspension support

### Packages and Payments
- Admin package CRUD
- Male paid access
- Female 3 months free access
- Razorpay order creation
- Razorpay payment callback handling
- Razorpay webhook verification
- Payment history
- Maidan service add-on at package + ₹500

### Contact Unlock System
- Contact view limit based on package
- Unlock contact button
- Contact unlock history
- Remaining contact count
- Avoid duplicate deduction for already-unlocked profiles
- Admin manual contact limit adjustment

### Profile Discovery
- Profile listing
- Advanced filters
- Our Suggestions section
- Admin manual suggestions
- Profile detail page
- Verified/recent/profession priority sorting

### Chat
- One-to-one text chat
- Package-based chat access
- Report/block profile support
- No image/video/file sharing in MVP

### Reports and Moderation
- Report profile flow
- Report reasons
- Admin report dashboard
- Admin resolution actions
- Suspend/delete/warn profile

### Support
- WhatsApp chat button
- Call button
- Live chat integration placeholder/configuration
- Support contact form
- Admin support settings

### Admin Panel
- Dashboard overview
- User management
- Profile management
- Verification management
- Photo/document review
- Package management
- Payment management
- Contact unlock history
- Reports management
- Support requests
- Admin/staff management
- Roles and permissions
- **Website content settings (including dynamic Project Logo changes)**

## Out of Scope for MVP
These features are not included unless separately approved:
- Native Android app
- Native iOS app
- Video calling
- Audio calling
- AI-based horoscope matching
- Full astrology engine
- Automatic PAN/Aadhaar verification API
- KYC provider integration
- Multi-language website
- Advanced AI matchmaking
- Image/video chat attachments
- Bulk email marketing system
- CRM integration
- WhatsApp Business API automation
- Mobile push notifications
- Advanced analytics dashboard

## Assumptions
- Client will provide brand logo, colors, content, support numbers, policies, and package details.
- Razorpay account will be provided by the client.
- Firebase project access will be available.
- Cloudflare account access will be available for hosting, database, and storage setup.
- Government ID documents will be manually verified by admin in MVP.
- Live chat can initially be a third-party widget or contact/support system.

## Deliverables
- Frontend web application
- Backend API / Edge functions
- Cloudflare D1 (SQL) database schema and migrations
- Admin panel
- Razorpay integration
- Firebase authentication integration
- Cloudflare R2 object storage upload integration
- Deployment setup for Cloudflare Ecosystem (Pages, Workers)
- Documentation files
- Testing checklist

## Success Criteria
- Users can register and create complete profiles.
- Men are required to pay for premium access.
- Women get first 3 months free.
- Admin can verify/suspend/delete profiles.
- Razorpay payment activates package only after webhook verification.
- Contact unlock limit works correctly.
- Search and suggested profiles work.
- Admin can control packages and users.
- Photos/documents are securely stored in Cloudflare R2 object storage.
- Project logo can be updated dynamically via the admin panel.
