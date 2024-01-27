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
import MovieSearch from "./search";





export default function Menubar(){
    const { city, setCity, user } =useContext(UserContext);

    const handleSearch = (query) => {
        // Implement your app-wide search logic here
        console.log("Performing app-wide search with query:", query);
        // You may want to navigate to a search results page or update the UI accordingly
      };

    


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
                {user ? (<a className="navbar-brand" href="#">{user.username}</a>) : (<p> </p>)}
                {/* <form className="form-inline col-md-4 mr-auto ">
                    <input className="form-control mr-sm-2" type="search" placeholder="Search" aria-label="Search" />
                    <button className="btn btn-outline-success my-2 my-sm-0" type="submit">Search</button>
                </form> */}
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
                {/* <MovieSearchSearch onSearch={handleSearch} />  */}
            </nav>

            <nav className=" container navbar navbar-expand-sm navbar-light">
                <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
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
              <Route path='/menu' element={<Menubar />} />
              <Route path='/login' element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Home />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/movie/:id/:moviename/*" element={<MovieDetails />} />
              <Route path="/movie/:id/:moviename/booking" element={<Booking />} />
              <Route path="/movie/:id/:moviename/booking/seats" element={<SeatBooking />} />
              <Route path="/movie/:id/:moviename/booking/seats/payment" element={<Payment />} />
              <Route path="/person" element={<Cast/>} />
              <Route path="/persen" element={<Crew/>} />
              <Route path="/events" element={<Events />} />
              <Route path="/sports" element={<Sports />} />
            </Routes>
      </div>
  );
}
