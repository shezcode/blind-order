import winston from "winston";
import { config } from "../../config/index";

const createLogger = () => {
  const logLevel = config.get().logging.level;
  const nodeEnv = config.get().nodeEnv;

  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: "blindorder-backend" },
    transports: [
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
      new winston.transports.File({ filename: "logs/combined.log" }),
    ],
  });

  return logger;
};

export const logger = createLogger();
