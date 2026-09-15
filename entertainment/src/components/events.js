import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "./context";


export default function Events(){

    const {firstname, city, eventdata} = useContext(UserContext)
    // Show all events when no city selected, else only that city's.
    const visible = city ? eventdata.filter((e) => !e.city || e.city === city) : eventdata;

    // const [eventname, setEventName] = useState('');
    // const [place, setPlace] = useState('');
    // const [eventtype, setEventType] = useState('');
    // const [price,setPrice] = useState('');

    // const AddEvent = async () =>{
    //     try {
    //         let response= await fetch('/api/event/', {
    //             method:'POST',
    //             headers:{'Content-Type':'application/json'},
    //             body:JSON.stringify({
    //                eventname:eventname,
    //                place:place,
    //                eventtype:eventtype,
    //                price:price
    //             })
    //         });
    //         const jsonData = await response.json();
    //         console.log('Event created:', jsonData);
    //     } catch (error) {
    //         console.error('Error creating event:', error);
    //     }

    // }



    return(
        <div>
            {/* <div className="bg-dark text-light">
            <div className="mx-auto col-10 col-md-8 col-lg-3 py-3"><h3>Add Events</h3></div>
            <div className="mx-auto col-10 col-md-8 col-lg-3">
              <form onSubmit={(e) => {e.preventDefault(); AddEvent(); }}>
                <div className="form-group">
                    <label>Event Name</label>
                    <input className="form-control" type="text" value={eventname} onChange={(e) => setEventName(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Place</label>
                    <select className="form-control" value={place} onChange={(e) => setPlace(e.target.value)}>
                    <option value="">Choose</option>
                           <option value="Bengalore">Bengalore</option>
                           <option value="Chennai">Chennai</option>
                           <option value="Hyderabad">Hyderabad</option>
                           <option value="Mumbai">Mumbai</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Type</label>
                    <select className="form-control" value={eventtype} onChange={(e) => setEventType(e.target.value)}>
                    <option value="">Choose</option>
                       <option value="Concert">Concert</option>
                       <option value="Education">Education</option>
                       <option value="Stand up Comedy">Stand up Comedy</option>
                       <option value="Kids">Kids</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Price</label>
                    <input className="form-control" type="text" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="d-flex justify-content-center">
                     <button type="submit" className="btn btn-danger mt-3 col-lg-4 my-3">Submit</button>
                </div>
            </form>
        </div>
            </div> */}
            <div className="container">
                <div><h3 className="my-3">Events in {city || 'All Cities'}</h3></div>
                <div className="row">
                    {visible.length === 0 ? (
                        <p className="my-3">No events found{city ? ` in ${city}` : ''}. Try another city.</p>
                    ) : visible.map((obj) => (
                    <div className="col-md-3 my-4" key={obj.id}>
                        <div className="card mx-2" style={{width: "12rem", height: '26rem'}}>
                            <img src={obj.image} className="card-img-top" alt={obj.eventname} style={{ height: '14rem', objectFit: 'cover' }}/>
                            <div className="card-body">
                                <h5 className="card-title">{obj.eventname}</h5>
                                <p className="card-text mb-1">📍 {obj.place}</p>
                                <p className="card-text mb-1">{obj.eventtype}</p>
                                <p className="card-text mb-1"><strong>₹{obj.price}</strong></p>
                                {obj.event_date && <p className="card-text text-muted small mb-0">{new Date(obj.event_date + 'T00:00:00').toDateString()}</p>}
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        </div>
    );
}