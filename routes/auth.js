// Importing code structure from Lab 4 for userSchema setup, making adjustments for Piazza Api. 

const express=require('express')
const router=express.Router()

const User=require('../models/User')
const {registerValidation,loginValidation}=require('../validations/validation')

const bcryptjs=require('bcryptjs')
const jsonwebtoken=require('jsonwebtoken')


//Register user
router.post('/register', async(req,res)=>{

    //Validation to check user input
   const {error}=(registerValidation(req.body))
   if(error){
   res.status(400).send({message:error['details'][0]['message']})
   }

// Validation 2 to check id user exists. if user exists it wont add again.
    const userExists = await User.findOne({email:req.body.email})
    if(userExists){
        return res.status(400).send({message:'User already exists'})
}
    // Hash password
    const salt=await bcryptjs.genSalt(5)
    const hashedPassword=await bcryptjs.hash(req.body.password,salt)

    // Code to insert data
    const user = new User({
        username:req.body.username,
        email:req.body.email,
        password:hashedPassword
    })
    try{
        const savedUser = await user.save()
        res.send(savedUser)
    }catch(err){
        res.status(400).send({message:err})
    }
    
})
router.post('/login', async(req,res)=>{

    //Validation to check user input
   const {error}=(loginValidation(req.body))
   if(error){
   res.status(400).send({message:error['details'][0]['message']})
   }

   // Validation 2 to check id user exists. if user exists it wont add again.
   const user = await User.findOne({email:req.body.email})
   if(!user){
       return res.status(400).send({message:'User does not exists'})
   }

   // Validation 2 to check user password, first decrypting it.
   const passwordValidation=await bcryptjs.compare(req.body.password,user.password)
   if(!passwordValidation){
    return res.status(400).send({message:'Password is wrong'})
   }
   // If succesfull, generate an auth-token you show the token to the user. and set the headers to this token.

   const token = jsonwebtoken.sign({_id:user._id},process.env.TOKEN_SECRET)
   res.header('auth-token',token).send({'auth-token':token})

})

module.exports=router

// Reference: Lab 4, Cloud Computing, 2024-2025, Stelios Sotiraidis