import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Shared person profile page (cast & crew both resolve /api/people/:id).
export default function Person({ fallbackName = "" }) {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") || "";
  const nameParam = searchParams.get("name") || fallbackName;
  const [person, setPerson] = useState(null);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setPerson(null);
    setError("");
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8001/api/people/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(res.status === 404 ? "Person not found in catalogue" : `HTTP ${res.status}`);
        setPerson(await res.json());
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, [id]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <div style={{ height: "380px", position: "relative", overflow: "hidden", background: "#1f2233" }}>
        {person && person.image && (
          <img src={person.image} alt="" height={380} style={{ width: "100%", position: "absolute", objectFit: "cover", opacity: 0.25 }} />
        )}
        <div style={{ position: "relative", zIndex: 1 }} className="d-flex align-items-center h-100">
          <div className="mx-5">
            <img
              src={person ? person.image || "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23aab2c8'/%3E%3Ctext x='50%25' y='55%25' font-size='80' text-anchor='middle' fill='white'%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E" : ""}
              alt={person ? person.name : nameParam}
              height={200}
              width={200}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          </div>
          <div className="text-light">
            <h1>{person ? person.name : nameParam || (error ? "Not found" : "Loading…")}</h1>
            {person && person.occupation && person.occupation.length > 0 && (
              <p className="mb-1">{person.occupation.join(", ")}</p>
            )}
            {person && person.born && <p className="mb-1">Born: {person.born}</p>}
            {person && person.birthplace && <p className="mb-0">Birthplace: {person.birthplace}</p>}
            {error && <p className="text-warning mb-0">{error}</p>}
          </div>
        </div>
      </div>
      <div className="container my-5">
        {person && person.about && (
          <>
            <h2>About</h2>
            <p>
              {isExpanded ? person.about : `${person.about.substring(0, 500)}${person.about.length > 500 ? "..." : ""}`}
              {person.about.length > 500 && (
                <span onClick={toggleExpand} style={{ color: "blue", cursor: "pointer" }}>
                  {isExpanded ? " Read Less" : " Read More"}
                </span>
              )}
            </p>
            <hr />
          </>
        )}
        <h2>Filmography</h2>
        <p className="text-muted">Browse movies from the home page to see {person ? person.name : "this person"}'s work.</p>
      </div>
    </div>
  );
}
