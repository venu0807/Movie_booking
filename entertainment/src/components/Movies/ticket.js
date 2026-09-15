import React, { useState, useContext, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { UserContext } from '../context';

const PAYMENT_SERVER = process.env.REACT_APP_PAYMENT_API_URL || 'http://127.0.0.1:8001';

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
  // Server-side show id (the payment server owns pricing). Falls back to a
  // legacy param mapping for old links.
  const showId = searchParams.get("showId") || "";

  const [bookingStatus, setBookingStatus] = useState({
    success: false,
    error: false,
    errorMessage: "",
  });
  // Latest order info from the payment server, for post-checkout confirmation.
  const orderRef = React.useRef(null);

  const formattedSeats = selectedSeats.split(',').map(seat => seat.trim()).filter(seat => seat.length > 0);
  const seatType = type === 'premium' ? 'premium' : 'regular';
  const displayTotal = amount * formattedSeats.length * 1.18;

  useEffect(() => {
    fetchMovieDetails(id);
  }, [id]);

  // The CineBook payment server is the single source of truth for bookings:
  // it holds seats atomically, computes the bill server-side, and marks the
  // booking payment_authorized once the checkout signature is verified here.
  // The old Django recording step is gone — we just confirm server state.
  const confirmBooking = async (paymentId) => {
    try {
      const response = await fetch(`${PAYMENT_SERVER}/api/bookings/${orderRef.current.bookingId}`);
      if (!response.ok) throw new Error(`Booking lookup failed (HTTP ${response.status})`);
      const booking = await response.json();
      if (booking.status !== 'payment_authorized' && booking.status !== 'payment_settled') {
        throw new Error(`Unexpected booking status: ${booking.status}`);
      }
      setBookingStatus({ success: true, error: false, errorMessage: "" });
    } catch (error) {
      console.error('Error confirming booking:', error);
      setBookingStatus({ success: false, error: true, errorMessage: "Payment verified but booking confirmation failed." });
    }
  };

  const handlePaymentSubmit = async () => {
    if (typeof window.Razorpay === 'undefined') {
      setBookingStatus({ success: false, error: true, errorMessage: "Razorpay not loaded. Check internet connection." });
      return;
    }
    if (!showId) {
      setBookingStatus({ success: false, error: true, errorMessage: "Missing showId — this show is not bookable on the new payment server yet." });
      return;
    }

    try {
      // The server computes the amount from its own show catalogue; the client
      // never sends a price.
      const orderRes = await fetch(`${PAYMENT_SERVER}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId, seats: formattedSeats, seatType }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.orderId) {
        setBookingStatus({ success: false, error: true, errorMessage: orderData.error || "Failed to create payment order" });
        return;
      }
      orderRef.current = orderData;

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'CineBook',
        description: `${moviedatabyid.moviename} - ${formattedSeats.join(', ')}`,
        handler: async (response) => {
          // Verify the checkout signature server-side before confirming.
          try {
            const verifyRes = await fetch(`${PAYMENT_SERVER}/api/bookings/${orderData.bookingId}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              setBookingStatus({ success: false, error: true, errorMessage: verifyData.error || "Payment verification failed." });
              return;
            }
            await confirmBooking(response.razorpay_payment_id);
          } catch (err) {
            console.error('Verification error:', err);
            setBookingStatus({ success: false, error: true, errorMessage: "Payment verification failed." });
          }
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
        <p>Amount : ₹{displayTotal.toFixed(2)}</p>
      </div>

      <div>
        <div>
          <h3>Payment</h3> <hr />
        </div>
        <button
          className="btn btn-danger mt-3"
          onClick={handlePaymentSubmit}
        >
          Pay ₹{displayTotal.toFixed(2)}
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
