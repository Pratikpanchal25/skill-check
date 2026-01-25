import dotenv from "dotenv";
import express from "express";
import connectDB from "./database/db";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import sessionRoutes from "./routes/session.routes";
import skillRoutes from "./routes/skill.routes";
import analyticsRoutes from "./routes/analytics.routes";

dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(
  cors({
    origin: "*",
  }),
);
app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/", (req, res) => {
  res.send("Skillcheck API is running");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
