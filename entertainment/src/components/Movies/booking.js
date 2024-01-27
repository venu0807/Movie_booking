import React, { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { UserContext } from "../context";
import moment from 'moment';
import { Dropdown } from "react-bootstrap";

export default function Booking() {
  const { moviedatabyid, fetchMovieDetails, theatershowdata, city } = useContext(UserContext);

  const [filteredTheaters, setFilteredTheaters] = useState([]);
  const [amount, setAmount] = useState('')
  const [hoveredShowTime, setHoveredShowTime] = useState(null);
  const [hoveredButtonIndex, setHoveredButtonIndex] = useState(null);
  const [selectedShowTime, setSelectedShowTime] = useState(null);
  const [selectedShowDate, setSelectedShowDate] = useState(null); 
  const { id } = useParams(); 
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || '';
  const [dates, setDates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(null);
  const navigate = useNavigate();

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, dates.length - 1));
  };

  useEffect(() => {
    price(moviedatabyid.screentype);
  }, [hoveredShowTime]);

  const price = (screenType) => {
    if (type === ('IMAX2D')) {
      setAmount(500);
    } else if (type === ('2D')) {
      setAmount(200);
    } else {
      setAmount(0);
    }
  };




  useEffect(() => {

    fetchMovieDetails(id);
  }, [id]);



  useEffect(() => {
    const currentDate = moment();
    setDates(Array.from({ length: 7 }, (_, index) => currentDate.clone().add(index, 'days')));
  }, []);

  

  useEffect(() => {
    
    const selectedDate = dates[currentIndex]?.format('YYYY-MM-DD');
    setCurrentDate(selectedDate); // Set currentDate using setCurrentDate
  }, [dates, currentIndex]);



  useEffect(() => {



    if (currentDate) {
      const filtered = theatershowdata.filter((theater) => {
        const momentShowDates = theater.show_dates.map((date) =>
          moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD')
        );

        return momentShowDates.includes(currentDate) && theater.movie === moviedatabyid.id && theater.location === city && theater.screentype === type;
      });

      setFilteredTheaters(filtered);
    }




  }, [theatershowdata, id, currentDate, moviedatabyid.id, city, type]);
  

  
    return(
        <div className="container">
          <div>
            <h2>{moviedatabyid.moviename}</h2>
            <div className="d-flex" >
            <small style={{border:'1px solid black', borderRadius:'10px', padding:'0.4%' ,marginRight:'2%'}}>{moviedatabyid.certificate}</small>
            <small style={{border:'1px solid black', borderRadius:'10px', padding:'0.4%'}}>{moviedatabyid.genre}</small>
            </div>
            <hr/>
            <div className="container">
              <div className="row">
                <div className="col-12 d-flex align-items-center">
                  <button className="btn text-secondary" style={{fontSize:'40px'}} onClick={handlePrev}>&lt;</button>
                  <div className="d-flex mx-2 overflow-auto">
                    {dates.map((date, index) => (
                    <div key={date.format('YYYY-MM-DD')} className={`p-2 ${ index === currentIndex ? 'bg-primary text-white' : ''}`} style={{fontSize: '0.8rem'}}>
                      <div className="text-center">
                        <p className="mb-0">{date.format('dddd')}</p>
                        <p className="mb-0">{date.format('MMM D')}</p>
                      </div>
                    </div>
                    ))}
                  </div>
                  <button className="btn text-secondary " style={{fontSize:'40px'}} onClick={handleNext}>&gt;</button>
                </div>
              </div>
            </div>     
          </div> 
          <div>
            <table className="table border-0">
              <tbody>
                {filteredTheaters.map((theater) => (
                <tr key={theater.id} className="list-group-item d-flex align-items-center">
                  <p style={{ flex: 1 }}>{theater.name}</p>
                  <p style={{ flex: 7, textAlign: 'center' }} className="text-center">
                    {theater.show_dates.map((date, dateIndex) => (
                    <React.Fragment key={dateIndex}>
                      {date === currentDate && (
                        theater.show_times.filter(showTime => {
                          const showDateTime = moment(`${date} ${showTime}`, 'YYYY-MM-DD hh:mm A');
                          const isBefore = moment().isBefore(showDateTime);
                          return isBefore;
                        }).map((showTime, showIndex) => (
                        <React.Fragment key={`${dateIndex}-${showIndex}`}>
                          <Link key={`${dateIndex}-${showIndex}`} to={`/movie/${id}/${moviedatabyid.moviename}/booking/seats?theaterId=${theater.id}&theaterName=${theater.name}&showDate=${date}&type=${type}&showTime=${showTime}&amount=${amount}`}>
                            <button className={`text-success mx-2`} key={`${dateIndex}-${showIndex}`}>
                              {showTime} - ₹{amount}
                            </button>
                          </Link>
                        </React.Fragment>
                        ))
                      )}
                    </React.Fragment>
                    ))}
                  </p>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    );
}

