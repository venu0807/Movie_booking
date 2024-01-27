import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../context";
import { Link } from "react-router-dom";

export default function Movies() {
  const { city, moviedata } = useContext(UserContext);
  const currentDate = new Date();

  const categories = [
    { title: "Languages", options: ["English", "Hindi", "Kannada", "Telugu", "Tamil", "Malayalam", "English 7D", "Japanese", "Marathi", "Multi Language"] },
    // { title: "Genres", options: ["Drama", "Action", "Thriller", "Comedy", "Romantic", "Adventure", "Crime", "Fantasy", "Horror", "Biography", "Musical", "Period", "Superhero", "Animation", "Anime", "Classic", "Family", "Sci-Fi", "Suspense"] },
    // { title: "Formats", options: ["2D", "4DX", "IMAX2D", "3D", "4DX 3D", "7D", "MX4D", "SCREEN X"] }  
  ];

  const [selectedOptions, setSelectedOptions] = useState({});
  const [filteredMovies, setFilteredMovies] = useState([]);

  useEffect(() => {
    const filterMovies = () => {
      return moviedata
        .filter((movie) => {
          const match = Object.keys(selectedOptions).every((category) => {
            const categoryKey = category.toLowerCase();
            const movieCategoryValue = movie[categoryKey];
    
            if (movieCategoryValue) {
              const categoryOptions = selectedOptions[category]?.map(option => option.toLowerCase());
    
              const isMatch = categoryOptions.every((selectedOption) =>
                movieCategoryValue.toLowerCase().includes(selectedOption)
              );
    
              console.log(`${category}: ${movieCategoryValue} => ${isMatch ? 'Match' : 'No Match'}`);
              return isMatch;
            }
    
            return true;
          });
    
          return match;
        })
        .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
    };
    

    const result = filterMovies();
    setFilteredMovies(result);
    console.log("Filtered Movies:", result);
  }, [selectedOptions, moviedata]);

  return (
    <div>
      <div className="container">
        <div>
          <h3 className="my-3">Movies in {city}</h3>
        </div>
        <div className="row">
          <div className="col-md-3">
            <div>
              <h6>Filters</h6>
            </div>
            <div className="app">
              <div className="filters">
                {categories.map((category) => (
                  <div key={category.title} className="category">
                    <div className="category-header">
                      <p style={{ cursor: 'pointer' }}>{category.title}</p>
                    </div>
                    <div className="category-options" style={{ border: "1px solid #ccc", padding: "10px", fontSize: 'small', display: 'flex', flexWrap: 'wrap', cursor: 'pointer' }}>
                      {category.options.map((option) => (
                        <div
                          key={option}
                          className={`filter-option ${selectedOptions[category.title]?.includes(option) ? "selected" : ""}`}
                          onClick={() => setSelectedOptions((prevSelectedOptions) => {
                            const currentSelectedOptions = prevSelectedOptions[category.title] || [];
                            const updatedOptions = currentSelectedOptions.includes(option)
                              ? currentSelectedOptions.filter((o) => o !== option)
                              : [...currentSelectedOptions, option];

                            return {
                              ...prevSelectedOptions,
                              [category.title]: updatedOptions
                            };
                          })}
                          style={{
                            backgroundColor: selectedOptions[category.title]?.includes(option) ? "red" : "white",
                            color: selectedOptions[category.title]?.includes(option) ? "white" : "black",
                            border: "1px solid black",
                            padding: "5px",
                            margin: "5px",
                            cursor: "pointer"
                          }}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-md-9">
            <div className="row">
              {filteredMovies.length === 0 ? (
                <p>No movies available.</p>
              ) : (
                filteredMovies.map((obj) => (
                  <div className="col-md-3" key={obj.id}>
                    <div className="card border-0 mb-4" style={{ width: "12rem", height: "30rem" }}>
                      <Link key={obj.id} to={`/movie/${obj.id}/${obj.moviename}`} > <img src={obj.image} className="card-img-top" alt={`Poster for ${obj.moviename}`} /> </Link>
                      {new Date(obj.release_date) > currentDate ? (
                        <p className="bg-dark text-light">{new Date(obj.release_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>) : (<p className="bg-dark text-light">Rating</p>)}
                      <div className="card-body">
                        <h5 className="card-title">{obj.moviename}</h5>
                        <p className="card-text">{obj.starring}</p>
                        <p className="card-text">{obj.genre}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}








// const [image,setImage] = useState(null);
    // const [moviename, setMovienName] = useState('');
    // const [starring, setStarring] = useState('');
    // const [genre, setGenre] = useState('');


    


    // const AddMovie = async () => {

    //     // try {
    //     //     let response = await fetch('movie/', {
    //     //         method: 'POST',
    //     //         headers: {'Content-Type': 'application/json'},
    //     //         body: JSON.stringify({
    //     //             moviename: moviename,
    //     //             starring: starring,
    //     //             genre: genre
    //     //         })
    //     //     });
    //     //     const jsonData = await response.json();
    //     //     console.log('Movie created:', jsonData);
    //     // } catch (error) {
    //     //     console.error('Error creating movie:', error);
    //     // }

    //     try {
    //         const formData = new FormData();
    //         formData.append('image', image);
    //         formData.append('moviename', moviename);
    //         formData.append('starring', starring);
    //         formData.append('genre', genre);
    
    //         let response = await fetch('movie/', {
    //             method: 'POST',
    //             body: formData,
    //         });
    
    //         if (response.ok) {
    //             const jsonData = await response.json();
    //             console.log('Movie created:', jsonData);
    //         } else {
    //             console.error('Failed to create movie:', response.statusText);
    //         }
    //     } catch (error) {
    //         console.error('Error creating movie:', error);
    //     }
    // }
       






     {/* <div className="container bg-secondary text-light">
            <div className="mx-auto col-10 col-md-8 col-lg-3 py-3"><h3>Add Movies</h3></div>
            <div className="mx-auto col-10 col-md-8 col-lg-3">
                <form onSubmit={(e) => {e.preventDefault(); AddMovie(); }}>
                    <div className="form-group">
                        <label>image</label>
                        <input className="form-control" type="file"  onChange={(e) => setImage(e.target.files[0])} />
                    </div>
                    <div className="form-group">
                        <label>Movie Name</label>
                        <input className="form-control" type="text" value={moviename} onChange={(e) => setMovienName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Starring</label>
                        <input className="form-control" type="text" value={starring} onChange={(e) => setStarring(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Genre</label>
                        <select className="form-control" value={genre} onChange={(e) => setGenre(e.target.value)}>
                            <option value="">Choose</option>
                            <option value="Action">Action</option>
                            <option value="Drama">Drama</option>
                            <option value="Romance">Romance</option>
                            <option value="Sci-Fi">Sci-Fi</option>
                        </select>
                    </div>
                    <div className="d-flex justify-content-center">
                        <button type="submit" className="btn btn-danger mt-3 col-lg-4 my-3">Submit</button>
                    </div>
                </form>
            </div>
            </div> */}