import React, { createContext, useState, useEffect} from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faStar } from '@fortawesome/free-solid-svg-icons';

// ── API configuration ──
const API_BASE_URL = "http://127.0.0.1:8000";

// ── Token helpers ──
// ponytail: localStorage is XSS-vulnerable. For production, swap these to
// use httpOnly cookies (requires backend changes to set
// JWT as httpOnly cookie rather than returning in JSON body).
const TOKEN_KEY = 'authTokens';
const getToken = () => { try { const raw = localStorage.getItem(TOKEN_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
const setToken = (tokens) => localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
const removeToken = () => localStorage.removeItem(TOKEN_KEY);

const UserContext = createContext();

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

    // ── Auth: register ──
    const registerUser = async (e) => {
        e.preventDefault();
        console.log("Form Event:", e);

        const username = e.target.username.value;
        const password = e.target.password.value;
        const confirmPassword = e.target.confirmPassword.value;

        if (!username || !password || password !== confirmPassword) {
            console.error("Ivalid Data");
            return;
        }

        try {
            const registerResponse = await fetch(`${API_BASE_URL}/api/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "username": username , "password": password })
            });

            if (registerResponse.ok) {
                const data = await registerResponse.json();
                navigate('/mrating')
                console.log("Registration successful", data);
            } else {
                console.error("Registration failed");
            }
        } catch (error) {
            console.error("Error during registration", error);
        }

    }

    // ── Auth: login ──
    const loginUser = async (e) => {
        e.preventDefault();
        const response = await fetch(`${API_BASE_URL}/api/token/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "username": e.target.username.value, "password": e.target.password.value })
        });

        const data = await response.json();

        if (response.status === 200) {
            setAuthTokens(data);
            setUser(jwtDecode(data.access));
            setToken(data);
            navigate('/mrating')
        } else {
            alert('Something went wrong!');
        }
    };

    // ── Auth: logout ──
    const  logoutUser = () => {
        setAuthTokens(null);
        setUser(null);
        removeToken()
        // navigate(window.location.pathname)
        navigate('/')
    }

    // ── Auth: refresh token ──
    const updateToken = async () => {
        console.log('Update Token Called!')
        const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "refresh":authTokens?.refresh })
        });

        const data = await response.json();

        if (response.status === 200) {
            setAuthTokens(data);
            setUser(jwtDecode(data.access));
            setToken(data);
        } else {
            logoutUser()
        }

        if (loading) {
            setLoading(false)
        }
    }

    // ── Data: fetch movies, theater shows, seat bookings ──
    const fetchData = async () => {

        const movieResponse = await fetch(`${API_BASE_URL}/api/movie/`)
        // , {
        //     headers:{'Content-Type':'application/json','Authorization':'Bearer ' + String(authTokens?.access) }
        // })

        const movie = await movieResponse.json()
        // console.log('Movies', movie);

        if (movieResponse.status === 200){
            setMoviedata(movie)
        } else if (movieResponse.statusText === 'Unauthorized'){
            logoutUser()
        }

        const theatershowResponse = await fetch(`${API_BASE_URL}/api/theatershow/`);
          const theatershow = await theatershowResponse.json();

        //   console.log('Theater Data:', theatershow);

          if (theatershowResponse.status === 200) {
            setTheaterShowdata(theatershow);
          } else if (theatershowResponse.statusText === 'Unauthorized') {
            logoutUser();
          }

          const seatbookingResponse = await fetch(`${API_BASE_URL}/api/seatbooking/`);
          const seatbooking = await seatbookingResponse.json();

        //   console.log('Show Data:', seatbooking);

          if (seatbookingResponse.status === 200) {
            setSeatBookingdata(seatbooking);
          } else if (seatbookingResponse.statusText === 'Unauthorized') {
            logoutUser();
          }

    };

    // ── Data: fetch movie details, cast, crew by movie id ──
    const fetchMovieDetails = async (id) => {
        try {

          const movieResponse = await fetch(`${API_BASE_URL}/api/movie/${id}/`);
          const movie = await movieResponse.json();
          console.log('movieid :' , movie.id)
          console.log('movie :' , movie)

          setMoviedatabyid(movie);

          const castResponse = await fetch(`${API_BASE_URL}/api/cast/`);
          const cast = await castResponse.json();

          console.log('castdata',cast );
          console.log('movieId:',movie.id)


          const filteredCast = cast.filter(actor => actor.movies_cast.includes(movie.id));
          console.log('filtercast', filteredCast);


          if (castResponse.status === 200){
              setCastdata(filteredCast)
          } else if (castResponse.statusText === 'Unauthorized'){
              logoutUser()
          }

          const crewResponse = await fetch(`${API_BASE_URL}/api/crew/`);
          const crew = await crewResponse.json();

          const filteredCrew = crew.filter(actor => actor.movies_crew.includes(movie.id));

          console.log('filterCrew', filteredCrew);

          if (crewResponse.status === 200){
              setCrewdata(filteredCrew)
          } else if (crewResponse.statusText === 'Unauthorized'){
              logoutUser()
          }




        } catch (error) {
          console.error('Error fetching movie details:', error);
        }
      };

    // ── Context value ──
    const contextValue = {
        registerUser:registerUser,
        user:user,
        loginUser:loginUser,
        logoutUser:logoutUser,
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

    // ── Render ──
    return(
        <UserContext.Provider value={contextValue}>
            {loading ? null : children}
        </UserContext.Provider>
    )
};

export {UserProvider, UserContext};