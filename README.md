# Secret Santa / Amigo Secreto Web Application

A complete web application for managing Secret Santa groups with gift exchanges, wishlists, and automated draws.

## Features

- **User Authentication**: Register and login with JWT tokens
- **Group Management**: Create and manage Secret Santa groups
- **Invitations**: Share groups via invite links or email
- **Gift Ideas**: Each participant can add up to 5 gift ideas
- **Automated Draws**: Random assignment ensuring no self-assignment
- **Revelation System**: Reveal who drew you only after the exchange date
- **Email Reminders**: Automated reminders for draws and exchanges
- **Auto-draw**: Optional automatic draw when conditions are met

## Tech Stack

### Backend
- Django 5+
- Django REST Framework
- PostgreSQL
- Celery + Redis (for async tasks and scheduled jobs)
- JWT Authentication

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS (Aceternity UI inspired)
- React Query
- React Router

## Project Structure

```
secretsanta/
├── backend/          # Django backend
│   ├── api/         # Main app with models, views, serializers
│   ├── backend/     # Django project settings
│   └── manage.py
├── frontend/        # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── lib/
│   └── package.json
└── docker-compose.yml
```

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (or use Docker)
- Redis (or use Docker)

### Option 1: Docker Compose (Recommended)

1. **Clone and navigate to the project:**
   ```bash
   cd secretsanta
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Run migrations:**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

4. **Create superuser (optional):**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

5. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin

### Option 2: Manual Setup

#### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser:**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start Django server:**
   ```bash
   python manage.py runserver
   ```

8. **In separate terminals, start Celery worker and beat:**
   ```bash
   # Terminal 2: Celery Worker
   celery -A backend worker -l info

   # Terminal 3: Celery Beat
   celery -A backend beat -l info
   ```

#### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173

## Environment Variables

### Backend (.env)

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=secretsanta
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000/api
```

## How It Works

### Draw Algorithm

The Secret Santa draw uses a shuffle algorithm that ensures:
1. Each participant is assigned exactly one receiver
2. No one is assigned to themselves
3. All assignments are valid (no circular dependencies)

The algorithm:
- Shuffles the list of receivers
- Checks for self-assignments
- If found, reshuffles (up to 100 attempts)
- Creates `SecretSantaAssignment` records atomically

### Celery Tasks

1. **`execute_draw_task`**: Performs the actual draw and creates assignments
2. **`send_invite_email_task`**: Sends email invitations to join groups
3. **`send_draw_reminder_task`**: Periodic task (hourly) to remind about upcoming draws
4. **`send_exchange_reminder_task`**: Daily task to remind about exchange dates
5. **`auto_draw_task`**: Periodic task (every 30 min) to auto-trigger draws when enabled

### Visibility Rules

- **After Draw:**
  - Each participant can see their receiver and receiver's gift ideas
  - Receivers cannot see who drew them until exchange date

- **After Exchange Date:**
  - Receivers can see who their Secret Santa is (giver)

## API Endpoints

### Authentication
- `POST /api/register/` - Register new user
- `POST /api/token/` - Login (get JWT tokens)
- `POST /api/token/refresh/` - Refresh access token

### Groups
- `GET /api/groups/` - List user's groups
- `POST /api/groups/` - Create new group
- `GET /api/groups/{id}/` - Get group details
- `PATCH /api/groups/{id}/` - Update group (owner only)
- `DELETE /api/groups/{id}/` - Delete group (owner only)
- `POST /api/groups/join/` - Join group via invite code
- `GET /api/groups/{id}/members/` - List group members
- `POST /api/groups/{id}/invite_email/` - Send email invitation
- `POST /api/groups/{id}/draw/` - Trigger draw (owner only)
- `GET /api/groups/{id}/my_assignment/` - Get my receiver
- `GET /api/groups/{id}/who_drew_me/` - Get who drew me (after exchange date)

### Gift Ideas
- `GET /api/gift-ideas/?group={id}` - List gift ideas
- `POST /api/gift-ideas/` - Create gift idea
- `PATCH /api/gift-ideas/{id}/` - Update gift idea
- `DELETE /api/gift-ideas/{id}/` - Delete gift idea
- `GET /api/gift-ideas/{group_id}/receiver_ideas/` - Get receiver's ideas

## Testing the Full Flow

1. **Register and Login:**
   - Create an account at `/register`
   - Login at `/login`

2. **Create a Group:**
   - Go to Dashboard
   - Click "Create New Group"
   - Fill in details (name, dates, min participants)
   - Save

3. **Invite Members:**
   - Open the group detail page
   - Copy invite link or send email invitation
   - Share with others

4. **Join Group:**
   - Use invite link: `/join/{invite_code}`
   - Or enter invite code manually

5. **Add Gift Ideas:**
   - Go to "Gift Ideas" section
   - Add up to 5 ideas with titles and descriptions

6. **Run Draw:**
   - As group owner, click "Run Draw" when conditions are met
   - Wait for Celery task to complete (check backend logs)
   - Refresh page to see assignments

7. **View Assignment:**
   - See who you need to give a gift to
   - View their gift ideas

8. **Revelation:**
   - After exchange date, see who drew you
   - Badge shows "Amigo Secreto Revelado"

## Color Palette

The application uses a custom color palette:

- **Primary**: `#135F5C` (verde petróleo)
- **Primary Light**: `#187670`
- **Secondary**: `#D65448` (coral)
- **Secondary Light**: `#E56B5F`
- **Background**: `#FFF8F0`
- **Surface**: `#F5D7B2`
- **Border Soft**: `#E6C8A3`

## Development

### Running Tests

```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm test
```

### Code Style

- Backend: Follow PEP 8
- Frontend: ESLint + Prettier (configured)

## Production Deployment

1. Set `DEBUG=False` in backend settings
2. Configure proper `SECRET_KEY`
3. Set up proper email backend (SMTP)
4. Use production database
5. Configure CORS for production domain
6. Set up SSL/HTTPS
7. Use production-ready WSGI server (Gunicorn)
8. Set up reverse proxy (Nginx)

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions, please open an issue on the repository.

