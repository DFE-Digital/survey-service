# Service Maturity Survey

A GOV.UK-styled service for departments to assess their service maturity.

## Installation

```bash
# Clone the repository
git clone [repository-url]
cd service-maturity-survey

# Install dependencies
npm install

# Set up the database
npm run db:migrate

# Start the development server
npm run dev
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL=postgresql://[user]:[password]@localhost:5432/service_maturity_survey

# GOV.UK Notify
NOTIFY_API_KEY=your-api-key
NOTIFY_TEMPLATE_ID_MAGIC_LINK=template-id-for-magic-links
NOTIFY_TEMPLATE_ID_REGISTRATION=template-id-for-registration
NOTIFY_TEMPLATE_ID_SURVEY_INVITE=template-id-for-survey-invites

# Application
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-secret-key
BASE_URL=http://localhost:3000

# Optional Analytics
GA_TRACKING_ID=your-ga-tracking-id
```

## External Services

### GOV.UK Notify

This service uses GOV.UK Notify for email communications. You'll need to set up the following templates:

1. **Magic Link Template** (`NOTIFY_TEMPLATE_ID_MAGIC_LINK`)
   - Variables: `serviceURL`, `magiclink`
   - Purpose: Sends sign-in links to users

2. **Registration Template** (`NOTIFY_TEMPLATE_ID_REGISTRATION`)
   - Variables: `firstName`, `lastName`, `organisation`
   - Purpose: Confirms registration requests

3. **Survey Invite Template** (`NOTIFY_TEMPLATE_ID_SURVEY_INVITE`)
   - Variables: `department_name`, `survey_url`
   - Purpose: Invites users to complete surveys

## Directory Structure

### Views

The application uses Nunjucks templating with the following structure:

```
views/
├── layouts/           # Base layouts and templates
├── includes/         # Shared components
├── auth/            # Authentication views
├── admin/           # Admin section
├── org/            # Organization management
├── survey/         # Survey taking flow
└── static/         # Static content pages
```

### Template Variables

#### Common Variables
- `currentPage` - Current section identifier
- `errors` - Validation errors object
- `user` - User session data
  - `isAdmin` - Admin status
  - `isOrgOwner` - Organization owner status
  - `departmentCode` - Department identifier

#### Survey Templates
- `survey/start.html`
  - `organization` - Department details
  - `surveyData.themes` - Survey theme information

- `survey/question.html`
  - `question` - Current question object
  - `ratingScale` - Rating scale options
  - `backLink` - Previous page URL
  - `previousAnswer` - User's previous answer

- `survey/check-answers.html`
  - `questions` - All survey questions
  - `ratingScale` - Rating scale
  - `data.answers` - User's answers

#### Organization Templates
- `org/dashboard.html`
  - `waves` - Survey wave list
  - `selectedWave` - Current wave
  - `activeWave` - Active wave
  - `totalCompleted` - Response count
  - `averageScore` - Average survey score
  - `comparison` - Wave comparison data

## Database Schema

Key tables:
- `users` - User accounts
- `survey_waves` - Survey periods
- `survey_responses` - Survey submissions
- `auth_tokens` - Authentication tokens

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Migrations
```bash
# Create a new migration
npm run db:migration:create name_of_migration

# Run migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

[MIT License](LICENSE)

# Views Directory Structure

This directory contains all the Nunjucks templates for the service maturity survey application. The structure is organized to match the application's routing and user flows.

## Directory Structure

```
views/
├── layouts/           # Base layouts and templates
│   ├── main.html     # Main layout (base template)
│   ├── admin.html    # Admin section layout
│   └── org.html      # Organization section layout
│
├── includes/         # Shared components and partials
│   ├── header.html
│   └── footer.html
│
├── auth/            # Authentication related views
│   ├── sign-in.html
│   ├── sign-up.html
│   └── check-email.html
│
├── admin/           # Admin section views
│   ├── dashboard.html
│   └── registrations/
│       ├── index.html
│       └── approve.html
│
├── org/            # Organization management views
│   ├── dashboard/
│   │   └── index.html
│   ├── waves/
│   │   ├── index.html
│   │   └── new.html
│   └── analysis/
│       └── index.html
│
├── survey/         # Survey taking flow
│   ├── start.html           # Initial survey page
│   ├── question.html        # Dynamic question page
│   ├── check-answers.html   # Review answers
│   ├── role-info.html       # Role information form
│   ├── submit.html          # Final submission page
│   └── confirmation.html    # Completion confirmation
│
└── static/         # Static content pages
    ├── accessibility.html
    ├── cookies.html
    └── privacy.html
```

## Key User Flows

### Survey Flow
The survey taking journey follows this sequence:
1. `survey/start.html` - Introduction and start page
2. `survey/question.html` - Individual question pages
3. `survey/check-answers.html` - Review all answers
4. `survey/role-info.html` - Optional role information
5. `survey/submit.html` - Final submission page
6. `survey/confirmation.html` - Completion confirmation

### Organization Owner Flow
Organization owners can:
1. View dashboard (`org/dashboard/index.html`)
2. Manage survey waves (`org/waves/`)
3. View analysis (`org/analysis/`)

### Admin Flow
Administrators can:
1. View registrations (`admin/registrations/index.html`)
2. Approve/reject users (`admin/registrations/approve.html`)

## Template Inheritance

All templates extend from one of three base layouts:
- `layouts/main.html` - Default layout
- `layouts/admin.html` - Admin section layout
- `layouts/org.html` - Organization section layout

## Shared Components

Common elements are stored in `includes/` and can be included in any template:
- Header navigation
- Footer links
- Form components
- Error messages

## Best Practices

1. Use the appropriate layout for your section
2. Include error handling in all forms
3. Follow GOV.UK Design System patterns
4. Keep templates focused and single-purpose
5. Use includes for repeated components 