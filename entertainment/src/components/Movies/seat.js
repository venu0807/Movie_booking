import React, { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { UserContext } from '../context';

// CineBook payment server — the source of truth for shows, holds & bookings.
const PAYMENT_SERVER = process.env.REACT_APP_PAYMENT_API_URL || 'http://127.0.0.1:8001';


export default function SeatBooking() {
  const { moviedatabyid, fetchMovieDetails } = useContext(UserContext);
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const theaterId = searchParams.get('theaterId') || '' ;
  const theaterName = searchParams.get('theaterName') || '';
  const showDate = searchParams.get('showDate') || '';
  const showTime = searchParams.get('showTime') || '';
  const type = searchParams.get('type') || '';
  const amount = searchParams.get('amount') || '';
  // Server-side show id: the payment server owns pricing for this show.
  const showId = searchParams.get('showId') || '';
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  


  const renderSeatNumbers = (totalSeats, rowChar) => {
    const seatWidth = 20;
    const seatHeight = 20;
    const gap = 10;
  
    return (
      <div style={{ display: 'flex' }}>
        {[...Array(totalSeats)].map((_, index) => {
          const seatNumber = index + 1;
          // Canonical seat label (e.g. "A1") — matches the CineBook server format.
          const seatId = `${rowChar}${seatNumber}`;
          // Booked seats come from the payment server as labels ("A1", "B7");
          // holds & settled bookings are already scoped to this show server-side.
          const isBooked = Array.isArray(bookedSeats) && bookedSeats.includes(seatId);
          const isSelected = selectedSeats.includes(seatId);


          let backgroundColor;
          if (isBooked) {
            backgroundColor = 'gray';
          } else if (isSelected) {
            backgroundColor = 'lightblue'; 
          } else {
            backgroundColor = 'white'; 
          }

          // console.log('isBooked:', isBooked);
          // console.log('theater :', theaterName)
          // console.log('type :',type)
          // console.log('amount :',amount)
          // console.log('date :',showDate)
          // console.log('time :',showTime)
          // console.log('Generated className:', `seat-number ${isBooked ? 'booked' : (isSelected ? 'selected' : '')}`);

  
          return (
            <div
              key={seatId}
              className={`seat-number ${isBooked ? 'booked' : (isSelected ? 'selected' : '')}`}
              style={{ width: seatWidth, height: seatHeight, marginRight: gap, cursor: isBooked ? 'not-allowed' : 'pointer',   backgroundColor,}}
              onClick={() => handleSeatClick(seatId, isBooked)} >
              {seatNumber}
            </div>
          );
        })}
      </div>
    );
  };
  
  
  const renderSeatRow = (rowNumber) => {
    const totalSeats = getSeatsPerRow(rowNumber);
    const rowChar = String.fromCharCode(64 + rowNumber);
    const rowSeats = renderSeatNumbers(totalSeats, rowChar);
  
    return (
      <div key={rowNumber} className="seat-row">
        <div className="row-info" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <div className="row-name">{rowChar}</div>
          <div className="seats" style={{ display: 'flex', flexDirection: 'row' }}>
            {rowSeats}
          </div>
        </div>
      </div>
    );
  };


  
  const getSeatsPerRow = (rowNumber) => {
    if (rowNumber === 1) {
      return 22;
    } else if (2 <= rowNumber && rowNumber <= 5) {
      return 18;
    } else if (6 <= rowNumber && rowNumber <= 7) {
      return 20;
    } else if (8 <= rowNumber && rowNumber <= 9) {
      return 18;
    } else {
      return 22;
    }
  };


  const handleSeatClick = async (seatId, isBooked) => {
  
    if (!isBooked) {
      setSelectedSeats((prevSelectedSeats) => {
        return prevSelectedSeats.includes(seatId)
          ? prevSelectedSeats.filter((seat) => seat !== seatId)
          : [...prevSelectedSeats, seatId];
      });
    } else {
      alert('This seat is already booked. Please choose another seat.');
    }
  };
  


  // Booked seats now come from the CineBook server (holds + settled bookings).
  const fetchBookedSeats = async () => {
      try {
        if (!showId) {
          // Legacy links without showId have no bookable show on the payment server.
          setBookedSeats([]);
          return;
        }
        const response = await fetch(`${PAYMENT_SERVER}/api/shows/${showId}/booked`);
        if (response.ok) {
          const data = await response.json();
          setBookedSeats(Array.isArray(data.seats) ? data.seats : []);
        } else {
          console.error('Failed to fetch booked seats');
        }
      } catch (error) {
        console.error('Error during fetch:', error);
      }
    };


  useEffect(() => {
    fetchMovieDetails(id);
    setSelectedSeats([]);
    fetchBookedSeats();
  }, [id, theaterName, showDate, showTime]);


  
  return (
    <div>
      <div className="d-flex" style={{ height: '30px' }}>
        <h4>{moviedatabyid.moviename}</h4>
        <small style={{ border: '1px solid black', borderRadius: '10px', padding: '0.3%', marginLeft: '2%' }}>
          {moviedatabyid.certificate}
        </small>
      </div>

      <small>
        {theaterName} || {showDate} || {type} || {showTime} || ₹{amount}
      </small>
      <div className="seat-layout">
        <small>{[...Array(20)].map((_, index) => renderSeatRow(index + 1))}</small>
      </div>
      <div className="selected-seats">
        <p>Selected Seats: {selectedSeats.join(', ') || 'None'}</p>
        <p>Total Seats Selected: {selectedSeats.length}</p>
      </div>
      <Link to={`/movie/${id}/${moviedatabyid.moviename}/booking/seats/payment?theaterId=${theaterId}&theaterName=${theaterName}&showDate=${showDate}&type=${type}&showTime=${showTime}&amount=${amount}&selectedSeats=${selectedSeats.join(', ')}&showId=${showId}`}>
        {/* Proceed to payment — showId carries pricing authority to the CineBook server */}
        <button type="submit">Proceed to Payment</button>
      </Link>

    </div>
  );
}
