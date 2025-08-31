"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }
    loadConfig() {
        const env = process.env.NODE_ENV || "development";
        // Default configuration
        const defaultConfig = {
            port: 3001,
            nodeEnv: env,
            database: {
                host: "localhost",
                port: 3306,
                username: "blindorder",
                password: "password",
                database: "blindorder_db",
                type: "mariadb", // Use MariaDB for all environments
            },
            cors: {
                origin: ["http://localhost:5173", "http://localhost:3000"],
            },
            logging: {
                level: "info",
            },
        };
        try {
            // Load environment-specific config file
            const configPath = path_1.default.join(process.cwd(), "config", `${env}.json`);
            if (fs_1.default.existsSync(configPath)) {
                const fileConfig = JSON.parse(fs_1.default.readFileSync(configPath, "utf8"));
                const mergedConfig = this.mergeConfig(defaultConfig, fileConfig);
                return this.overrideWithEnvVars(mergedConfig);
            }
            else {
                return this.overrideWithEnvVars(defaultConfig);
            }
        }
        catch (error) {
            console.error("Error loading configuration:", error);
            return this.overrideWithEnvVars(defaultConfig);
        }
    }
    mergeConfig(defaultConfig, fileConfig) {
        return {
            ...defaultConfig,
            ...fileConfig,
            database: {
                ...defaultConfig.database,
                ...fileConfig.database,
            },
            cors: {
                ...defaultConfig.cors,
                ...fileConfig.cors,
            },
            logging: {
                ...defaultConfig.logging,
                ...fileConfig.logging,
            },
        };
    }
    overrideWithEnvVars(config) {
        return {
            ...config,
            port: parseInt(process.env.PORT || "") || config.port,
            nodeEnv: process.env.NODE_ENV || config.nodeEnv,
            database: {
                ...config.database,
                host: process.env.DB_HOST || config.database.host,
                port: parseInt(process.env.DB_PORT || "") || config.database.port,
                username: process.env.DB_USERNAME || config.database.username,
                password: process.env.DB_PASSWORD || config.database.password,
                database: process.env.DB_NAME || config.database.database,
            },
        };
    }
    get() {
        return this.config;
    }
    getDatabase() {
        return this.config.database;
    }
    getPort() {
        return this.config.port;
    }
    getCorsOrigins() {
        return this.config.cors.origin;
    }
    isProduction() {
        return this.config.nodeEnv === "production";
    }
    isDevelopment() {
        return this.config.nodeEnv === "development";
    }
    isTest() {
        return this.config.nodeEnv === "test";
    }
}
// Export singleton instance
exports.config = new ConfigManager();
