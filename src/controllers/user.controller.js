// sign up function:
// name, email, password
// check if all three exist
// check if the user with same email id exist
// bcrypt password 
// create a user
// generates a token
// sends back the token + basic user info

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

const generateToken = async(userId) => {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken

    return {accessToken, refreshToken};
}
