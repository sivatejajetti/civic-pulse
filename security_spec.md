# Security Specification: Community Hero Firestore Security

This specification outlines the data invariants, threat model, and security rules for the Community Hero municipal database.

## 1. Data Invariants

- **Read Access**: Open/VerVerified citizen reports can be read by anyone (since they are shown on the public map view).
- **Create Access**: Reports must contain valid fields, specific coordinate sizes, and a status initialized as `Open`.
- **Update Access (Standard User)**: Only `upvotes` can be incremented. Regular users are forbidden from modifying other fields like `status` or `description`.
- **Update Access (Admin)**: Municipal admins or authenticated municipal officers can modify the report's `status` (Open, Verifying, Resolved) or department.

---

## 2. The "Dirty Dozen" Payloads (Threat Matrix)

1. **Identity Spoofing**: Attempt to write a report with a spoofed creator ID.
2. **Status Shortcutting (Creation)**: Creating a report with status = `Resolved`.
3. **Status Shortcutting (Update)**: Standard user changing status directly to `Resolved`.
4. **Negative Upvotes**: Attempt to set upvotes to `-50`.
5. **Upvote Surge**: Standard user attempting to jump upvotes from `0` to `9999`.
6. **Denial of Wallet ID**: Creating a report with a document ID of 10KB length.
7. **Value Poisoning**: Updating the `status` field to an invalid string or boolean.
8. **Coordinates Poisoning**: Submitting lat/lng values that are extremely long strings (buffer exploit attempts).
9. **Department Overwriting**: Modifying the assigned municipal department without admin privileges.
10. **Timestamp Backdating**: Forcing a `createdAt` timestamp from 10 years ago instead of `request.time`.
11. **Immortal Field Update**: Modifying the original `createdAt` date on an existing report.
12. **PII Injection**: Attempting to inject a hidden plain-text email or address field into a public report.

---

## 3. Security Verification Plan

- Standard user is allowed to write standard reports with verified statuses.
- Standard user is permitted to upvote existing issues.
- Admins are allowed to update status to `Verifying` or `Resolved`.
- All other unauthorized or malformed payload modifications return `PERMISSION_DENIED`.
