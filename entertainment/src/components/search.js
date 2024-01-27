
import React, { useState } from "react";

const MovieSearch = ({ onSearch }) => {
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/movie/search/?query=${searchQuery}`);
            if (response.ok) {
                const data = await response.json();
                onSearch(data);
            } else {
                console.error("Error during movie search");
            }
        } catch (error) {
            console.error("Error during movie search:", error);
        }
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Search movies by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={handleSearch}>Search</button>
        </div>
    );
};

export default MovieSearch;
