
// login :
// find the user by email
// if not found then error
// bcrypt compare 
// if it matches issue a new JWT token
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const generateAccessAndRefereshTokens = async(userId) => {

    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
    
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const signupUser = asyncHandler(async (req,res) => {
// sign up function:
// name, email, password
// check if all three exist
// check if the user with same email id exist
// bcrypt password 
// create a user
// generates a token
// sends back the token + basic user info
    const { name, email, password } = req.body;

    if(!name || !email || !password){
        throw new ApiError(400,'All fields are required')
    }

    const existingUser = await User.findOne({ email })

    if(existingUser){
        throw new ApiError(400,'Email already Registered')
    }

    const hashedPassword = await bcrypt.hash(password,10);

    const user = User.create({ name, email, password: hashedPassword });

    const tokens = generateAccessAndRefereshTokens(user._id);
    return res
    .statusCode(201)
    .json(
        new ApiResponse(201, {
            tokens, user: {id: user._id, name: user.name, email: user.email}
        },
    'User Registered Successfully'
        )
    )
});

const loginUser = asyncHandler(async (req,res) => {
    // login :
// find the user by email
// if not found then error
// bcrypt compare 
// if it matches issue a new JWT token

    const { email, password } = req.body

    const user = await User.findOne({ email });

    if(!user){
        throw new ApiError(400,'Invalid User Credentials')
    }
    const isMatch = await bcrypt.compare(password,user.password);

    if(!isMatch){
        throw new ApiError(400,"Invalid credentials")
    }

    const token = generateAccessAndRefereshTokens(user._id);
    return res
    .statusCode(200)
    .json(
        new ApiResponse(
            200,
            {
                token, user: {id: user._id, name: user.name, email: user.email}
            },
            'Login Successful'
        )
    )

})

export { signupUser,
         loginUser,
        }