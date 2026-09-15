import React, { useContext, useEffect } from "react";
import { Link, Routes, Route } from 'react-router-dom'
import { UserContext } from "./context";
import Home from "./home";
import Movies from "./Movies/Movies"
import MovieDetails from "./Movies/moviedetails";
import Booking from "./Movies/booking";
import SeatBooking from "./Movies/seat";
import Payment from "./Movies/ticket";
import Events from "./events";
import Sports from "./sports";
import Login from "../pages/LoginPage";
import Register from "../pages/RegisterPage";
import Cast from "./Movies/cast";
import Crew from "./Movies/crew";
import Person from "./Movies/Person";
import MyBookings from "./Rating/MyBookings";





export default function Menubar(){
    const { city, setCity, user, logoutUser } =useContext(UserContext);



    useEffect(() => {
        const storedCity = localStorage.getItem('selectedCity');
        if (storedCity) {
          setCity(storedCity);
        }
      }, [setCity]);
    
      const handleCityChange = (e) => {
        const selectedCity = e.target.value;
        setCity(selectedCity);
        localStorage.setItem('selectedCity', selectedCity);
      };

return(
    
      <div>
            <nav className=" container navbar navbar-light bg-light">
                <div className="d-flex align-items-center">
                    {user ? (
                        <>
                            <Link className="navbar-brand mb-0" to="/my-bookings">👋 {user.username}</Link>
                            <button className="btn btn-sm btn-outline-secondary ml-2" onClick={logoutUser}>Logout</button>
                        </>
                    ) : (
                        <Link className="navbar-brand mb-0" to="/login">Login / Register</Link>
                    )}
                </div>
                <div className="d-flex">
                <div className="navbar-nav ml-auto">
                    <select className="col-md-12 border-0" value={city} onChange={handleCityChange}>
                           <option value="">Choose</option>
                           <option>Bengalore</option>
                           <option>Chennai</option>
                           <option>Hyderabad</option>
                           <option>Mumbai</option>
                    </select>
                </div>
                </div>
            </nav>

            <nav className=" container navbar navbar-expand-sm navbar-light">
                <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul className="navbar-nav mr-auto">
                        <li className="nav-item active">
                            <Link className="nav-link" to="/">Home <span className="sr-only">(current)</span></Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link active" to="/movies">Movies</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link active" to="/events">Events</Link>
                        </li>
                        {/* <li className="nav-item">
                            <Link className="nav-link active" to="/sports">Sports</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link active" to="/activites">Activites</Link>
                        </li> */}
                    </ul>
               </div>
            </nav>
            <Routes>
              {/* ponytail: removed recursive self-route <Route path='/menu' element={<Menubar />} /> */}
              <Route path='/login' element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Home />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/mrating" element={<MyBookings />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/movie/:id/:moviename/*" element={<MovieDetails />} />
              <Route path="/movie/:id/:moviename/booking" element={<Booking />} />
              <Route path="/movie/:id/:moviename/booking/seats" element={<SeatBooking />} />
              <Route path="/movie/:id/:moviename/booking/seats/payment" element={<Payment />} />
              <Route path="/person" element={<Person />} />
              <Route path="/persen" element={<Person />} />
              <Route path="/events" element={<Events />} />
              <Route path="/sports" element={<Sports />} />
            </Routes>
      </div>
  );
}
