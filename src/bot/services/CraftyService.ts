import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { inject, injectable } from "inversify";
import { ConfigService } from "@/config/config.service";
import { TYPES } from "@/types";

export type GetRequest<TBody> = {
  status: string;
  data: TBody;
};

export type GetRequestEmpty = {
  status: string;
};

export type Server = {
  server_id: number;
  created: string;
  server_uuid: string;
  server_name: string;
  path: string;
  backup_path: string;
  executable: string;
  log_path: string;
  execution_command: string;
  auto_start: boolean;
  auto_start_delay: number;
  crash_detection: false;
  stop_command: string;
  executable_update_url: string;
  server_ip: string;
  server_port: number;
  logs_delete_after: 0;
  type: string;
};

export type ServerStat = {
  stats_id: number;
  created: string;
  server_id: Server;
  started: string;
  running: boolean;
  cpu: number;
  mem: string;
  mem_percent: string;
  world_name: string;
  world_size: string;
  server_port: number;
  int_ping_results: string;
  online: number;
  max: number;
  players: string;
  desc: string;
  version: string;
  updating: boolean;
  waiting_start: boolean;
  first_run: boolean;
  crashed: boolean;
  downloading: boolean;
};

@injectable()
class CraftyService {
  private api: AxiosInstance;

  constructor(@inject(TYPES.ConfigService) private config: ConfigService) {
    const baseUrl = this.config.get("CRAFTY_BASE_URL");
    const apiKey = this.config.get("CRAFTY_API_KEY");
    // Initialize axios instance
    this.api = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  async startServer(serverId: string): Promise<boolean> {
    const response = await this.makePostRequest<GetRequestEmpty>(
      `/servers/${serverId}/action/start_server`,
    );
    return response.status === "ok";
  }

  async stopServer(serverId: string): Promise<boolean> {
    const response = await this.makePostRequest<GetRequestEmpty>(
      `/servers/${serverId}/action/stop_server`,
    );

    return response.status === "ok";
  }

  async getServerStats(serverId: string): Promise<ServerStat> {
    const response = await this.makeGetRequest<GetRequest<ServerStat>>(
      `/servers/${serverId}/stats`,
    );

    return response.data;
  }

  async getServerList(): Promise<Server[]> {
    const response =
      await this.makeGetRequest<GetRequest<Server[]>>(`/servers`);

    return response.data;
  }

  async getJsonSchemas(): Promise<any> {
    return this.makeGetRequest(`/jsonschema`);
  }

  async getJsonSchema(schema: string): Promise<any> {
    return this.makeGetRequest(`/jsonschema/${schema}`);
  }

  /**
   * Universal GET request
   * @param endpoint - API endpoint, e.g. /servers
   * @param params - GET query parameters
   */
  private async makeGetRequest<TResponse>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<TResponse> {
    try {
      const response: AxiosResponse<TResponse> = await this.api.get(endpoint, {
        params,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleError(error);
      }
      throw error;
    }
  }

  /**
   * Universal POST request
   * @param endpoint - API endpoint, e.g. /servers
   * @param data - request body
   */
  private async makePostRequest<TResponse, TRequest = void>(
    endpoint: string,
    data?: TRequest,
  ): Promise<TResponse> {
    try {
      const response: AxiosResponse<TResponse> = await this.api.post(
        endpoint,
        data,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleError(error);
      }
      throw error;
    }
  }

  private handleError(error: AxiosError): void {
    if (error.response) {
      // Server error (4xx, 5xx)
      console.error("API Error:", error.response.status, error.response.data);
    } else if (error.request) {
      // Network error (request was made, but no response received)
      console.error("Network Error:", error.request);
    } else {
      // Request wasn't properly formed
      console.error("Request Error:", error.message);
    }
    throw error;
  }
}

export default CraftyService;
