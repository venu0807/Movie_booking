import React, { useContext, useState, useEffect } from "react";
import { useParams, Link, Routes, Route, useNavigate } from "react-router-dom";
import { UserContext } from "../context";
import MovieRating from "../Rating/MovieRating";
import Login from "../../pages/LoginPage";
import PrivateRoute from "../../utils/PrivateRoute";
import { Modal, Button } from 'react-bootstrap';



export default function MovieDetails(){
    const {castdata, crewdata,  moviedatabyid,fetchMovieDetails, user } = useContext(UserContext);
    const { id } = useParams();
    const [showRating, setShowRating] = useState(false);
    const [showModal, setShowModal] = useState(false)
    const navigate = useNavigate()

    const apiReleaseDate = new Date(moviedatabyid.release_date);
    const currentDate = new Date();


    const filter = castdata.filter(c => c.id === moviedatabyid.cast)
    console.log('filter:', filter)


    useEffect(() => {
        fetchMovieDetails(id);
        console.log('movie:',moviedatabyid)
      }, [id]);


      const handleRateNowClick = () => {
        if (user) {
          setShowRating(true);
        } else {
          navigate("/login");
        }
      };

      const handleBookTicketsClick = () => {
        setShowModal(true);
      };
    
      const handleCloseModal = () => {
        setShowModal(false);
      };

      

    return(
        <div>
            <div style={{ height: '480px', position: 'relative',overflow: 'hidden' }}>
              <img src="https://th.bing.com/th/id/OIP.G9onS8b6LZwMOGPR4wvJ_wHaHa?w=800&h=800&rs=1&pid=ImgDetMain" alt="" height={480} style={{ width: '100%', position: 'absolute' }}/>
              <div className="d-flex" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{width: '30%', height: '400px',margin: '3% 0% 0% 10%'}}>
                  <img src={moviedatabyid.image} alt={moviedatabyid.moviename} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                </div>
                <div className=" text-light ml-4 mt-5" style={{ position: 'relative' ,zIndex: 2 }}>
                  <h2 style={{ borderRadius: '10px',width:'200%' }}>{moviedatabyid.moviename}</h2>
                  <h3>Rating</h3>
                  {new Date(moviedatabyid.release_date) < currentDate ? (
                      <div className="bg-dark py-2 px-4 my-2" style={{ borderRadius: '10px',width:'200%' }}>
                      <div className="d-flex justify-content-between align-items-center ">
                        <h6>Add your rating & review</h6>
                        {user ? (<button className="btn bg-light" onClick={handleRateNowClick}>Rate now</button>) : (
                          <Link to={'/login'}><button className="btn bg-light">Rate now</button></Link>
                        )}
                      </div>
                      <div>
                        <h6>Your rating matter</h6>
                      </div>
                    </div>
                    ) : (  <div className="bg-dark py-2 px-4 my-2" style={{ borderRadius: '10px',width:'200%' }}>
                            <div className="d-flex justify-content-between align-items-center ">
                              <h6>Releasing in {new Date(moviedatabyid.release_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric' })}</h6>
                              {user ? (<Link to={'/mrating'}><button className="btn bg-light">I'm intersted</button></Link>) :(
                              <Link to={'/login'}><button className="btn bg-light">I'm intersted</button></Link>)}
                            </div>
                          <div>
                            <small>Mark interested to know when bookings open</small>
                          </div>
                           </div>)}
                  <div className="py-2 my-2" style={{ borderRadius: '10px',width:'200%' }}>
                   <div className="d-flex align-items-center">
                    <h6 className="bg-light text-dark mx-2 p-1">{moviedatabyid.screentype}</h6>
                    <h6 className="bg-light text-dark p-1">{moviedatabyid.languages}</h6>
                   </div>
                  </div>
                  <div className=" my-2" style={{ borderRadius: '10px',width:'200%' }}>
                   <ul className="mr-auto d-flex justify-content-between">
                    <li>{moviedatabyid.runtime}</li>
                    <li>{moviedatabyid.genre}</li>
                    <li>{moviedatabyid.certificate}</li>
                    <li>{new Date(moviedatabyid.release_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric' })}</li>
                   </ul>
                  </div>
                  <div style={{ borderRadius: '10px',width:'200%' }}>
                  {apiReleaseDate <= currentDate | new Date(apiReleaseDate.getTime() - currentDate <= 2 * 24 * 60 * 60 * 1000)  ? (
                  <button className="btn btn-lg px-5 ml-5 bg-danger text-light" onClick={handleBookTicketsClick}> Book tickets</button>) : (<p></p> )}
                  </div>
                </div>
                <div style={{ marginRight: '1%', width: '100%', height: '480px', position: 'relative', zIndex: 1 }}>
                  <div style={{position: 'absolute',top: 0,left: 0,right:20, width: '100%',height: '480px',background: `url(${moviedatabyid.background}) center center / cover no-repeat`,opacity:'0.7'}}></div>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '10%', height: '100%',backdropFilter: 'blur(2px)',  background: 'rgba(0, 0, 0, 0.3)', zIndex: 2}}></div>
                </div>
              </div>
            </div>

            <Modal show={showModal} onHide={handleCloseModal}>
              <Modal.Header closeButton>
               <Modal.Title>Screen Type</Modal.Title>
              </Modal.Header>
               <Modal.Body>
                <p>Screen Type:</p>
                {moviedatabyid && moviedatabyid.screentype && (
                <p className="btn mr-5">{moviedatabyid.screentype.split(', ').map((type, index) => (
                <React.Fragment key={index}>
                  <Link to={`/movie/${moviedatabyid.id}/${moviedatabyid.moviename}/booking/?type=${type}`}>
                    {type}
                  </Link>
                  {index < moviedatabyid.screentype.split(', ').length - 1 && ', '}
                </React.Fragment>
                ))}
                </p>
                )}
               </Modal.Body>
               <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseModal}>
                  Close
                </Button>
               </Modal.Footer>
            </Modal>
            <div className="container mt-4">
              <div>
                <h4>About the Movie</h4>
                <p>{moviedatabyid.about}</p><hr/>
              </div>
              <div>
                <h4>Cast</h4>
                <div className="d-flex">
                  {castdata.map((actor, index) => (
                  <div key={index}>
                    <Link to={`/person/?name=${actor.actor_name}&id=${actor.id}`}> <img src={actor.actor_image} alt={actor.actor_name} height={100} style={{ borderRadius: '100px' }} /></Link>
                    <h6 className="m-3" style={{width:'50%'}}>{actor.actor_name}</h6>
                    <p className="m-3">as {actor.role_name}</p>
                  </div>
                  ))}
                </div>
               <hr/>
              </div>
              <div>
                <h4>Crew</h4>
                {crewdata.map((crew, index) => (
                  <div key={index}>
                    <Link to={`/persen/?name=${crew.crew_member_name}&id=${crew.id}`}><img src={crew.crew_member_image} alt={crew.crew_member_name} height={100} style={{borderRadius:'100px'}} /></Link>
                    <h6 className="mt-3">{crew.crew_member_name}</h6>
                    <p >{crew.occupation.join(', ')}</p>
                  </div>
                ))}
                <hr/>
              </div>
            </div>

            <Routes>
              <Route path="/mrating" element={<PrivateRoute element ={<MovieRating />} />} />
              {/* <Route path='/login' element={<Login />} /> */}
            </Routes>
        </div>
    );
}