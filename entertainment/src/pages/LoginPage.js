import React, { useState, useEffect, useContext } from "react";
import { Link, Route,Routes } from "react-router-dom";
import { UserContext } from "../components/context";



export default function Login(){
  
  
  const { loginUser,user } =useContext(UserContext);



    return(
        <div>
            <h1 className="d-flex justify-content-center my-5">Login</h1>
            <div className="mx-auto col-10 col-md-8 col-lg-3 bg-info p-4" >
            <form onSubmit={loginUser} >
                  <div className="form-group">
                    <input type="text" className="form-control" placeholder="Username" name="username"/>
                  </div>
                  <div className="form-group">
                    <input type="password" className="form-control"  placeholder="Password" name="password"  />
                  </div>
                  <div className="d-flex justify-content-center">
                    <input type="submit" className="btn btn-danger mt-3 col-lg-4" />
                  </div>
                  <div className="text-center mt-2">
                  </div>
            </form>
            <div className="pt-5">
            <small>Don't have a account</small><Link to={'/register'}><button className="btn text-light">Register</button></Link>
            </div>
            </div>
        </div>
    );
}