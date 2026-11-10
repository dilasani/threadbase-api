
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import path from "node:path";
import { authenticateRequest } from "./auth.js";
import { upload } from "./file-upload.js";

const app = express();

app.use(express.json());

// Health check.
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Threadbase API is running",
  });
});

// Protected file upload endpoint.
app.post(
  "/api/upload",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      authenticateRequest(req.headers.authorization);
      next();
    } catch (error) {
      res.status(401).json({
        error:
          error instanceof Error
            ? error.message
            : "Unauthorized",
      });
    }
  },
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error) {
        next(error);
        return;
      }

      if (!req.file) {
        res.status(400).json({
          error: "Please select a file to upload",
        });
        return;
      }

      res.status(201).json({
        message: "File uploaded successfully",
        file: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          path: path.posix.join(
            "uploads",
            req.file.filename
          ),
        },
      });
    });
  }
);

// Error handler.
app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (
      error instanceof Error &&
      error.message.includes("Only PNG")
    ) {
      res.status(400).json({
        error: error.message,
      });
      return;
    }

    if (error instanceof Error && error.message.includes("File too large")) {
      res.status(413).json({
        error: "File size must not exceed 5 MB",
      });
      return;
    }

    res.status(500).json({
      error: "File upload failed",
    });
  }
);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Threadbase API running on port ${PORT}`);
});
