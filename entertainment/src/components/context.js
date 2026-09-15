import React, { createContext, useState, useEffect} from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faStar } from '@fortawesome/free-solid-svg-icons';

// ── API configuration ──
// CineBook payment server — the only backend that exists locally. It serves
// the show catalogue; booked seats come from it too (holds + settled bookings).
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8001";

// ── Token helpers ──
// ponytail: localStorage is XSS-vulnerable. For production, swap these to
// use httpOnly cookies (requires backend changes to set
// JWT as httpOnly cookie rather than returning in JSON body).
const TOKEN_KEY = 'authTokens';
const getToken = () => { try { const raw = localStorage.getItem(TOKEN_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
const setToken = (tokens) => localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
const removeToken = () => localStorage.removeItem(TOKEN_KEY);

const UserContext = createContext();

// Neutral inline poster used when the show catalogue has no artwork.
const PLACEHOLDER_POSTER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600'>" +
    "<rect width='100%' height='100%' fill='#e8eaf0'/>" +
    "<text x='50%' y='46%' font-family='sans-serif' font-size='120' text-anchor='middle' fill='#aab2c8'>\uD83C\uDFAC</text>" +
    "<text x='50%' y='58%' font-family='sans-serif' font-size='28' text-anchor='middle' fill='#6b7280'>Now Showing</text>" +
    '</svg>'
  );

// ── Context provider ──
const UserProvider = ({ children }) => {

    // ── Auth state (from localStorage) ──
    const [authTokens, setAuthTokens] = useState(() => getToken());

      const [user, setUser] = useState(() => {
        try {
          return authTokens ? jwtDecode(authTokens.access) : null;
        } catch (error) {
          console.error('Error decoding user:', error);
          return null;
        }
      });

    // ── App state ──
    const [loading, setLoading] = useState(true)
    const [city,setCity] = useState('');
    const [rating,setRating] = useState('');
    const [moviedata,setMoviedata] = useState([]);
    const [moviedatabyid,setMoviedatabyid] = useState([]);
    const [castdata,setCastdata] = useState([]);
    const [crewdata,setCrewdata] = useState([]);
    const [theatershowdata,setTheaterShowdata] = useState([]);
    const [seatbookingdata,setSeatBookingdata] = useState([]);
    const [eventdata,setEventdata] = useState([]);


    const navigate = useNavigate()

    // ── Auth state shared via context ──
    const [authError, setAuthError] = useState('');

    // CineBook auth: token is `payload.signature`; payload carries id + username.
    const decodeToken = (token) => {
        try {
            return JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')));
        } catch {
            return null;
        }
    };

    const applyAuth = (data) => {
        // data: { user: {id, username}, token: string }
        setAuthTokens(data.token);
        setUser(data.user);
        setToken(data.token);
    };

    // ── Auth: register ──
    const registerUser = async (e) => {
        e.preventDefault();
        const username = e.target.username.value.trim();
        const password = e.target.password.value;
        const confirmPassword = e.target.confirmPassword.value;

        if (!username || !password || password !== confirmPassword) {
            setAuthError('Passwords must match and fields be filled');
            return;
        }
        setAuthError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (res.ok) {
                applyAuth(data);
                navigate('/my-bookings');
            } else {
                setAuthError(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Error during registration', error);
            setAuthError('Network error during registration');
        }
    };

    // ── Auth: login ──
    const loginUser = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: e.target.username.value.trim(),
                    password: e.target.password.value,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                applyAuth(data);
                navigate('/my-bookings');
            } else {
                setAuthError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Error during login', error);
            setAuthError('Network error during login');
        }
    };

    // ── Auth: logout ──
    const logoutUser = () => {
        setAuthTokens(null);
        setUser(null);
        removeToken();
        navigate('/');
    };

    // ── Auth: restore session on boot ──
    const updateToken = async () => {
        if (!authTokens) {
            if (loading) setLoading(false);
            return;
        }
        // The CineBook token expires after 7 days; validate silently.
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${authTokens}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setAuthTokens(null);
                setUser(null);
                removeToken();
            }
        } catch {
            // Network hiccup — keep the stored session optimistically.
        }
        if (loading) setLoading(false);
    };

    // ── Data: events (city-aware) ──
    const fetchEvents = async (cityName) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/events${cityName ? `?city=${encodeURIComponent(cityName)}` : ''}`);
            if (!res.ok) return;
            const list = await res.json();
            setEventdata(list.map((ev) => ({ ...ev, image: ev.image_url || PLACEHOLDER_POSTER })));
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    // ── Data: movies + shows from the CineBook server ──
    // /api/movies serves full metadata (posters, genres, cast, crew) seeded
    // from TMDB; /api/shows provides the theater/showtime view for booking.
    const fetchData = async () => {
        try {
            const moviesResponse = await fetch(`${API_BASE_URL}/api/movies`);
            if (!moviesResponse.ok) {
                console.error('Failed to fetch movies from payment server');
                return;
            }
            const movies = await moviesResponse.json();
            // Guard against missing artwork on any entry.
            for (const m of movies) {
                if (!m.image) m.image = PLACEHOLDER_POSTER;
                if (!m.background) m.background = PLACEHOLDER_POSTER;
            }
            setMoviedata(movies);

            const showsResponse = await fetch(`${API_BASE_URL}/api/shows`);
            if (!showsResponse.ok) return;
            const shows = await showsResponse.json();

            const theaterShows = shows.map((s) => ({
                id: s.id,
                showId: s.id,
                name: s.theater,
                movie: s.movieId || s.movie,
                location: s.city || 'All',
                screentype: '2D',
                show_dates: [(s.showTime || '').slice(0, 10)].filter(Boolean),
                show_times: [s.showTime ? new Date(s.showTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : ''].filter(Boolean),
            }));
            setTheaterShowdata(theaterShows);
        } catch (error) {
            console.error('Error fetching show catalogue:', error);
        }
    };    // ── Data: fetch movie details, cast, crew by movie id ──
    // Served by /api/movies (TMDB-seeded metadata incl. cast & crew).
    const fetchMovieDetails = async (id) => {
        try {
          const moviesResponse = await fetch(`${API_BASE_URL}/api/movies`);
          if (!moviesResponse.ok) {
            console.error('Failed to fetch movies for details');
            return;
          }
          const movies = await moviesResponse.json();
          const movie = movies.find((m) => m.id === id);
          if (!movie) {
            console.warn('No movie found for id:', id);
            return;
          }

          setMoviedatabyid({
            ...movie,
            image: movie.image || PLACEHOLDER_POSTER,
            background: movie.background || PLACEHOLDER_POSTER,
          });
          setCastdata(Array.isArray(movie.cast) ? movie.cast : []);
          setCrewdata(Array.isArray(movie.crew) ? movie.crew : []);
        } catch (error) {
          console.error('Error fetching movie details:', error);
        }
      };

    // ── Context value ──
    const contextValue = {
        registerUser,
        loginUser,
        logoutUser,
        authError,
        user,
        authTokens,
        city,
        rating,
        moviedata,
        moviedatabyid,
        castdata,
        crewdata,
        theatershowdata,
        eventdata,
        setCity,
        setRating,
        fetchMovieDetails,
        fetchEvents,
    };

    // ── Effects: token refresh + initial data load ──
    useEffect( () => {

        if (loading){
            updateToken()
        }

        const fourMinutes = 1000 * 60 * 4
        const intervel = setInterval(() =>{
            if(authTokens){
                updateToken()
            }
        }, fourMinutes);
        fetchData();
        return () => clearInterval(intervel)


    },[authTokens, loading]);

    // Re-fetch events when the selected city changes.
    useEffect(() => {
        fetchEvents(city);
    }, [city]);

    // ── Render ──
    return(
        <UserContext.Provider value={contextValue}>
            {loading ? null : children}
        </UserContext.Provider>
    )
};

export {UserProvider, UserContext};