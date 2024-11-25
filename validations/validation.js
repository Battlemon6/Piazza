const joi=require('joi')

const registerValidation=(data)=>{
    const schemaValidation=joi.object({
        username:joi.string().required().min(4).max(24),
        email:joi.string().required().min(6).max(128).email(),
        password:joi.string().required().min(8).max(256)
    })
    return schemaValidation.validate(data)
}

const loginValidation=(data)=>{
    const schemaValidation=joi.object({
        email:joi.string().required().min(6).max(128).email(),
        password:joi.string().required().min(8).max(256)
    })
    return schemaValidation.validate(data)
}

module.exports.registerValidation=registerValidation
module.exports.loginValidation=loginValidation