import jwt from 'jsonwebtoken';
export function auth(req,res,next){const h=req.headers.authorization,t=h?.startsWith('Bearer ')?h.slice(7):null;if(!t)return res.status(401).json({message:'Admin login required'});try{req.admin=jwt.verify(t,process.env.JWT_SECRET);next()}catch{res.status(401).json({message:'Session expired'})}}
