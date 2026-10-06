import{Navigate}from'react-router-dom';import{useAuth}from'../context/AuthContext';export default function Protected({children}){return useAuth().admin?children:<Navigate to="/login" replace/>}
