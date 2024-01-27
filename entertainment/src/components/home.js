import React, { useContext } from "react";
import { UserContext } from "./context";
import { Link } from 'react-router-dom'

export default function Home(){

    const {firstname, city, moviedata, eventdata} = useContext(UserContext)
    const currentDate = new Date();


    const sortedMovies = [...moviedata].sort(
        (a, b) => new Date(a.release_date) - new Date(b.release_date)
      );


    

    

    return(
        <div className="container">
            <div>
                <h4>Recommended Movies</h4>
            </div>
            <div>
                <div>
                <div className="row">
                        {sortedMovies.length === 0 ? (
                        <p>No movies available.</p>
                        ) : (
                            sortedMovies.map((obj) => 
                            (<div className="col-md-3" key={obj.id}>
                                <div className="card border-0 mb-4" style={{width: "12rem", height:"30rem"}}>
                                    <Link key={obj.id} to={`/movie/${obj.id}/${obj.moviename}`} > <img src={obj.image} className="card-img-top" alt={`Poster for ${obj.moviename}`}/> </Link>
                                    {new Date(obj.release_date) > currentDate ? (
                                    <p className="bg-dark text-light">{new Date(obj.release_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric' })}</p> ) : ( <p className="bg-dark text-light">Rating</p> )}
                                    <div className="card-body">
                                        <h5 className="card-title">{obj.moviename}</h5>
                                        <p className="card-text">{obj.starring}</p>
                                        <p className="card-text">{obj.genre}</p>
                                    </div>
                                </div>
                             </div>
                            ))
                        )}
                      </div>
                </div>
            </div>
            <div>
                <h4>Recommended Events</h4>
            </div>
            <div className="row">
                    {eventdata.map((obj) => (
                    <div className="col-md-3 col-sm-6" key={obj.id}>
                        <div className="card md-4 border-0" style={{width: "12rem", height:"30rem"}}>
                            <img src={obj.image} className="card-img-top" alt={obj.eventname}/>
                            <div className="card-body">
                                <h5 className="card-title">{obj.eventname}</h5>
                                <p className="card-text">{obj.place}</p>
                                <p className="card-text">{obj.eventtype}</p>
                                <p className="card-text">₹{obj.price}</p>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
        </div>
    );
}