import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function Login() {
  const { login } = useAuth(); const nav = useNavigate();
  const [email,setEmail]=useState('admin@vegetablemart.local'),[password,setPassword]=useState('admin123'),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  async function go(e){e.preventDefault();setError('');setLoading(true);try{await login(email,password);nav('/')}catch(x){setError(x.message)}finally{setLoading(false)}}
  return <div className="login"><form className="form login-form" onSubmit={go}><div className="logo">🥬</div><h1>FreshMart Admin</h1><p>Customer Khata Management · گاہکوں کا کھاتہ</p>{error&&<div className="error">{error}</div>}<label>Email / ای میل</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>Password / پاس ورڈ</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary" disabled={loading}>{loading?'Logging in... / داخل ہو رہا ہے...':'Login / لاگ اِن'}</button></form></div>;
}
