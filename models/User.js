// Importing code structure from Lab 4 for userSchema setup, making adjustments for Piazza Api. 

const mongoose=require('mongoose')

const userSchema=mongoose.Schema({
    username:{
        type:String,
        require:true,
        unique:true,
        min:4,
        max:24
    },
        email:{   
        type:String,
        require:true,
        unique:true,
        min:6,
        max:128
    }, 
    password:{
        type:String,
        require:true,
        min:8,
        max:256
    },
    date:{
        type:Date,
        default:Date.now
    }
})
module.exports=mongoose.model('User',userSchema);
// Reference: Lab 4, Cloud Computing, 2024-2025, Stelios Sotiraidis