import { Response } from "express"
import {
    TypedRequestWithBody,
    TypedRequestWithQuery,
    CombinedResponseType,
    AuthRequest,
    CreateUserRequestBody,
    LoginRequestBody,
    UpdateUserRequestBody,
    UserIdQuery,
    HTTP_BAD_REQUEST_400,
    HTTP_NOT_IMPLEMENTED_501,
    HTTP_INTERNAL_SERVER_ERROR_500,
    HTTP_CREATED_201
} from "../types/index"
import {
    successResponse,
    errorResponse,
    errorResponseWithStatusCode,
    catchResponse,
    bcryptPassword,
    comparePassword,
    createAndGetToken
} from "../utils/index"
import { createUserSchema, userLoginSchema, updateUserSchema } from "../validations/user.validation"
import { User } from "../models/user.model"
import * as UserService from "../services/user.service"

export async function createUser(req: TypedRequestWithBody<CreateUserRequestBody>, res: CombinedResponseType): Promise<void> {
    try {
        const { error, value } = createUserSchema.validate(req.body)
        if (error) {
            const errorMessage = error.details[0].message
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400)
            return
        }

        const { email, name, password, role } = value

        // Check if user already exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            errorResponse(res, 'User with this email already exists')
            return
        }

        // Hash password
        const hashedPassword = await bcryptPassword(password)

        // Create user
        const userData = {
            email,
            name,
            password: hashedPassword,
            role: role || 'student'
        }

        const user = await UserService.createUser(userData)

        const data = {
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        }

        successResponse(res, data, 'User created successfully')
        return
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to create user')
        return
    }
}

export async function login(req: TypedRequestWithBody<LoginRequestBody>, res: CombinedResponseType): Promise<void> {
    try {
        const { error, value } = userLoginSchema.validate(req.body)
        if (error) {
            const errorMessage = error.details[0].message
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400)
            return
        }

        const { email, password } = value

        const user = await User.findOne({ email }).lean()
        if (!user) {
            errorResponse(res, 'Invalid email or password')
            return
        }

        if (!user.password) {
            errorResponse(res, 'Password not set for this user')
            return
        }

        const isPasswordValid = await comparePassword(password, user.password)
        if (!isPasswordValid) {
            errorResponse(res, 'Invalid email or password')
            return
        }

        const accessTokenData = await createAndGetToken(user._id.toString())

        const userDetails = {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            token: accessTokenData.token
        }

        const data = {
            success: true,
            user: userDetails,
            token: `Bearer ${userDetails.token}`
        }

        successResponse(res, data, 'Login successful')
        return
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Login failed')
        return
    }
}

export async function getMe(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        const currentUser = req.user

        if (!currentUser) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401)
            return
        }

        const userDetails = await User.findById(currentUser._id).select('-password -token').lean()
        if (!userDetails) {
            errorResponse(res, 'User not found')
            return
        }

        const data = {
            success: true,
            user: userDetails
        }

        successResponse(res, data, 'User retrieved successfully')
        return
    } catch (error) {
        catchResponse(res, error as Error, 'Failed to retrieve user')
        return
    }
}

export async function updateMe(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        const { error, value } = updateUserSchema.validate(req.body)
        if (error) {
            const errorMessage = error.details[0].message
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400)
            return
        }

        const userId = req.user?._id

        if (!userId) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401)
            return
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: value },
            { new: true }
        ).select('-password -token').lean()

        if (!updatedUser) {
            errorResponse(res, 'User not found')
            return
        }

        const data = {
            success: true,
            user: updatedUser
        }

        successResponse(res, data, 'User updated successfully')
        return
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to update user')
        return
    }
}

export async function getOverview(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        const userId = req.user?._id

        if (!userId) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401)
            return
        }

        const overview = await UserService.getUserOverview(userId)

        const data = {
            success: true,
            overview
        }

        successResponse(res, data, 'User overview retrieved successfully')
        return
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to retrieve user overview')
        return
    }
}

export async function getActivity(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        const userId = req.user?._id

        if (!userId) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401)
            return
        }

        const activity = await UserService.getUserActivity(userId)

        const data = {
            success: true,
            activity
        }

        successResponse(res, data, 'User activity retrieved successfully')
        return
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to retrieve user activity')
        return
    }
}

export async function deleteMe(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        const userId = req.user?._id

        if (!userId) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401)
            return
        }

        const deletedUser = await User.findByIdAndDelete(userId)

        if (!deletedUser) {
            errorResponse(res, 'User not found')
            return
        }

        const data = {
            success: true,
            message: 'User deleted successfully'
        }

        successResponse(res, data, 'User deleted successfully')
        return
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to delete user')
        return
    }
}
