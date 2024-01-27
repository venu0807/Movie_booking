import React, {useState,useEffect, useContext} from "react";
import { UserContext } from "../components/context";

export default function Register(){

  const { registerUser } =useContext(UserContext);

  const [conformpassword, setConformPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  


    return(
        <div>
            <h1 className="d-flex justify-content-center my-5">Registation Form</h1>
            <div className="mx-auto col-10 col-md-8 col-lg-6 bg-info text-light py-3">
            <form onSubmit={registerUser}>
                {/* <div className="form-row">
                    <div className="form-group col-md-6">
                        <label for="inputEmail4">Firsrname</label>
                        <input type="text" className="form-control" value={firstname} onChange={(e) =>setFirstName(e.target.value)} />
                    </div>
                    <div className="form-group col-md-6">
                      <label for="inputPassword4">Lastname</label>
                      <input type="text" className="form-control" />
                    </div>
                </div> */}
                <div className="form-row">
                    {/* <div className="form-group col-md-6">
                        <label for="inputEmail4">Email</label>
                        <input type="email" className="form-control"   value={email} onChange={(e) => setEmail(e.target.value)}/>
                    </div> */}
                    <div className="form-group col-md-6">
                        <label for="inputEmail4">Username</label>
                        <input type="text" className="form-control"  name="username"/>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group col-md-6">
                      <label for="inputPassword4">Password</label>
                      <input type="password" className="form-control"  name="password" />
                    </div>
                    <div className="form-group col-md-6">
                      <label for="inputPassword4"> Conform Password</label>
                      <input type="password" className="form-control" name="confirmPassword" />
                    </div>
                  </div >
                  <div className="d-flex justify-content-center">
                  <input type="submit" className="btn btn-light col-lg-2 "/>
                  </div>
                  <div className="text-center mt-2">
                  </div>
            </form>
            </div>
        </div>
    );
}