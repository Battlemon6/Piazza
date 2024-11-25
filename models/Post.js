// Importing code structure from Lab 3.1. for PostSchema setup, making adjustments for Piazza Api. 

const mongoose = require('mongoose')

const PostSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    title:{
        type:String,
        required:true
    },
    timestamp:{
        type:Date,
        default:Date.now
    },
    topic:{
        type:String,
        required:true,
        enum:['Tech','Politics','Sports','Health']
    },
    body:{
        type:String,
        required:true
    },
    likes:{
        type:Number,
        default:0
    },
    dislikes:{
        type:Number,
        default:0
    },
    // The api will show the username of the people that liked and disliked the post. I didnt like when twitter(X) get rid of this function. Therefore I am adding it to this program.
    likedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User' // Reference the User model
        }
    ],
    dislikedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User' // Reference the User model
        }
    ],
    status:{
        type:String,
        default:'Live',
        enum:['Live','Expired']
    },
    expirationTime:{
        type:Date,
        required:true
    },
    comments: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', // Reference to User model
                required: true
            },
            text: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ]
})

module.exports = mongoose.model('Post',PostSchema)
// Reference: Lab 3.1, Cloud Computing, 2024-2025, Stelios Sotiraidis