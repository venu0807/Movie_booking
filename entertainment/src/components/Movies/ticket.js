import React, { useState, useContext, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { UserContext } from '../context';

const Payment = () => {
  const { moviedatabyid, fetchMovieDetails } = useContext(UserContext);
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const theaterId = searchParams.get('theaterId') || '' ;
  const theaterName = searchParams.get("theaterName") || "";
  const showDate = searchParams.get("showDate") || "";
  const showTime = searchParams.get("showTime") || "";
  const type = searchParams.get('type') || "";
  const amount = searchParams.get('amount') || "";
  const selectedSeats = searchParams.get("selectedSeats") || "";

  const [bookingStatus, setBookingStatus] = useState({
    success: false,
    error: false,
    errorMessage: "",
  });


  const formattedSeats = selectedSeats.split(',').map(seat => seat.trim()).filter(seat => seat.length > 0);

  useEffect(() => {
    fetchMovieDetails(id);
    console.log('type :',type)
    console.log('amount :',amount)
    console.log('date :',showDate)
    console.log('time :',showTime)
    console.log('theater :', theaterName)
  }, [id]);

  const handlePaymentSubmit = async () => {
    try {
      const theaterResponse = await fetch(`http://127.0.0.1:8000/api/theatershow/?theaterName=${theaterName}`);
      const theaterData = await theaterResponse.json();

      const selectedTheater = theaterData.find(theater => theater.name === theaterName);


      if (selectedTheater) {
        const theaterId = selectedTheater.id;

        const response = await fetch('http://127.0.0.1:8000/api/seatbooking/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seat_number: formattedSeats,
            is_booked: true,
            price: amount * formattedSeats.length,
            show_date: showDate,
            screentype: type,
            show_time: showTime,
            total_amount: amount * formattedSeats.length * 1.18,
            payment_status: 'Confirmed',
            movie: moviedatabyid.id,
            theater: theaterId,
          }),
        });

        if (response.ok) {
          setBookingStatus({
            success: true,
            error: false,
            errorMessage: "",
          });
        } else {
          const errorResponse = await response.json();

          if (errorResponse && typeof errorResponse === 'object') {
            const errorDetails = Object.keys(errorResponse).map((key) => (
              `${key}: ${errorResponse[key].join(', ')}`
            ));

            setBookingStatus({
              success: false,
              error: true,
              errorMessage: `Validation errors: ${errorDetails.join(', ')}`,
            });
          } else {
            setBookingStatus({
              success: false,
              error: true,
              errorMessage: errorResponse.detail || "An unexpected error occurred.",
            });
          }
        }
      } else {
        throw new Error(`Theater with name ${theaterName} not found.`);
      }
    } catch (error) {
      console.error('Error during fetch:', error);
      setBookingStatus({
        success: false,
        error: true,
        errorMessage: "An unexpected error occurred.",
      });
    }
  };
  
  return (
    <div className='d-flex justify-content-around'>
      <div>
        <h2>Payment Page</h2><hr />
        <h6>Movie Name : {moviedatabyid.moviename}</h6>
        <p>Theater Name: {theaterName}</p>
        <p>Show Date: {showDate}</p>
        <p>Show Time: {showTime}</p>
        <p>Selected Seats: {selectedSeats}</p>
        <p>Amount : {amount * formattedSeats.length * 1.18}</p>
      </div>

      <div>
        <div>
          <h3>Enter Payment Details</h3> <hr />
        </div>
        <table  cellPadding={10}>
          <tr>
            <th>Card Number </th>
            <th><input type='text' ></input></th>
          </tr>
          <tr>
            <th>Cvv </th>
            <th><input type='text' ></input></th>
          </tr>
          <tr>
            <th>Name on the Card </th>
            <th><input type='text' ></input></th>
          </tr>
        </table>
        <input className='mt-2' type="submit" onClick={handlePaymentSubmit}></input>
        
        {bookingStatus.success && (
        <div>
          <h3>Booking Successful!</h3>
          </div>
          )}
          {bookingStatus.error && (
          <div>
            <h3>Error in Booking</h3>
            <p>{bookingStatus.errorMessage}</p>
            </div>
            )}
            
            {(!bookingStatus.success && !bookingStatus.error) && (
            <p>Processing payment...</p>
            )}
          </div>
      </div>
  );
};

export default Payment;
