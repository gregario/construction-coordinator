# Privacy Policy — Construction Manager

**Last updated:** [DATE]

## 1. What We Collect

We collect only the data necessary to provide the service:

| Data | Purpose | Required? |
|------|---------|-----------|
| Email address | Account authentication, service notifications | Yes |
| Password (hashed) | Account authentication | Yes |
| Project data (stages, tasks, materials, durations, dates, costs, notes) | Core scheduling functionality | Yes — to use the service |
| Trade contact information (names, phone numbers, emails) | Display within your project for your reference | Optional — user-entered |
| Photos and documents | Attachment to project stages and tasks | Optional — user-uploaded |
| Push notification token | Delivering deadline and schedule notifications | Optional — requires consent |

**We do not collect:** location data, device identifiers, browsing history, analytics cookies, or any data beyond what is listed above.

## 2. Why We Collect It (Legal Basis)

Under GDPR, we process your data on these legal bases:

- **Contractual necessity** (Article 6(1)(b)): Email, password, and project data are required to provide the service you signed up for.
- **Consent** (Article 6(1)(a)): Push notification tokens are collected only with your explicit opt-in consent, which you can withdraw at any time in Settings.

## 3. How We Store It

- **Database:** Supabase (PostgreSQL), hosted in the EU region. Data encrypted at rest (AES-256) and in transit (TLS 1.3).
- **File storage:** Supabase Storage (for photos and documents), same EU hosting and encryption.
- **Hosting:** Vercel, with data processing governed by Vercel's GDPR Data Processing Agreement.
- **Authentication:** Supabase Auth. Passwords are hashed using bcrypt. We never store or have access to plaintext passwords.

## 4. Who Can Access It

- **You:** Full access to all your project data via the service and the export feature.
- **Our team:** Access limited to service maintenance and support, on a need-to-access basis.
- **Third-party processors:**

| Processor | Purpose | DPA |
|-----------|---------|-----|
| Supabase | Database, auth, file storage | GDPR DPA available |
| Vercel | Application hosting and CDN | GDPR DPA available |

We do not sell, rent, or share your personal data with any other third parties.

## 5. How Long We Keep It

| Data | Retention |
|------|-----------|
| Account data (email) | Until you delete your account + 30 days |
| Project data | Until you delete the project or your account + 30 days |
| Photos and documents | Until you delete them or your account + 30 days |
| Push notification tokens | Until you revoke consent or delete your account |
| Encrypted backups | Up to 90 days after deletion |

After the retention period, data is permanently deleted from all systems including backups.

## 6. Your Rights (GDPR)

As an EU/EEA resident, you have the right to:

- **Access:** Request a copy of all personal data we hold about you.
- **Rectification:** Correct inaccurate personal data.
- **Erasure ("Right to be forgotten"):** Request deletion of your personal data. You can do this by deleting your account in Settings.
- **Data portability:** Export your data in a structured, machine-readable format. The built-in export feature (JSON and CSV) provides this.
- **Restriction:** Request that we limit processing of your data.
- **Objection:** Object to processing based on legitimate interest.
- **Withdraw consent:** Withdraw consent for push notifications at any time in Settings.

To exercise any of these rights, contact us at [CONTACT EMAIL]. We will respond within 30 days.

You also have the right to lodge a complaint with the Irish Data Protection Commission (DPC) at www.dataprotection.ie.

## 7. Trade Contact Information

When you add trade/subcontractor contact details (names, phone numbers, emails) to your project, this is personal data of third parties that you are entering for your own project management purposes. This data is stored within your project and is not shared with, visible to, or accessible by anyone other than you (and anyone you share read-only access with in the future).

This processing is analogous to storing contacts in a personal address book and falls under the household exemption (Article 2(2)(c) GDPR) as it relates to the management of your personal residential construction project.

## 8. Cookies and Tracking

Construction Manager uses only essential cookies:

| Cookie | Purpose | Duration | Type |
|--------|---------|----------|------|
| Auth session token | Maintain your login session | Session / 7 days | Essential |
| CSRF token | Security protection | Session | Essential |

We do not use analytics cookies, tracking pixels, advertising cookies, or any third-party tracking scripts. No separate cookie policy is required as we use only essential cookies that do not require consent under GDPR.

## 9. Children

Construction Manager is not directed at children. You must be at least 16 years old to create an account. We do not knowingly collect personal data from anyone under 16. If we learn that we have collected data from a child under 16, we will delete it promptly.

## 10. International Transfers

Your data is processed within the EU (Supabase EU region). Where data may be processed outside the EU (Vercel CDN edge nodes), this is covered by Standard Contractual Clauses (SCCs) included in our processor agreements.

## 11. Changes to This Policy

We will notify you of material changes to this privacy policy via email at least 30 days before they take effect. The "Last updated" date at the top indicates the most recent revision.

## 12. Contact

**Data Controller:** [YOUR NAME / ENTITY]
**Email:** [CONTACT EMAIL]
**Supervisory Authority:** Data Protection Commission, 21 Fitzwilliam Square South, Dublin 2, Ireland — www.dataprotection.ie
