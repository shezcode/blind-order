import path from "path";
import fs from "fs";

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    type: "mariadb" | "sqlite";
  };
  cors: {
    origin: string[];
  };
  logging: {
    level: string;
  };
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    const env = process.env.NODE_ENV || "development";

    const defaultConfig: AppConfig = {
      port: 3001,
      nodeEnv: env,
      database: {
        host: "localhost",
        port: 3306,
        username: "blindorder",
        password: "password",
        database: "blindorder_db",
        type: "mariadb",
      },
      cors: {
        origin: ["http://localhost:5173", "http://localhost:3000"],
      },
      logging: {
        level: "info",
      },
    };

    try {
      const configPath = path.join(process.cwd(), "config", `${env}.json`);

      if (fs.existsSync(configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        this.config = this.mergeConfig(defaultConfig, fileConfig);
      } else {
        this.config = defaultConfig;
      }

      this.config = this.overrideWithEnvVars(this.config);
    } catch (error) {
      console.error("Error loading config: ", error);
      return defaultConfig;
    }
  }

  private mergeConfig(defaultConfig: AppConfig, fileConfig: any): AppConfig {
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

  private overrideWithEnvVars(config: AppConfig): AppConfig {
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

  public get(): AppConfig {
    return this.config;
  }

  public getDatabase() {
    return this.config.database;
  }

  public getPort(): number {
    return this.config.port;
  }

  public getCorsOrigins(): string[] {
    return this.config.cors.origin;
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === "production";
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === "development";
  }

  public isTest(): boolean {
    return this.config.nodeEnv === "test";
  }
}

export const config = new ConfigManager();
