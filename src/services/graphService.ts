import { PublicClientApplication, AccountInfo } from "@azure/msal-browser";
import { invoke } from "@tauri-apps/api/tauri";
import { msalConfig, loginRequest } from "../config/authConfig";

interface CommandResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class GraphService {
  private msalInstance: PublicClientApplication;
  private currentToken: string | null = null;

  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig);
  }

  async initialize() {
    await this.msalInstance.initialize();
  }

  async login(): Promise<AccountInfo | null> {
    try {
      const loginResponse = await this.msalInstance.loginPopup(loginRequest);
      this.currentToken = loginResponse.accessToken;
      await invoke<CommandResponse>("store_token_secure", { token: this.currentToken });
      return loginResponse.account;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async logout() {
    const account = this.msalInstance.getAllAccounts()[0];
    if (account) {
      await this.msalInstance.logoutPopup({ account });
    }
    await invoke<CommandResponse>("delete_token_secure");
    this.currentToken = null;
  }

  getAccount(): AccountInfo | null {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  async getAccessToken(): Promise<string> {
    if (this.currentToken) return this.currentToken;

    const account = this.getAccount();
    if (!account) throw new Error("No account found");

    try {
      const response = await this.msalInstance.acquireTokenSilent({ ...loginRequest, account });
      this.currentToken = response.accessToken;
      await invoke<CommandResponse>("store_token_secure", { token: this.currentToken });
      return response.accessToken;
    } catch (error) {
      const response = await this.msalInstance.acquireTokenPopup(loginRequest);
      this.currentToken = response.accessToken;
      await invoke<CommandResponse>("store_token_secure", { token: this.currentToken });
      return response.accessToken;
    }
  }

  async getDriveItems(itemId?: string) {
    const token = await this.getAccessToken();
    const response = await invoke<CommandResponse>("fetch_drive_items", { token, itemId: itemId || null });
    if (!response.success) throw new Error(response.error || "Failed to fetch drive items");
    return response.data;
  }

  async searchFiles(query: string) {
    const token = await this.getAccessToken();
    const response = await invoke<CommandResponse>("search_files", { token, query });
    if (!response.success) throw new Error(response.error || "Failed to search files");
    return response.data;
  }

  async analyzeFile(itemId: string, fileName: string, fileSize: number, mimeType?: string) {
    const token = await this.getAccessToken();
    const response = await invoke<CommandResponse>("analyze_file", {
      token, itemId, fileName, fileSize, mimeType: mimeType || null
    });
    if (!response.success) throw new Error(response.error || "Failed to analyze file");
    return response.data;
  }
}

export const graphService = new GraphService();
