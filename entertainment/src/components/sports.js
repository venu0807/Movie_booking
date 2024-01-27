
import React, { useState, useEffect } from 'react';

const Sports = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      // setCurrentDateTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  return (
    <div>
      <p>Current Date and Time:</p>
      <p>{currentDateTime.toLocaleString()}</p>
    </div>
  );
};

export default Sports;
