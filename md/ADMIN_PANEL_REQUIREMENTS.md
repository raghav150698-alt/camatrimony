# Admin Panel Requirements

## Admin Panel Goal
The admin panel must allow the client to control almost everything without developer support.

## Admin Roles

### Super Admin
- Full access to everything.
- Can create/edit/delete admins.
- Can manage system settings.

### Admin
- Can manage users, profiles, packages, payments, reports, and support.
- Cannot delete super admin.

### Verification Team
- Can review profiles, photos, and documents.
- Can approve/reject verification.

### Support Team
- Can view support requests and user details needed for support.
- Cannot modify packages/payments unless allowed.

## Dashboard
Show cards for:
- Total users
- Male users
- Female users
- Active paid users
- Women free trial users
- Pending verifications
- Pending photo approvals
- Pending document approvals
- Successful payments
- Failed payments
- Open reports
- Open support requests

## User Management
Admin can:
- Create user manually
- Search users by name, email, mobile, profile ID
- Filter by gender/status/package/verification
- Edit user account details
- Edit profile details
- Suspend user
- Restore user
- Soft delete user
- Change user role
- Assign/change package
- Adjust contact limit
- View contact unlock history
- View payment history
- View report history

## Profile Management
Admin can:
- View all profiles
- Edit any profile field
- Approve profile
- Reject profile with reason
- Suspend profile
- Delete profile
- Mark profile as featured/recommended if needed
- View profile completion
- View profile managed by status

## Photo Management
Admin can:
- View pending photos
- Approve photo
- Reject photo with reason
- Delete inappropriate photo
- Set photo visibility

Rules:
- Public users see only approved photos.
- Max 10 photos per profile.
- Minimum 2 photos before profile submission.

## Document Verification
Admin can:
- View uploaded government proof
- View education proof
- Approve/reject documents
- Add rejection reason
- Mark profile verified after checks

Security:
- Documents should be private.
- Only authorized admin roles can view documents.

## Package Management
Admin can create/edit/delete/enable/disable packages.

Package fields:
- Name
- Description
- Price
- Validity days/months
- Contact view limit
- Chat access
- Suggestions access
- Gender availability
- Profession availability
- Maidan add-on allowed
- Free package yes/no
- Active/inactive

## Payment Management
Admin can:
- View all Razorpay orders/payments
- Search by user/order/payment ID
- Filter by status/date/package
- See webhook status
- See package activation status
- Export payments if needed later

Admin should not manually mark Razorpay payment successful without clear manual override logging.

## Contact Unlock Management
Admin can:
- View who unlocked whose contact
- See unlock date/time
- See remaining contact count of users
- Manually increase/decrease contact limits
- Audit all manual changes

## Suggestions Management
Admin can:
- Manually suggest profiles to a user
- Remove manual suggestion
- Add internal note
- View algorithmic suggestion summary if available

## Reports Management
Admin can:
- View open/in-review/resolved/dismissed reports
- Filter by reason
- View reporter and reported profile
- View related chat if report is chat-related
- Mark as resolved
- Dismiss report
- Suspend reported user
- Warn user
- Add internal admin note

## Chat Moderation
MVP rule:
- Admin does not need to view every chat by default.
- Admin can view reported chat messages for moderation.

Admin can:
- View reported chat
- Block chat
- Suspend user if needed

## Support Management
Admin can:
- View support requests
- Assign to support team member
- Update status
- Add internal notes
- Close request

## Staff/Admin Management
Super admin can:
- Create admin/support/verification staff
- Edit role
- Suspend staff account
- Delete staff account
- Reset access if required

## Website Content Management
Admin can manage:
- **Project Logo (Upload/Update dynamic global logo across the platform)**
- Homepage banners/text
- About page content
- Success stories
- FAQ
- Terms and conditions
- Privacy policy
- Refund policy
- Support phone
- WhatsApp number
- Support email
- Live chat widget code/configuration

## Audit Logging
Every important admin action must be logged:
- User edited
- Profile verified/rejected/suspended
- Package changed
- Contact limit changed
- Payment manually adjusted
- Admin/staff created or deleted

Audit log should store:
- Admin user
- Action
- Entity type
- Entity ID
- Before/after data if possible
- Timestamp
