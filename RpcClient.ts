import { request } from "http";

type RpcConfig = {
  host: string;
  port: number;
  rpcuser: string;
  rpcpass: string;
};

class RpcClient {
  private readonly auth: string;
  private readonly options = {};

  constructor(config: RpcConfig) {
    this.auth = Buffer.from(`${config.rpcuser}:${config.rpcpass}`).toString(
      "base64"
    );

    this.options = {
      host: config.host,
      port: config.port,
      path: "/",
      method: "POST",
    };
  }

  public request = <T>(method: string, params?: any[]): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const serializedRequest = JSON.stringify({
        method,
        params,
      });

      const req = request(this.options, (response) => {
        let buffer = "";

        response.on("data", (chunk) => {
          buffer += chunk.toString();
        });

        response.on("end", () => {
          if (response.statusCode === 401) {
            reject("401 unauthorized");
          }

          if (response.statusCode === 403) {
            reject("403 forbidden");
          }

          const parsedResponse = JSON.parse(buffer);

          if (parsedResponse.error) {
            reject(parsedResponse.error);
          }

          resolve(parsedResponse.result);
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.setHeader("Content-Length", serializedRequest.length);
      req.setHeader("Authorization", `Basic ${this.auth}`);

      req.write(serializedRequest);
      req.end();
    });
  };
}

export default RpcClient;
