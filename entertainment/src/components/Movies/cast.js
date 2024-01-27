import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../context";
import { useSearchParams } from "react-router-dom";


export default function Cast(){
    const {castdata} = useContext(UserContext);

    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') || '' ;
    const id = searchParams.get('id') || '' ;
    const [filter, setFilter] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);



    console.log('data :', castdata)
    console.log('id :', id)


    useEffect( () => {
        setFilter(castdata.filter((cc) => ((cc.id === parseInt(id)) )))
    }, [castdata, id])

       
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };


    return (
        <div>
          <div style={{ height: '480px', position: 'relative', overflow: 'hidden' }}>
            <img src="https://th.bing.com/th/id/OIP.G9onS8b6LZwMOGPR4wvJ_wHaHa?w=800&h=800&rs=1&pid=ImgDetMain" alt="" height={480} style={{ width: '100%', position: 'absolute' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              {filter.map((actor, index) => (
                <div key={index} className="d-flex" style={{ marginTop: '3%' }}>
                  <div style={{ margin: '5% 5% 5% 10%', }}>
                    <img src={actor.actor_image} alt={actor.actor_name} height={200} width={200} style={{ borderRadius: '50%' }} />
                  </div>
                  <div className="text-light" key={actor.id}>
                    <h1>{actor.actor_name}</h1>
                    <table cellPadding={20}>
                      {actor.occupation && (
                        <tr>
                          <td>Occupation:</td>
                          <td>
                            <ul className="d-flex pt-4">
                              {actor.occupation.map((role, roleIndex) => (
                                <li key={roleIndex} className="mr-4">{role}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                      {actor.born && (
                        <tr>
                          <td>Born:</td>
                          <td>{actor.born}</td>
                        </tr>
                      )}
                      {actor.birthplace && (
                        <tr>
                          <td>BirthPlace:</td>
                          <td>{actor.birthplace}</td>
                        </tr>
                      )}
                      {actor.spouse && (
                        <tr>
                          <td>Spouse:</td>
                          <td>{actor.spouse}</td>
                        </tr>
                      )}
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="container my-5">
            {/* Display about section only for the specified actor */}
            {filter.map((per) => (
              per.id === parseInt(id) && (
                <div key={per.id}>
                  <div>
                    <h2>About</h2>
                    <p>
                      {isExpanded ? per.about : `${per.about.substring(0, 500)}...`}
                      {per.about.length > 500 && (
                        <span onClick={toggleExpand} style={{ color: 'blue', cursor: 'pointer' }}>
                          {isExpanded ? ' Read Less' : ' Read More'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )
            ))}
            <div>
              <h2>Peers & More</h2>
            </div>
          </div>
        </div>
      );
      
}