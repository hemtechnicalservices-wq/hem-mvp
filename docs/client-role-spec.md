# H.E.M Client App - Complete Specification

## Purpose
The client application allows customers to request property maintenance services, track job progress, approve quotes, pay invoices, and manage service history.

## Main Navigation (Bottom Menu)
- Home
- Services
- My Jobs
- Invoices
- Profile

## 1. Home Screen
Displays:
- Company logo
- Notification icon
- Profile icon
- Welcome message
- Quick actions: New Request, My Jobs, Invoices
- Service categories grid
- AMC promotion banner

## 2. Services Screen
Each service category shows:
- Service name
- Service icon
- Short description
- Choose issue button

Service list:
- AC Services
- Electrical Services
- Plumbing Services
- Painting Services
- Handyman Services
- Jet Washing Services
- General Property Maintenance

## 3. Service Issue Selection
After category selection, client chooses issue.

### AC Services
- AC not cooling
- AC leaking water
- AC noisy
- AC bad smell
- AC thermostat problem
- AC maintenance service
- AC installation
- AC gas refill
- AC filter cleaning

### Electrical
- Light not working
- Socket not working
- Breaker keeps tripping
- Electrical burning smell
- Water heater electrical issue
- Switch replacement
- Electrical wiring issue
- Fan installation

### Plumbing
- Leak under sink
- Blocked drain
- Toilet flushing problem
- Shower leak
- Water heater leak
- Low water pressure
- Pipe repair
- Faucet replacement

### Painting
- Wall painting
- Ceiling painting
- Crack repair and paint
- Touch up painting
- Full room painting
- Full apartment painting

### Handyman
- TV mounting
- Curtain installation
- Shelf installation
- Door handle repair
- Furniture assembly
- Lock replacement

### Jet Washing
- Balcony washing
- Driveway washing
- Outdoor tiles washing
- Parking washing
- Villa exterior washing

### General Maintenance
- Property inspection
- Minor repairs
- Preventive maintenance
- Multiple issues visit

## 4. New Service Request Form
Fields:
- Service category
- Issue type
- Problem description
- Media upload (photos/videos)
- Address
- Building/villa name
- Apartment number
- Area
- Parking instructions
- Preferred date
- Preferred time
- ASAP option
- Phone number
- WhatsApp number

## 5. Request Confirmation
Shows:
- Request ID
- Service type
- Issue type
- Submission date
- Status (Pending review)

Actions:
- View request details
- Cancel request
- Add more photos or notes

## 6. Request Status Tracking Timeline
Stages:
- Request received
- Quote prepared
- Quote approved
- Technician assigned
- Technician on the way
- Job in progress
- Job completed
- Invoice generated
- Payment completed

## 7. My Jobs Screen
Each job card shows:
- Job ID
- Service type
- Address
- Assigned technician
- Scheduled date/time
- Job status
- Payment status

Statuses:
- Pending review
- Waiting quote
- Scheduled
- Technician assigned
- On the way
- In progress
- Completed
- Cancelled

## 8. Job Details Screen
Includes:
- Job ID
- Service category
- Issue type
- Problem description
- Address
- Scheduled time
- Technician details
- Timeline with timestamps
- Photos section
- Notes section

## 9. Quote Approval
Quote details:
- Inspection fee
- Labor cost
- Materials estimate
- Discount
- Total price

Actions:
- Approve quote
- Reject quote

## 10. Technician Status Tracking
Shows:
- Technician name
- Technician phone
- Technician status

Statuses:
- Assigned
- On the way
- Arrived
- In progress

## 11. Invoice Screen
Shows:
- Invoice ID
- Job ID
- Service type
- Labor charges
- Materials charges
- Discount
- Total amount
- Payment status
- Due date

Actions:
- Pay invoice
- Download invoice PDF
- View payment history

## 12. Payments
Stripe methods:
- Credit card
- Apple Pay
- Google Pay

Payment statuses:
- Paid
- Pending
- Failed
- Overdue

## 13. AMC Plans
- Basic Plan: Two visits/year, priority support
- Standard Plan: Four visits/year, repair discount
- Premium Plan: Unlimited visits, priority scheduling, preventive maintenance

Actions:
- View details
- Purchase
- Renew

## 14. Client Profile
Fields:
- Name
- Phone number
- Email

Addresses:
- Primary address
- Additional properties

Account options:
- Edit profile
- Add address
- Delete address
- Change password
- Logout

## 15. Notifications
- Request received
- Quote ready
- Job scheduled
- Technician assigned
- Technician on the way
- Job completed
- Invoice generated
- Payment confirmation

## 16. Client Job History
Each record:
- Service type
- Job date
- Technician name
- Total cost
- Status

Actions:
- Download invoice
- Request same service again
- Rate technician

## 17. Client Rating System
- Star rating
- Service quality feedback
- Technician professionalism feedback
- Optional comment
