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
┌─────────────────────────────────────────────────┐
│         Web Admin Panel (React/Next.js)         │
│  (Parent creates content, tracks progress)      │
└────────────────────┬────────────────────────────┘
                     │
                     │ HTTPS REST API
                     │
┌────────────────────▼────────────────────────────┐
│    Backend API (Node.js/Express)                │
│  - Authentication                               │
│  - Content Management                           │
│  - Assignment Tracking                          │
│  - AI Integration (Claude API)                  │
└────────────────┬────────────────────┬───────────┘
                 │                    │
        ┌────────▼────────┐   ┌───────▼──────────┐
        │   Supabase      │   │   Claude API     │
        │   (PostgreSQL)  │   │  (Content Gen)   │
        │   (Storage)     │   │                  │
        │   (Auth)        │   │  (Future: DALL-E)│
        └─────────────────┘   └──────────────────┘
                 │
        ┌────────▼────────┐
        │   File Storage  │
        │  (Images, etc)  │
        └─────────────────┘
                 │
        ┌────────▼────────────────────────────────┐
        │  Mobile App (React Native/Android)      │
        │  (Student completes assignments)        │
        └─────────────────────────────────────────┘
```

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
- **Framework:** React Native or Kotlin (Android-native)
- **Purpose:** Student completes assignments
- **Key Screens:**
  - Login/Authentication
  - Assignment Feed
  - Question Display (multiple choice, fill-in-blank, image ID)
  - Feedback/Results
  - Settings (language, accessibility)
- **Deployment:** Google Play Store

#### 5.2.3 Backend API
- **Framework:** Node.js + Express (or similar)
- **Database:** Supabase (PostgreSQL)
- **Key Responsibilities:**
  - User authentication (JWT tokens)
  - CRUD operations for content, assignments, responses
  - Business logic (calculate progress, validate answers)
  - AI integration (call Claude API for content generation)
  - File storage coordination (images, etc.)
- **Deployment:** Supabase Edge Functions or self-hosted (Docker)

#### 5.2.4 AI Integration
- **Content Generation:** Claude API (GPT-4 or latest model)
  - Parent provides prompt: "Create a lesson on fractions"
  - Claude generates structured JSON with questions
  - Parent reviews and saves to database
- **Image Generation (Future):** DALL-E or similar
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

### 8.1 Recommended Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend (Web)** | Next.js + React + TypeScript | Modern, fast, good for real-time dashboards |
| **Frontend (Mobile)** | React Native (Expo) or Kotlin | Cross-platform or native Android |
| **Backend** | Node.js + Express + TypeScript | Matches frontend, good ecosystem |
| **Database** | Supabase (PostgreSQL) | Familiar to user, built-in auth, real-time |
| **Authentication** | Supabase Auth | Integrated, secure |
| **File Storage** | Supabase Storage | Simple, integrated with DB |
| **AI Content** | Claude API (Anthropic) | High quality structured content |
| **Image Gen** | DALL-E or Stability AI | For future image generation |
| **Deployment** | Vercel (web), Google Play (mobile), Supabase Functions (API) | Scalable, serverless |
| **Monitoring** | Sentry or LogRocket | Error tracking and performance |

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
- Backend API (Supabase + Express)
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

## 11. Open Questions & Decisions

### Questions to Resolve:
1. **Mobile Framework:** React Native (Expo) vs native Kotlin/Android?
2. **Backend Hosting:** Supabase Edge Functions vs self-hosted Node.js server?
3. **Image Generation:** When and how to integrate DALL-E? Phase 1 or Phase 2?
4. **Content Moderation:** How to review AI-generated content before student sees it?
5. **Performance Metrics:** What are success metrics for Arthur's engagement?
6. **Data Export:** Should parents be able to export all data? (GDPR requirement)
7. **Offline Support:** Should mobile app work offline (download content first)?
8. **Payments:** Will this be free or paid? How to sustain long-term?

### Decisions Made:
- ✅ Tech Stack: Supabase + Next.js + React Native
- ✅ Languages: English code, French + English UI (Phase 1)
- ✅ AI: Claude API for content generation
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
