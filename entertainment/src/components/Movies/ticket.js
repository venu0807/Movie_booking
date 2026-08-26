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
  const totalAmount = amount * formattedSeats.length * 1.18;

  useEffect(() => {
    fetchMovieDetails(id);
  }, [id]);

  const confirmBooking = async (paymentId) => {
    try {
      const theaterResponse = await fetch(`http://127.0.0.1:8000/api/theatershow/?theaterName=${theaterName}`);
      const theaterData = await theaterResponse.json();
      const selectedTheater = theaterData.find(theater => theater.name === theaterName);

      if (selectedTheater) {
        const response = await fetch('http://127.0.0.1:8000/api/seatbooking/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seat_number: formattedSeats,
            is_booked: true,
            price: amount * formattedSeats.length,
            show_date: showDate,
            screentype: type,
            show_time: showTime,
            total_amount: totalAmount,
            payment_status: 'Confirmed',
            payment_id: paymentId,
            movie: moviedatabyid.id,
            theater: selectedTheater.id,
          }),
        });

        if (response.ok) {
          setBookingStatus({ success: true, error: false, errorMessage: "" });
        } else {
          const errorResponse = await response.json();
          const errorDetails = errorResponse && typeof errorResponse === 'object'
            ? Object.keys(errorResponse).map((key) => `${key}: ${errorResponse[key].join(', ')}`).join(', ')
            : (errorResponse.detail || "An unexpected error occurred.");
          setBookingStatus({ success: false, error: true, errorMessage: `Validation errors: ${errorDetails}` });
        }
      } else {
        throw new Error(`Theater with name ${theaterName} not found.`);
      }
    } catch (error) {
      console.error('Error during fetch:', error);
      setBookingStatus({ success: false, error: true, errorMessage: "An unexpected error occurred." });
    }
  };

  const handlePaymentSubmit = async () => {
    if (typeof window.Razorpay === 'undefined') {
      setBookingStatus({ success: false, error: true, errorMessage: "Razorpay not loaded. Check internet connection." });
      return;
    }

    try {
      const orderRes = await fetch('http://127.0.0.1:8001/api/create-payment-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount }),
      });
      const orderData = await orderRes.json();

      if (!orderData.orderId) {
        setBookingStatus({ success: false, error: true, errorMessage: orderData.error || "Failed to create payment order" });
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'CineBook',
        description: `${moviedatabyid.moviename} - ${formattedSeats.join(', ')}`,
        handler: async (response) => {
          await confirmBooking(response.razorpay_payment_id);
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#e50914' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment order error:', error);
      setBookingStatus({ success: false, error: true, errorMessage: "Failed to create payment order." });
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
        <p>Amount : ₹{totalAmount.toFixed(2)}</p>
      </div>

      <div>
        <div>
          <h3>Payment</h3> <hr />
        </div>
        <button
          className="btn btn-danger mt-3"
          onClick={handlePaymentSubmit}
        >
          Pay ₹{totalAmount.toFixed(2)}
        </button>

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
      </div>
    </div>
  );
};

export default Payment;
