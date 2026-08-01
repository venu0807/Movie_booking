# Movie Booking App

A full-stack movie booking platform with React frontend and Django REST API backend. Browse movies, view showtimes, select seats, and book tickets.

## Architecture

```
Movie_booking/
├── entertainment/          # React Frontend (Vite + React 18)
│   ├── src/
│   │   ├── components/    # MovieCard, ShowtimePicker, SeatSelector, etc.
│   │   ├── pages/         # Home, MovieDetail, Booking, Profile
│   │   ├── context/       # AuthContext, BookingContext
│   │   └── services/      # API client (Axios)
│   └── package.json
│
└── env/bookmyshow/        # Django REST API Backend
    ├── bookmyshow/        # Django project settings
    ├── api/               # DRF app (movies, theaters, bookings, users)
    ├── requirements.txt
    └── manage.py
```

## Tech Stack

**Frontend:**
- React 18 + Vite
- React Router v6
- Axios for API calls
- Tailwind CSS

**Backend:**
- Django 4.2 + Django REST Framework
- JWT Authentication (djangorestframework-simplejwt)
- PostgreSQL (production) / SQLite (dev)
- CORS headers for frontend integration

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL (for production)

### Backend Setup

```bash
cd Movie_booking/env/bookmyshow

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start server
python manage.py runserver 8000
```

API runs at http://localhost:8000

### Frontend Setup

```bash
cd Movie_booking/entertainment

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at http://localhost:5173

### Environment Variables

**Backend (.env):**
```
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://user:pass@localhost:5432/moviebooking
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:8000/api
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/movies/` | GET | List movies (with filters) |
| `/api/movies/{id}/` | GET | Movie details |
| `/api/theaters/` | GET | List theaters |
| `/api/showtimes/` | GET | Showtimes for movie/theater/date |
| `/api/bookings/` | POST | Create booking |
| `/api/bookings/` | GET | User's bookings |
| `/api/auth/login/` | POST | JWT login |
| `/api/auth/register/` | POST | User registration |

## Features

- 🎬 Browse movies (trending, upcoming, now playing)
- 🎭 Movie details with cast, synopsis, trailers
- 🏢 Theater & showtime selection
- 💺 Interactive seat map
- 🔐 JWT authentication (login/register)
- 📱 Responsive design
- 🎫 Booking history

## Deployment

**Backend:** Deploy to Railway, Render, or any Python host. Set `DEBUG=False`, configure `ALLOWED_HOSTS`, use PostgreSQL.

**Frontend:** Deploy to Vercel, Netlify, or GitHub Pages. Set `VITE_API_URL` to production backend URL.

## License

MIT