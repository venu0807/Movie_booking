import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../context";

const STATUS_LABEL = {
  pending: "⏳ Payment pending",
  payment_authorized: "✅ Confirmed",
  payment_settled: "✅ Confirmed & settled",
  expired: "⌛ Expired (hold lapsed)",
  cancelled: "❌ Cancelled",
};

export default function MyBookings() {
  const { user, authTokens, logoutUser } = useContext(UserContext);
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://127.0.0.1:8001/api/my/bookings", {
          headers: { Authorization: `Bearer ${authTokens}` },
        });
        if (res.status === 401) {
          logoutUser();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setBookings(await res.json());
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, [authTokens]);

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center">
        <h3>{user ? `${user.username}'s Bookings` : "My Bookings"}</h3>
        {user && (
          <button className="btn btn-outline-danger btn-sm" onClick={logoutUser}>
            Logout
          </button>
        )}
      </div>
      <hr />
      {error && <p className="text-danger">Failed to load bookings: {error}</p>}
      {bookings === null && !error && <p>Loading your bookings…</p>}
      {bookings !== null && bookings.length === 0 && (
        <div className="text-center my-5">
          <p className="h5">No bookings yet 🎬</p>
          <p className="text-muted">Pick a movie, choose your seats, and your tickets will show up here.</p>
        </div>
      )}
      {bookings !== null && bookings.length > 0 && (
        <div className="row">
          {bookings.map((b) => (
            <div className="col-md-6 col-lg-4 my-2" key={b.bookingId}>
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <h6 className="card-subtitle mb-2 text-muted">#{b.bookingId} · {b.orderId.slice(0, 18)}…</h6>
                  </div>
                  <p className="mb-1"><strong>{STATUS_LABEL[b.status] || b.status}</strong></p>
                  <p className="mb-1">Seats: <strong>{b.seats.join(", ")}</strong> ({b.seatCount})</p>
                  <p className="mb-1">Amount: <strong>{b.amountDisplay}</strong></p>
                  <p className="mb-0 text-muted small">Booked {new Date(b.bookedAt + "Z").toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
