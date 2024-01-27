import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../context";
import { useSearchParams } from "react-router-dom";


export default function Crew(){
    const { crewdata } = useContext(UserContext);

    const [searchParams] = useSearchParams()
    const name = searchParams.get('name') || '' ;
    const id = searchParams.get('id') || '' ;
    const [filter, setFilter] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);




    console.log('data :', crewdata)


    useEffect( () => {
        setFilter(crewdata.filter((cc) => ((cc.id === parseInt(id)) )))
    }, [crewdata, id])

    
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

    

    return(
        <div>
             <div style={{ height: '480px', position: 'relative',overflow: 'hidden' }}>
              <img src="https://th.bing.com/th/id/OIP.G9onS8b6LZwMOGPR4wvJ_wHaHa?w=800&h=800&rs=1&pid=ImgDetMain" alt="" height={480} style={{ width: '100%', position: 'absolute' }}/>
            <div  style={{ position: 'relative', zIndex: 1 }}>
                {filter.map((actor,index) => (
                    <div key={index} className="d-flex" style={{marginTop:'3%'}}>
                        <div style={{margin:'5% 5% 5% 10%',}}>
                            <img src={actor.crew_member_image} alt={actor.crew_member_name} height={200} width={200} style={{borderRadius:'50%'}}/>
                        </div>
                        <div className="text-light" >
                        {filter.map((per, innerIndex) => (
                        <div key={innerIndex}>
                            <h1>{actor.crew_member_name}</h1>
                            {per && (
                            <div>
                                <table cellPadding={20}>
                                    {per.occupation && (
                                        <tr>
                                            <td>Occupation:</td>
                                            <td>
                                                <ul className="d-flex pt-4">
                                                    {per.occupation.map((role, roleIndex) => (
                                                    <li key={roleIndex} className="mr-4">{role}</li>
                                                    ))}
                                                </ul>
                                            </td>
                                        </tr>
                                    )}
                                    {per.born && (
                                        <tr>
                                            <td>Born:</td>
                                            <td>{per.born}</td>
                                        </tr>
                                    )}
                                    {per.birthplace && (
                                        <tr>
                                            <td>BirthPlace:</td>
                                            <td>{per.birthplace}</td>
                                        </tr>
                                    )}
                                    {per.spouse && (
                                        <tr>
                                            <td>Spouse:</td>
                                            <td>{per.spouse}</td>
                                        </tr>
                                    )}
                                </table>
                            </div>
                            )}
                        </div>
                        ))}
                        </div>
                    </div>
                ))}
            </div>
            </div>
            <div className="container my-5">
                {crewdata.map((per) =>(
                    <div>
                    {per.about && (
                        <div>
                           <h2>About</h2>
                           <p>
                           {isExpanded ? per.about : `${per.about.substring(0, 500)}...`}
                    {per.about.length > 100 && (
                      <span onClick={toggleExpand} style={{ color: 'blue', cursor: 'pointer' }}>
                        {isExpanded ? ' Read Less' : ' Read More'}
                      </span>
                    )}
                           </p>
                        </div>
                    )}
                    </div>
                ))}
                
                <div>
                    <h2>Peers & More</h2>
                </div>
            </div>

        </div>
    )
}