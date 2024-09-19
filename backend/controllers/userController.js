import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { generateToken } from "../utils/jwtToken.js";

// Register a new user
export const register = catchAsyncErrors(async (req, res, next) => {
  // Check if files are uploaded
  // if (!req.files || Object.keys(req.files).length === 0) {
  //   return next(new ErrorHandler("Profile Image Required.", 400));
  // }

  // const { profileImage } = req.files;

  // // Validate file format
  // const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  // if (!allowedFormats.includes(profileImage.mimetype)) {
  //   return next(new ErrorHandler("File format not supported.", 400));
  // }

  const {
    userName,
    email,
    password,
    phone,
    address,
    role,
    bankAccountNumber,
    bankAccountName,
    bankName,
    paypalEmail,
    IFSC, // Ensure IFSC is included in the body if used
  } = req.body;

  // Check if all required fields are provided
  if (!userName || !email || !phone || !password || !address || !role) {
    return next(new ErrorHandler("Please fill full form.", 400));
  }

  // Specific validations for Auctioneer role
  if (role === "Auctioneer") {
    if (!bankAccountName || !bankAccountNumber || !bankName) {
      return next(new ErrorHandler("Please provide your full bank details.", 400));
    }

    if (!paypalEmail) {
      return next(new ErrorHandler("Please provide your PayPal email.", 400));
    }

    if (!IFSC) {
      return next(new ErrorHandler("Please provide your valid IFSC Code.", 400));
    }
  }

  // Check if the user is already registered
  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(new ErrorHandler("User already registered.", 400));
  }

  // Upload profile image to Cloudinary
  const cloudinaryResponse = await cloudinary.uploader.upload(profileImage.tempFilePath, {
    folder: "MERN_AUCTION_PLATFORM_USERS",
  });

  // Handle Cloudinary upload errors
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error("Cloudinary error:", cloudinaryResponse.error || "Unknown Cloudinary error.");
    return next(new ErrorHandler("Failed to upload profile image to Cloudinary.", 500));
  }

  // Create a new user in the database
  const user = await User.create({
    userName,
    email,
    password,
    phone,
    address,
    role,
    // profileImage: {
    //   public_id: cloudinaryResponse.public_id,
    //   url: cloudinaryResponse.secure_url,
    // },
    paymentMethods: {
      bankTransfer: {
        bankAccountNumber,
        bankAccountName,
        bankName,
      },
      IFSC: {
        IFSCCodeNumber, // Ensure this variable is correctly used and defined
      },
      paypal: {
        paypalEmail,
      },
    },
  });

  // Generate JWT token and send response
  generateToken(user, "User Registered.", 201, res);
});

// Login a user
export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return next(new ErrorHandler("Please fill full form.", 400));
  }

  // Find the user by email
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid credentials.", 400));
  }

  // Verify password
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid credentials.", 400));
  }

  // Generate JWT token and send response
  generateToken(user, "Login successfully.", 200, res);
});

// Get user profile
export const getProfile = catchAsyncErrors(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

// Logout user
export const logout = catchAsyncErrors(async (req, res, next) => {
  res.status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logout Successfully.",
    });
});

// Fetch leaderboard
export const fetchLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find({ moneySpent: { $gt: 0 } });
  const leaderboard = users.sort((a, b) => b.moneySpent - a.moneySpent);
  res.status(200).json({
    success: true,
    leaderboard,
  });
});
