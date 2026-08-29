# Educational Learning App for Children with Disabilities
## Comprehensive Specifications & Architecture Document

**Project Status:** Phase 0 - Specifications & Planning  
**Last Updated:** 2026-08-20  
**Version:** 0.1.0 (Draft)

---

## 1. Project Charter & Vision

### 1.1 Mission Statement
To create an accessible, scalable educational platform that empowers parents and educators to create personalized learning content for children with disabilities, using AI to accelerate content creation and providing comprehensive progress tracking.

### 1.2 Vision (Long-term, 2-5 years)
- A global platform supporting thousands of families across multiple countries
- Multi-language support (starting with French and English, expanding to Spanish, Ukrainian, etc.)
- Used by parents, educators, therapists, and special education programs
- Open-source model or affordably priced to reach developing countries
- Customizable for different disabilities and learning needs

### 1.3 Core Values
- **Child-Centered:** Every decision prioritizes the child's learning and dignity
- **Family-Focused:** Supports parents with limited time and resources
- **Accessible:** Designed for users with various disabilities and limitations
- **Privacy-First:** Strict data protection for minors
- **Scalable:** Built to grow from 1 family to 1 million families
- **Open & Inclusive:** Committed to serving underserved communities globally

### 1.4 Origin & Context
- **Founder:** Parent of a 15-year-old son (Arthur) with Down Syndrome
- **Current Situation:** Limited custody (4 nights every 4 weeks)
- **Motivation:** Need to maintain educational engagement between visits; vision to help families worldwide
- **Scope:** Eventually expand to Ukraine and other countries with high rates of childhood disability

---

## 2. User Personas

### 2.1 Primary User: Parent/Guardian
**Name:** Louis (example)
- **Age:** 40-60 years old
- **Tech Skill:** Moderate to advanced (can navigate web apps, create content)
- **Goals:**
  - Create personalized learning content for their child
  - Track progress when not physically present
  - Assign homework/activities
  - Use AI to save time on content creation
  - Maintain engagement between limited visits
- **Pain Points:**
  - Limited time with child (custody constraints)
  - Overwhelmed by existing educational platforms
  - Can't afford expensive tutoring or apps
- **Devices:** Desktop/laptop (primary admin access), mobile (check progress)

### 2.2 Secondary User: Child/Student
**Name:** Arthur (example)
- **Age:** 15 years old
- **Disability:** Down Syndrome
- **Tech Skill:** Basic to moderate (uses WhatsApp, Android phone)
- **Goals:**
  - Learn through engaging, clear content
  - Understand feedback and progress
  - Feel motivated and successful
- **Capabilities:**
  - Can tap buttons, swipe, type short responses
  - Needs large text, clear instructions
  - Benefits from visual content and immediate feedback
- **Device:** Android smartphone (primary interface)

### 2.3 Tertiary User: Co-Parent/Caregiver
**Name:** Mother of Arthur (example)
- **Role:** Secondary caregiver who can track progress
- **Goals:**
  - Monitor son's learning
  - Help with assignments
  - Communicate progress to other adults
- **Access Level:** Read-only or limited edit permissions

### 2.4 Future User: Educator/Therapist
**Name:** Special education teacher (future phase)
- **Role:** Works with multiple students in a classroom or therapy setting
- **Goals:**
  - Create content for class/group
  - Track multiple students' progress
  - Generate reports
- **Access Level:** Create content, manage multiple students, generate reports

---

## 3. Feature Specifications

### 3.1 MVP (Phase 1) - Core Features

#### 3.1.1 Web Admin Panel (Parent/Guardian)
**Purpose:** Content creation, assignment, and progress tracking

**Features:**
- User Authentication
  - Email/password login
  - Account profile management
  - Multi-language preference
  - Time zone selection

- Content Creation
  - Create assignments (multiple choice, fill-in-the-blank, image identification)
  - Edit/delete assignments
  - Organize by topic/subject
  - Manual content entry OR AI-generated content
  
- AI Content Generation
  - Input prompt (e.g., "Create a lesson on counting coins")
  - AI generates structured content (5 multiple choice questions, 3 fill-in-the-blank)
  - Review and edit AI output
  - Save to library
  
- Assignment Management
  - Assign content to specific students
  - Set due dates (optional)
  - View assignment status (not started, in progress, completed)
  - Reorder/reorganize assignments
  
- Progress Tracking Dashboard
  - Overall student statistics (completion rate, average score, trends)
  - Per-assignment breakdown (correct/incorrect, time spent)
  - Identify weak areas (questions student struggles with)
  - View specific responses (what did they answer, was it correct?)
  
- Reporting
  - Export progress as PDF/CSV
  - Visualize trends over time (charts/graphs)

#### 3.1.2 Mobile App (Student - Android)
**Purpose:** Complete assignments, learn, receive feedback

**Features:**
- User Authentication
  - Linked to parent account
  - Simple PIN or biometric login option
  - Auto-login after first session
  
- Assignment Feed
  - List of pending/new assignments
  - Visual progress indicators (completed, in progress)
  - Clear, large buttons for accessibility
  
- Assignment Interface
  - **Multiple Choice:** Radio buttons, clear question and answers
  - **Fill-in-the-Blank:** Text input field with context
  - **Image Identification:** Image display with answer options
  - Navigation (previous/next question)
  - Progress bar showing question position
  
- Feedback
  - Immediate feedback after each answer (correct/incorrect)
  - Positive reinforcement (badges, points, encouraging messages)
  - Educational hints (why answer is correct/incorrect)
  
- Accessibility Features
  - Large, readable fonts (configurable)
  - High contrast mode
  - Text-to-speech for questions
  - Simple, uncluttered interface
  
- Language Support
  - French as default (configurable to English, others)
  - All UI text in selected language
  - Content in selected language

#### 3.1.3 Backend API
**Purpose:** Serve data to web and mobile apps, handle AI integration

**Core Endpoints:**
- Authentication (login, logout, refresh token)
- User Management (profile, settings, language)
- Content (create, read, update, delete assignments)
- Assignments (create, assign to students, update status)
- Responses (submit answer, retrieve response history)
- Progress (calculate stats, fetch analytics)
- AI Integration (generate content)

---

### 3.2 Phase 2 Features (Future - 1 year+)
- Video lessons integration
- Audio narration of questions
- Gamification (leaderboards, achievements)
- Parent-child messaging within app
- Educator dashboard (manage multiple students)
- Advanced analytics and reporting
- Content library sharing between parents
- Integration with external LMS systems
- iOS app

### 3.3 Future Phases (2-5 years)
- Multi-language expansion (Spanish, Ukrainian, etc.)
- Customization for other disabilities (autism, cerebral palsy, etc.)
- Open-source community contributions
- Non-profit foundation/sustainability model
- Integration with government education systems

---

## 4. Data Model

### 4.1 Core Entities

```
User (Parents/Guardians)
├── id (UUID)
├── email (string, unique)
├── password_hash (string)
├── full_name (string)
├── language_preference (enum: 'en', 'fr', 'es', 'uk')
├── timezone (string)
├── created_at (timestamp)
├── updated_at (timestamp)
└── relationships:
    └── students (1:many)
    └── assignments (1:many)
    └── content (1:many)

Student (Children/Learners)
├── id (UUID)
├── user_id (FK → User)
├── full_name (string)
├── date_of_birth (date)
├── disability_type (string, optional: 'down_syndrome', 'autism', etc.)
├── language_preference (enum)
├── avatar_url (string, optional)
├── created_at (timestamp)
├── updated_at (timestamp)
└── relationships:
    └── assignments (1:many via student_assignments)
    └── responses (1:many)

Content (Lessons/Exercises)
├── id (UUID)
├── user_id (FK → User)
├── title (string)
├── description (text)
├── subject (string: 'math', 'literacy', 'life_skills', etc.)
├── difficulty_level (enum: 'easy', 'medium', 'hard')
├── language (enum)
├── content_type (enum: 'assignment')
├── is_ai_generated (boolean)
├── ai_prompt (text, if generated)
├── created_at (timestamp)
├── updated_at (timestamp)
└── relationships:
    └── questions (1:many)

Question (Individual items within content)
├── id (UUID)
├── content_id (FK → Content)
├── question_text (string)
├── question_type (enum: 'multiple_choice', 'fill_in_blank', 'image_id')
├── order (integer)
├── created_at (timestamp)
└── relationships:
    └── answers (1:many)
    └── responses (1:many)

Answer (Possible answers for questions)
├── id (UUID)
├── question_id (FK → Question)
├── answer_text (string)
├── image_url (string, for image identification)
├── is_correct (boolean)
├── order (integer)
├── explanation (text, optional: why this is correct/incorrect)
└── created_at (timestamp)

StudentAssignment (Assignment to student)
├── id (UUID)
├── student_id (FK → Student)
├── content_id (FK → Content)
├── assigned_at (timestamp)
├── due_date (date, optional)
├── status (enum: 'not_started', 'in_progress', 'completed')
├── started_at (timestamp, optional)
├── completed_at (timestamp, optional)
└── created_at (timestamp)

Response (Student's answer to a question)
├── id (UUID)
├── student_id (FK → Student)
├── question_id (FK → Question)
├── student_assignment_id (FK → StudentAssignment)
├── student_answer (string or UUID of selected answer)
├── is_correct (boolean)
├── response_time_seconds (integer)
├── answered_at (timestamp)
└── created_at (timestamp)
```

### 4.2 Schema Considerations
- **Multi-tenancy:** Each user (parent) has isolated data (students, content, assignments)
- **Audit Trail:** Track created_at, updated_at for compliance and debugging
- **Soft Deletes:** Consider soft-delete for data protection (GDPR)
- **Internationalization:** All text stored with language_code for multi-language support

---

## 5. System Architecture

### 5.1 High-Level Overview
```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  Web Admin Panel (Next.js)   │   │ Mobile App (React Native +   │
│  Parent: creates content,    │   │ Expo, Android → iOS later)   │
│  assigns, tracks progress    │   │ Student: completes homework  │
└──────────────┬───────────────┘   └──────────────┬───────────────┘
               │                                  │
               │   Supabase client SDK            │
               │   (Row Level Security enforced)  │
               ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                           SUPABASE                              │
│  ┌──────────────┐  ┌────────┐  ┌─────────┐  ┌────────────────┐  │
│  │  PostgreSQL  │  │  Auth  │  │ Storage │  │ Edge Functions │  │
│  │  (data, RLS) │  │        │  │ (images)│  │ (AI calls,     │  │
│  │              │  │        │  │         │  │ sensitive      │  │
│  │              │  │        │  │         │  │ logic)         │  │
│  └──────────────┘  └────────┘  └─────────┘  └───────┬────────┘  │
└─────────────────────────────────────────────────────┼───────────┘
                                                      │
                                             ┌────────▼─────────┐
                                             │   Claude API     │
                                             │  (content gen)   │
                                             │ Future: image AI │
                                             └──────────────────┘
```

**Key principle:** No separate API server. Both apps talk directly to Supabase; PostgreSQL Row Level Security guarantees each family only sees its own data. Edge Functions handle anything that must not run on the client (AI API keys, answer validation where cheating matters, setup-code generation).

### 5.2 Component Details

#### 5.2.1 Frontend (Web Admin Panel)
- **Framework:** Next.js (React)
- **Purpose:** Content creation, assignment management, progress tracking
- **Key Pages:**
  - Dashboard (overview of students and progress)
  - Content Library (view/create/edit content)
  - AI Content Generator (input prompt, review AI output)
  - Assignments (assign content, manage)
  - Progress Analytics (detailed student tracking)
  - Settings (language, timezone, preferences)
- **Deployment:** Vercel or self-hosted

#### 5.2.2 Mobile App (Android)
- **Framework:** React Native + Expo (decided — enables future iOS from same codebase, over-the-air updates)
- **Purpose:** Student completes assignments
- **Key Screens:**
  - Login/Authentication
  - Assignment Feed
  - Question Display (multiple choice, fill-in-blank, image ID)
  - Feedback/Results
  - Settings (language, accessibility)
- **Deployment:** Google Play Store

#### 5.2.3 Backend (Supabase-only — decided)
- **No standalone API server.** Apps use the Supabase client SDK directly.
- **PostgreSQL + Row Level Security (RLS):** All access rules enforced at the database level — each parent sees only their own students/content; each student device sees only its own assignments.
- **Edge Functions (TypeScript/Deno)** for logic that cannot run on the client:
  - AI content generation (holds the Claude API key)
  - Student device linking (setup-code generation and validation)
  - Progress aggregation where needed
- **Database functions/triggers** for derived data (e.g., auto-update assignment status when all questions answered).

#### 5.2.4 AI Integration
- **Content Generation:** Claude API (via Edge Function)
  - Parent provides prompt: "Create a lesson on fractions"
  - Claude generates structured JSON with questions
  - Content saved as **draft**; parent reviews, edits, and explicitly publishes before it can be assigned (mandatory review — decided)
  - A/B testing of models/providers during testing phase
- **Image Generation:** Phase 2. MVP uses parent-uploaded photos and free stock images (real photos of familiar objects are often better for learners with Down Syndrome)
- **Fallback:** Manual content creation when AI not needed

#### 5.2.5 Database (Supabase)
- **PostgreSQL:** Core relational database
- **Storage Buckets:** Images (questions, answers, avatars)
- **Realtime:** Optional for future collaboration features
- **Auth:** Built-in Supabase Auth (email/password)

---

## 6. Security & Privacy

### 6.1 Data Protection
- **GDPR Compliance:** Child data protection (minors under 16)
- **Encryption:** All data in transit (HTTPS), at rest (Supabase encryption)
- **Access Control:** 
  - Parents can only access their own students' data
  - Students can only see their own assignments
  - Implement role-based access control (RBAC)
- **Data Retention:** Define retention policy (e.g., keep for 5 years, then anonymize)

### 6.2 Authentication & Authorization
- **Two-Factor Authentication (2FA):** Optional for parent accounts
- **Session Management:** Auto-logout after inactivity
- **API Security:** JWT tokens, API rate limiting
- **Mobile App Security:**
  - Secure storage of credentials (no storing passwords)
  - Biometric auth support (fingerprint, face recognition)

### 6.3 Audit & Logging
- **Activity Logging:** Track who created/modified content
- **Error Logging:** Capture and monitor errors
- **Security Monitoring:** Alert on suspicious activity

### 6.4 Third-Party Integrations
- **Claude API:** Secure API key storage (environment variables)
- **DALL-E/OpenAI:** Future integration security plan
- **No data sharing:** Third-party services don't store student data

---

## 7. Accessibility & Internationalization

### 7.1 Accessibility (WCAG 2.1 AA Standard)
**For Students:**
- Large, readable fonts (16px+ minimum, configurable to 24px+)
- High contrast mode (dark mode, high contrast text)
- Text-to-speech for questions
- Simplified UI (no animations, clear navigation)
- Keyboard navigation support
- Color not the only indicator (use icons + text)

**For Parents:**
- Standard web accessibility
- Responsive design (mobile, tablet, desktop)
- Screen reader support

### 7.2 Internationalization (i18n)
**Phase 1:**
- English (en) and French (fr) as default
- Language selector in UI
- All strings in translation files (not hardcoded)
- Date/time localization

**Phase 2:**
- Add Spanish (es)
- Ukrainian (uk)
- Other languages as needed

**Implementation:**
- Use i18n library (e.g., next-i18next for React)
- Separate language files (.json or .yml)
- Content database supports language_code field
- User language preference stored in profile

---

## 8. Tech Stack

### 8.1 Confirmed Stack (decided 2026-08-21)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend (Web)** | Next.js + React + TypeScript | Modern, fast, good for real-time dashboards |
| **Frontend (Mobile)** | React Native + Expo (TypeScript) | One codebase for Android + future iOS; over-the-air updates; same language as web |
| **Backend** | Supabase Edge Functions (TypeScript/Deno) | No server to maintain; only for AI calls and sensitive logic — everything else via Supabase client + RLS |
| **Database** | Supabase (PostgreSQL + Row Level Security) | Familiar to user, built-in auth, real-time |
| **Authentication** | Supabase Auth | Integrated, secure; child devices use setup-code linking + optional PIN |
| **File Storage** | Supabase Storage | Simple, integrated with DB; question/answer images, avatars |
| **AI Content** | Claude API (Anthropic) | High quality structured content; A/B test alternatives in testing phase |
| **Images (exercises)** | Parent uploads + free stock (Unsplash/Pexels); AI generation Phase 2 | Real photos work well for target learners; simpler MVP |
| **Deployment** | Vercel (web), Google Play (mobile), Supabase (DB + functions) | Scalable, serverless |
| **Monitoring** | Sentry | Error tracking and performance |

### 8.2 Development Tools
- **Version Control:** Git + GitHub
- **IDE:** VS Code
- **Testing:** Jest (unit), Cypress/Playwright (e2e)
- **CI/CD:** GitHub Actions
- **Documentation:** Markdown in repo + API docs (Swagger/OpenAPI)

### 8.3 Cost Estimate (Monthly, at scale - 1000 families)
- Supabase: ~$100-300/month
- Vercel: ~$20/month
- Claude API: ~$50-100/month (depending on usage)
- Domain + misc: ~$20/month
- **Total:** ~$200-500/month for 1000 active families

---

## 9. Development Roadmap

### 9.1 Phase 0: Specifications & Architecture (Current)
**Duration:** 4-6 weeks  
**Deliverables:**
- Finalized specifications document (this file)
- Database schema (PostgreSQL)
- API endpoint documentation
- UI mockups/wireframes
- Architecture diagrams
- Security & privacy review

**Owner:** Co-design with parent/user

### 9.2 Phase 1: MVP Development
**Duration:** 8-12 weeks  
**Deliverables:**
- Supabase project (schema, RLS policies, Edge Functions)
- Web Admin Panel (basic)
- Android Mobile App (basic)
- AI integration (Claude API)
- Authentication system
- Progress tracking system

**Testing:** Internal testing with Arthur, parent feedback

**Launch:** For Arthur's use only (private beta)

### 9.3 Phase 1.5: Polish & Testing
**Duration:** 4-6 weeks  
**Deliverables:**
- Bug fixes and UX improvements
- Accessibility audit and fixes
- Performance optimization
- Security audit
- Comprehensive documentation

### 9.4 Phase 2: Community & Scaling
**Duration:** 12+ weeks (Next year)  
**Deliverables:**
- iOS app development
- Educator/multi-student dashboard
- Video lesson support
- Gamification features
- Community content library
- Internationalization (Spanish, Ukrainian)
- Beta testing with 10-20 families

### 9.5 Phase 3: Global Launch (2-3 years)
**Deliverables:**
- Public release
- Sustainability model (pricing, non-profit, open-source)
- Documentation for translation/localization
- Training materials for educators
- Government partnership exploration (Ukraine, etc.)

---

## 10. Assumptions & Constraints

### 10.1 Assumptions
- Arthur can read and write at a basic level
- Arthur has reliable internet access and Android phone
- Parent is tech-savvy (40+ years coding experience)
- Content can be manually created or generated by AI
- Supabase is the right database choice (user preference)
- English code, multi-language UI
- Claude API is available and reliable

### 10.2 Constraints
- **Time:** Parent has limited time (4 nights/4 weeks)
- **Budget:** No developer team (solo build with AI assistance)
- **Scope:** MVP focused on Arthur's needs, design for future scale
- **Timeline:** Development will take several months (no rush)

---

## 11. Architecture Decisions (Resolved 2026-08-21)

All foundational questions have been resolved with the project owner:

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | **Mobile Framework** | React Native + Expo | One TypeScript codebase for Android + future iOS; same language as web admin; over-the-air updates reach Arthur's phone without Play Store delays or physical presence |
| 2 | **Backend** | Supabase-only | Direct client access with Row Level Security + Edge Functions for AI calls and sensitive logic. No server to maintain, near-zero cost at MVP scale, owner already proficient |
| 3 | **Images for exercises** | Uploaded photos + free stock (MVP); AI generation in Phase 2 | Real photos of concrete, familiar objects are often more effective for learners with Down Syndrome; keeps MVP simpler and cheaper |
| 4 | **AI content review** | Mandatory parent review | AI-generated content always lands as `draft`; parent must review and explicitly publish before it can be assigned. Nothing unreviewed ever reaches the child |
| 5 | **Offline support** | Online-only (MVP) | Arthur has reliable connectivity. Answer submission includes a retry queue for brief network hiccups (standard practice, not offline architecture). Full offline support reconsidered in Phase 2 |
| 6 | **Business model** | Deferred | No billing/plan concepts in MVP. Schema stays clean and multi-tenant so plans/quotas can be added later without restructuring |
| 7 | **Child login** | One-time setup code + optional PIN | Parent generates a short link code in the admin panel; entered once on the child's phone, the app stays logged in, optionally protected by a simple 4-digit PIN. No email/password for the child |
| 8 | **Co-parent access** | Not in MVP, designed for | Single parent account in MVP. Data model includes roles/account-membership from day one so invited read-only caregivers become a small Phase 2 feature, not a redesign |
| 9 | **Data export** | Required (GDPR) | Parents can export all their data. Implemented by Phase 1.5 at the latest |
| 10 | **Curriculum alignment (Resolved 2026-08-29)** | Tag content with an optional French Éduscol *cycle* (`cycle_1`–`cycle_4`) + free-text *domaine*, chosen by the parent per lesson — never derived from `students.date_of_birth` | Éduscol cycles (see `DATABASE_SCHEMA.md` §3.7) are the standard reference for French K-12 content, so tagging against them lets a parent gauge where a lesson sits nationally and gives the AI a concrete complexity/vocabulary target. But Decision 3 already establishes the target learner as a teenage learner with Down Syndrome — instructional level and chronological age diverge for this population, so the tag must stay a parent-chosen label, not an age-computed default. The 2025 Socle commun rewrite (in progress at CSP as of this writing) is a further reason to keep it a loose reference tag rather than a hard-coded, versioned mapping to official text |
| 11 | **Assessment item standard (Resolved 2026-08-29)** | Model `questions`/`question_options` after IMS **QTI 3.0**'s item shape (prompt = item body, options = choice interactions, `is_correct` = response declaration, `hint`+`explanation` = feedback) without adopting full QTI XML or claiming interoperability | Gets the benefit of a well-tested item model (question/choices/correct-response/feedback is exactly QTI's `assessmentItem`) without the overhead of XML authoring or an LMS-interop requirement we don't have (single-app platform, not an LMS — see deferred item below). If content ever needs to be exported to another platform, the field mapping to QTI is straightforward because the shape already matches |

### Deferred standards review (flagged 2026-08-29, not yet resolved)

Researched alongside Decisions 10–11 above; intentionally **not** decided yet — each needs its own focused pass before it lands in the schema:
- **Child data & privacy law** (GDPR-K consent age in France is 15, not the EU default 16; COPPA if the US market is ever added) — touches the `families`/`profiles`/consent flow directly, should be scoped together with Decision 9 (data export) rather than bolted on separately.
- **Accessibility (WCAG 2.2 AA)** — applies to the Next.js admin panel and the React Native app's own UI (contrast, text alternatives, focus order); most useful once there is real UI to audit against, not at the wireframe stage. `design/` wireframes should still be reviewed against WCAG contrast/target-size guidance before build.
- **Interoperability packaging (SCORM/xAPI/full QTI export)** — no near-term need (this is a closed single-family app, not an LMS others plug content into); Decision 11 already keeps the door open by shaping the item model QTI-compatibly.

### Earlier Decisions:
- ✅ Tech Stack: Supabase + Next.js + React Native (Expo)
- ✅ Languages: English code, French + English UI (Phase 1)
- ✅ AI: Claude API for content generation (A/B test alternatives during testing phase)
- ✅ Scope: MVP with multiple choice, fill-in-blank, image ID
- ✅ Timeline: Take time for proper foundation (4-6 weeks specs, then development)

---

## 12. Success Criteria (Phase 1)

### For Arthur:
- Completes at least 2 assignments per week
- Shows understanding of feedback
- Engagement increases over 8 weeks
- No technical friction (app is easy to use)

### For Parent:
- Can create content in <15 minutes
- AI generates useful content (saves time)
- Progress tracking is clear and actionable
- Feels connected to Arthur's learning despite limited time

### For Platform:
- Zero data breaches or privacy violations
- 99% uptime
- Performance is fast (<2 second load times)
- Fully accessible for disabled users

---

## Next Steps

1. **Review & Feedback** - Parent reviews this spec and provides feedback
2. **Detail Design** - Deep dive into each section with questions
3. **Database Schema** - Create detailed PostgreSQL schema
4. **API Documentation** - Document all endpoints
5. **UI Wireframes** - Sketch out screens and flows
6. **Development Plan** - Create detailed sprint-by-sprint plan

**Ready to dive deeper into any section?**
