// import React, { useContext } from 'react';
import { useContext } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { UserContext } from '../components/context';
// import { AuthContext } from "../components/AuthContext";
    


    const PrivateRoute = ({children, ...rest}) => {
        const {user} = useContext(UserContext)

        return(
            <Route {...rest}>{!user ? <Navigate to="/login" /> :  children}</Route>
        )
    }

    export default PrivateRoute



  